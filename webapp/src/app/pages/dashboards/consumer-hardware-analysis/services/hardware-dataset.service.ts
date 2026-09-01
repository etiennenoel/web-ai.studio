import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {isPlatformBrowser} from '@angular/common';
import {EMPTY, Observable, map, shareReplay} from 'rxjs';

import {
  CSV_COLUMNS,
  CSV_THROUGHPUT_COLUMNS,
  CSV_TINY_MAX_COLUMN,
  CSV_TINY_MIN_COLUMN,
  HARDWARE_DATASET_URL,
} from '../constants/csv-columns.constant';
import {AUDIO_MODEL_CLASSES} from '../constants/audio-model-classes.constant';
import {FOLDED_DEVICE_NAMES} from '../constants/folded-devices.constant';
import {MODEL_CLASSES} from '../constants/model-classes.constant';
import {SPEECH_DECODER_EFFICIENCY} from '../constants/speech-model.constant';
import {ModelClassEnum} from '../enums/model-class.enum';
import {SourceColumnEnum} from '../enums/source-column.enum';
import {HardwareDatasetInterface} from '../interfaces/hardware-dataset.interface';
import {HardwareDeviceInterface} from '../interfaces/hardware-device.interface';
import {ModelClassFitInterface} from '../interfaces/model-class-fit.interface';
import {ThroughputFigureInterface} from '../interfaces/throughput-figure.interface';
import {BandwidthLawCalculator} from '../util/bandwidth-law.calculator';
import {ConsumerTypeClassifier} from '../util/consumer-type.classifier';
import {CsvTableParser} from '../util/csv-table.parser';
import {DeviceSegmentClassifier} from '../util/device-segment.classifier';
import {ThroughputCellParser} from '../util/throughput-cell.parser';

/**
 * Loads the consumer hardware inference dataset and derives everything the dashboard
 * reads: one machine per row, and the bandwidth law fitted per source column. Nothing
 * here is hard-coded from a previous run — swap the CSV and every number moves.
 */
@Injectable({
  providedIn: 'root'
})
export class HardwareDatasetService {

  private dataset$?: Observable<HardwareDatasetInterface>;

  constructor(private readonly http: HttpClient,
              @Inject(PLATFORM_ID) private readonly platformId: Object) {
  }

  /** The parsed and fitted dataset, loaded once per session. */
  load(): Observable<HardwareDatasetInterface> {
    // The CSV is a same-origin asset, so there is nothing to fetch while prerendering.
    if (!isPlatformBrowser(this.platformId)) {
      return EMPTY;
    }

    this.dataset$ ??= this.http.get(HARDWARE_DATASET_URL, {responseType: 'text'}).pipe(
      map(csv => this.build(csv)),
      shareReplay({bufferSize: 1, refCount: false}),
    );

    return this.dataset$;
  }

  private build(csv: string): HardwareDatasetInterface {
    const parsed = this.parseDevices(csv);

    // One row per memory bus: a Mac Studio is an M3 Ultra in a different case, and
    // fitting both would count the same measurement twice.
    const foldedDevices = parsed
      .filter(device => FOLDED_DEVICE_NAMES[device.name])
      .map(device => ({name: device.name, into: FOLDED_DEVICE_NAMES[device.name]}));
    const devices = parsed.filter(device => !FOLDED_DEVICE_NAMES[device.name]);

    const fits = this.fitModelClasses(devices);

    const years = [...new Set(devices.map(device => device.year).filter((year): year is number => year !== null))]
      .sort((left, right) => left - right);

    // Counted per source column, not per displayed size: the three Nano columns come
    // from one set of figures and must not be counted three times.
    const measuredColumns = MODEL_CLASSES.filter(modelClass => modelClass.multiplier === 1);
    const figureCountSubBillion = measuredColumns
      .filter(modelClass => !modelClass.followsBandwidthLaw)
      .reduce((total, modelClass) => total + fits[modelClass.key].sampleCount, 0);
    const figureCountAtOneBillionPlus = measuredColumns
      .filter(modelClass => modelClass.followsBandwidthLaw)
      .reduce((total, modelClass) => total + fits[modelClass.key].sampleCount, 0);

    return {devices, fits, years, figureCountAtOneBillionPlus, figureCountSubBillion, foldedDevices};
  }

  private parseDevices(csv: string): HardwareDeviceInterface[] {
    const rows = CsvTableParser.parse(csv);
    const header = rows[0] ?? [];
    const columnIndex = (name: string) => header.findIndex(candidate => candidate.trim() === name);

    const indexes = {
      manufacturer: columnIndex(CSV_COLUMNS.manufacturer),
      name: columnIndex(CSV_COLUMNS.name),
      year: columnIndex(CSV_COLUMNS.year),
      minMemory: columnIndex(CSV_COLUMNS.minMemory),
      maxMemory: columnIndex(CSV_COLUMNS.maxMemory),
      memoryType: columnIndex(CSV_COLUMNS.memoryType),
      bandwidth: columnIndex(CSV_COLUMNS.bandwidth),
      tinyMin: columnIndex(CSV_TINY_MIN_COLUMN),
      tinyMax: columnIndex(CSV_TINY_MAX_COLUMN),
    };

    return rows.slice(1).map(row => {
      const manufacturer = (row[indexes.manufacturer] ?? '').trim();
      const name = (row[indexes.name] ?? '').trim();
      const segment = DeviceSegmentClassifier.classify(manufacturer, name);

      return {
        manufacturer,
        name,
        year: ThroughputCellParser.parseNumber(row[indexes.year]),
        minMemoryGb: ThroughputCellParser.parseNumber(row[indexes.minMemory]),
        maxMemoryGb: ThroughputCellParser.parseNumber(row[indexes.maxMemory]),
        memoryType: (row[indexes.memoryType] ?? '').trim(),
        bandwidthGbps: ThroughputCellParser.parseNumber(row[indexes.bandwidth]),
        segment,
        consumerType: ConsumerTypeClassifier.classify(name, segment),
        throughput: this.parseThroughput(row, header, indexes.tinyMin, indexes.tinyMax),
      };
    }).filter(device => device.name !== '');
  }

  private parseThroughput(row: string[],
                          header: string[],
                          tinyMinIndex: number,
                          tinyMaxIndex: number): Record<SourceColumnEnum, ThroughputFigureInterface> {
    const figures = {} as Record<SourceColumnEnum, ThroughputFigureInterface>;

    // Tiny is a min/max pair: the plotted figure is its midpoint, and the pair itself
    // stays on the record so the tooltip can show the spread the source published.
    const tinyMin = ThroughputCellParser.parseNumber(row[tinyMinIndex]);
    const tinyMax = ThroughputCellParser.parseNumber(row[tinyMaxIndex]);
    figures[SourceColumnEnum.Tiny] = tinyMin !== null && tinyMax !== null
      ? {tokensPerSecond: (tinyMin + tinyMax) / 2, wontFit: false, sourceRange: [tinyMin, tinyMax]}
      : {tokensPerSecond: null, wontFit: false, sourceRange: null};

    for (const [sourceColumn, column] of Object.entries(CSV_THROUGHPUT_COLUMNS)) {
      const index = header.findIndex(candidate => candidate.trim() === column);
      figures[sourceColumn as SourceColumnEnum] = ThroughputCellParser.parse(index < 0 ? '' : row[index]);
    }

    return figures;
  }

  /**
   * Fits `tokens/second = slope × bandwidth` once per *source column*, then scales that
   * one fit out to the sizes that share the column. The 1–4B bucket moves 4.17 GB per
   * token — a ~4B model at Q4 — so 1B and 2B are the same law with a quarter and half
   * the weights, and inherit the column's sample count and R² rather than pretending to
   * fits of their own.
   */
  private fitModelClasses(devices: HardwareDeviceInterface[]): Record<ModelClassEnum, ModelClassFitInterface> {
    const columnFits = new Map<SourceColumnEnum, {slope: number, rSquared: number, sampleCount: number}>();

    for (const sourceColumn of new Set(MODEL_CLASSES.map(modelClass => modelClass.sourceColumn!))) {
      const points = devices
        .filter(device => device.bandwidthGbps !== null && device.throughput[sourceColumn].tokensPerSecond !== null)
        .map(device => ({x: device.bandwidthGbps as number, y: device.throughput[sourceColumn].tokensPerSecond as number}));

      const slope = BandwidthLawCalculator.fitSlopeThroughOrigin(points);
      columnFits.set(sourceColumn, {
        slope,
        rSquared: BandwidthLawCalculator.rSquared(points, slope),
        sampleCount: points.length,
      });
    }

    const fits = {} as Record<ModelClassEnum, ModelClassFitInterface>;

    for (const modelClass of MODEL_CLASSES) {
      const columnFit = columnFits.get(modelClass.sourceColumn!)!;
      const tokensPerGbps = columnFit.slope * modelClass.multiplier;
      const gbPerToken = tokensPerGbps > 0 ? 1 / tokensPerGbps : 0;

      fits[modelClass.key] = {
        modelClass: modelClass.key,
        sourceColumn: modelClass.sourceColumn,
        derived: modelClass.multiplier !== 1,
        sampleCount: columnFit.sampleCount,
        tokensPerGbps,
        rSquared: columnFit.rSquared,
        gbPerToken,
        bandwidthEfficiency: gbPerToken > 0 ? modelClass.quantisedWeightsGb / gbPerToken : 0,
      };
    }

    // No source measures a speech model, so there is no fit to make: the decode half is
    // stated to convert the same share of realised bandwidth the text sizes settle at,
    // divided by the weights it has to stream. Nothing here is evidence, and the sample
    // count of zero is what says so.
    for (const modelClass of AUDIO_MODEL_CLASSES) {
      const tokensPerGbps = SPEECH_DECODER_EFFICIENCY / modelClass.quantisedWeightsGb;

      fits[modelClass.key] = {
        modelClass: modelClass.key,
        derived: true,
        sampleCount: 0,
        tokensPerGbps,
        rSquared: null,
        gbPerToken: 1 / tokensPerGbps,
        bandwidthEfficiency: SPEECH_DECODER_EFFICIENCY,
      };
    }

    return fits;
  }

  private average(values: number[]): number {
    if (!values.length) {
      return 0;
    }
    return values.reduce((total, value) => total + value, 0) / values.length;
  }
}
