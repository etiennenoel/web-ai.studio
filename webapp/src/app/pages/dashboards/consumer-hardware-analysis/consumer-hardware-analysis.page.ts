import {Component, DOCUMENT, Inject, OnInit} from '@angular/core';
import {Title} from '@angular/platform-browser';

import {BasePage} from '../../base-page';
import {
  CONSUMER_TYPE_BLURBS,
  CONSUMER_TYPE_LABELS,
  CONSUMER_TYPE_ORDER,
} from './constants/consumer-types.constant';
import {
  HARDWARE_SEGMENT_BLURBS,
  HARDWARE_SEGMENT_LABELS,
  HARDWARE_SEGMENT_ORDER,
} from './constants/hardware-segments.constant';
import {
  MODEL_CLASSES,
  MODEL_CLASS_BY_KEY,
  PROJECTED_MODEL_CLASSES,
  isDerivedModelClass,
} from './constants/model-classes.constant';
import {
  BAND_SLIDER_MAX,
  DEFAULT_REFERENCE_BAND_INDEX,
} from './constants/speed-bands.constant';
import {
  CONTEXT_STEPS,
  REALISED_BANDWIDTH_RANGE,
  TOKEN_OVERHEAD_RANGE,
} from './constants/throughput-model.constant';
import {
  HARDWARE_SEGMENT_LABELS as SEGMENT_LABELS,
} from './constants/hardware-segments.constant';
import {BandConflictKindEnum} from './enums/band-conflict-kind.enum';
import {ConsumerHardwareTabEnum} from './enums/consumer-hardware-tab.enum';
import {ConsumerTypeEnum} from './enums/consumer-type.enum';
import {HardwareSegmentEnum} from './enums/hardware-segment.enum';
import {MatrixGroupingEnum} from './enums/matrix-grouping.enum';
import {ModelClassEnum} from './enums/model-class.enum';
import {ThroughputSourceEnum} from './enums/throughput-source.enum';
import {BandConflictInterface} from './interfaces/band-conflict.interface';
import {HardwareDatasetInterface} from './interfaces/hardware-dataset.interface';
import {HardwareDeviceInterface} from './interfaces/hardware-device.interface';
import {LogTrendInterface} from './interfaces/log-trend.interface';
import {ModelClassInterface} from './interfaces/model-class.interface';
import {SpeedBandInterface} from './interfaces/speed-band.interface';
import {HardwareDatasetService} from './services/hardware-dataset.service';
import {BandwidthLawCalculator} from './util/bandwidth-law.calculator';
import {LogTrendCalculator} from './util/log-trend.calculator';
import {ThroughputModel} from './util/throughput-model';
import {SpeedBandScale} from './util/speed-band.scale';
import {AxisTickViewModel} from './view-models/axis-tick.view-model';
import {BandSliderViewModel} from './view-models/band-slider.view-model';
import {CategoryChipViewModel} from './view-models/category-chip.view-model';
import {EfficiencyItemViewModel} from './view-models/efficiency-item.view-model';
import {ExplorerCellViewModel} from './view-models/explorer-cell.view-model';
import {ExplorerColumnViewModel} from './view-models/explorer-column.view-model';
import {ExplorerRowViewModel} from './view-models/explorer-row.view-model';
import {HeroCellViewModel} from './view-models/hero-cell.view-model';
import {HeroRowViewModel} from './view-models/hero-row.view-model';
import {HorizonBandViewModel} from './view-models/horizon-band.view-model';
import {HorizonChartViewModel} from './view-models/horizon-chart.view-model';
import {HorizonPointViewModel} from './view-models/horizon-point.view-model';
import {HorizonSeriesViewModel} from './view-models/horizon-series.view-model';
import {HoverCardViewModel} from './view-models/hover-card.view-model';
import {MatrixCellViewModel} from './view-models/matrix-cell.view-model';
import {MatrixGroupViewModel} from './view-models/matrix-group.view-model';
import {MatrixRowViewModel} from './view-models/matrix-row.view-model';
import {YearTickViewModel} from './view-models/year-tick.view-model';

/** A value that is measured, modelled, out of memory, or simply absent. */
type Throughput = number | 'wont-fit' | null;

/** Slider positions run on a square-root scale, so the low end is not cramped. */
const SLIDER_POSITIONS = 1000;

/** Geometry of the Horizon chart. The right margin holds the category labels. */
const HORIZON = {width: 940, labelWidth: 52, rightMargin: 176, topMargin: 30, bottomMargin: 34, height: 430};

/** How far ahead the projection can be asked to run, in years past the last real one. */
const HORIZON_HORIZONS = [3, 5];

/** Line-stacking order, fastest category first — also the colour-slot order. */
const HORIZON_CATEGORY_ORDER: ConsumerTypeEnum[] = [
  ConsumerTypeEnum.FlagshipGraphicsCard,
  ConsumerTypeEnum.MidRangeGraphicsCard,
  ConsumerTypeEnum.ProLaptop,
  ConsumerTypeEnum.AppleDesktop,
  ConsumerTypeEnum.MiniAiDesktop,
  ConsumerTypeEnum.MainstreamLaptop,
  ConsumerTypeEnum.DesktopCpu,
  ConsumerTypeEnum.BoardOrPhone,
];

/** The four a reader is most likely to be choosing between. */
const HORIZON_DEFAULT_CATEGORIES: ConsumerTypeEnum[] = [
  ConsumerTypeEnum.MainstreamLaptop,
  ConsumerTypeEnum.ProLaptop,
  ConsumerTypeEnum.MidRangeGraphicsCard,
  ConsumerTypeEnum.FlagshipGraphicsCard,
];

@Component({
  selector: 'app-consumer-hardware-analysis',
  templateUrl: './consumer-hardware-analysis.page.html',
  styleUrl: './consumer-hardware-analysis.page.scss',
  standalone: false,
  // The layout hands each page a fixed-height, overflow-hidden slot: without a
  // full-height block host, the page's own scroll container has nothing to size
  // against and the content is simply clipped.
  host: {class: 'block h-full'},
})
export class ConsumerHardwareAnalysisPage extends BasePage implements OnInit {

  readonly tabEnum = ConsumerHardwareTabEnum;
  readonly sourceEnum = ThroughputSourceEnum;
  readonly groupingEnum = MatrixGroupingEnum;
  readonly modelClasses = MODEL_CLASSES;
  readonly horizonHorizons = HORIZON_HORIZONS;
  readonly projectedClasses = PROJECTED_MODEL_CLASSES;
  readonly sliderMax = SLIDER_POSITIONS;

  dataset?: HardwareDatasetInterface;
  loadFailed = false;

  activeTab = ConsumerHardwareTabEnum.Horizon;

  /** The five speed bands and the four edges the reader can drag. */
  readonly scale = new SpeedBandScale();

  /** Context length, realised bandwidth and per-token overhead — all reader-tunable. */
  readonly model = new ThroughputModel();

  readonly contextSteps = CONTEXT_STEPS;
  readonly realisedRange = REALISED_BANDWIDTH_RANGE;
  readonly overheadRange = TOKEN_OVERHEAD_RANGE;
  readonly segments = HARDWARE_SEGMENT_ORDER;
  readonly segmentLabels = SEGMENT_LABELS;

  advancedOpen = false;

  /**
   * The band the Horizon readout counts as "fast enough". Pinned rather than picked: the
   * bands themselves are already the reader's to move in Advanced settings.
   */
  readonly referenceBandIndex = DEFAULT_REFERENCE_BAND_INDEX;

  /** Fill gaps with `bandwidth × fitted slope` where the source has no figure. */
  showModelledValues = true;

  /** Hero: the year the reader is asking about. */
  year = 0;

  matrixGrouping = MatrixGroupingEnum.Type;
  matrixFilter: string = 'all';
  matrixSearch = '';
  explorerSearch = '';

  sortColumn = 'bandwidth';
  sortDirection: 1 | -1 = -1;

  /** Horizon: which model size the lines describe, and how far the trend is drawn. */
  horizonClass = ModelClassEnum.Nano2B;
  horizonYears = HORIZON_HORIZONS[HORIZON_HORIZONS.length - 1];
  horizonCategories = new Set<ConsumerTypeEnum>(HORIZON_DEFAULT_CATEGORIES);

  hoverCard?: HoverCardViewModel;

  // hero
  heroRows: HeroRowViewModel[] = [];
  yearTicks: YearTickViewModel[] = [];
  yearHint = '';
  efficiencyItems: EfficiencyItemViewModel[] = [];

  // bands
  bandSliders: BandSliderViewModel[] = [];
  bandConflicts: BandConflictInterface[] = [];
  bandConflictNote = '';

  // matrix
  matrixGroups: MatrixGroupViewModel[] = [];
  matrixChips: {key: string, label: string, count: number}[] = [];
  matrixShownCount = 0;

  // explorer
  explorerColumns: ExplorerColumnViewModel[] = [];
  explorerRows: ExplorerRowViewModel[] = [];

  // horizon
  horizonChart?: HorizonChartViewModel;
  categoryChips: CategoryChipViewModel[] = [];
  horizonHeadline = '';
  horizonNote = '';
  horizonCaveat = '';

  /** The capacity-versus-bandwidth caveat, measured rather than asserted. */
  capacityCaveat?: {
    label: string,
    fromYear: number,
    memoryFrom: number,
    memoryTo: number,
    bandwidthFrom: number,
    bandwidthTo: number,
    bandwidthPercent: string,
  };

  /** Headline numbers for the hero, all derived from the dataset and the current model. */
  realisedRangeLabel = '';
  engineShareRangeLabel = '';
  rSquaredRangeLabel = '';
  yearRangeLabel = '';

  constructor(@Inject(DOCUMENT) document: Document,
              title: Title,
              private readonly datasetService: HardwareDatasetService) {
    super(document, title);
    this.setTitle('Consumer Hardware Analysis');
  }

  override ngOnInit() {
    super.ngOnInit();

    this.subscriptions.push(this.datasetService.load().subscribe({
      next: dataset => {
        this.dataset = dataset;
        this.year = dataset.years[dataset.years.length - 1] ?? this.currentYear;
        this.rebuildAll();
      },
      error: () => this.loadFailed = true,
    }));
  }

  // ── reader controls ─────────────────────────────────────────────────────────

  onTabChange(tab: ConsumerHardwareTabEnum) {
    this.activeTab = tab;
    this.hideHoverCard();
  }

  toggleAdvanced() {
    this.advancedOpen = !this.advancedOpen;
  }

  onYearInput(event: Event) {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (!Number.isNaN(value)) {
      this.setYear(value);
    }
  }

  setYear(year: number) {
    if (!this.dataset?.years.length) {
      return;
    }
    const first = this.dataset.years[0];
    const last = this.dataset.years[this.dataset.years.length - 1];
    this.year = Math.min(last, Math.max(first, Math.round(year)));
    this.buildHero();
  }

  get yearFloor(): number {
    return this.dataset?.years[0] ?? 0;
  }

  get yearCeiling(): number {
    return this.dataset?.years[this.dataset.years.length - 1] ?? 0;
  }

  onBandEdgeInput(index: number, edge: 'low' | 'high', event: Event) {
    const position = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const value = this.positionToValue(position);
    if (edge === 'low') {
      this.scale.setLow(index, value);
    } else {
      this.scale.setHigh(index, value);
    }
    this.onBandsChanged();
  }

  resetBands() {
    this.scale.reset();
    this.onBandsChanged();
  }

  reconcileBands() {
    this.scale.reconcile();
    this.onBandsChanged();
  }

  onContextStep(event: Event) {
    this.model.setContextStep(Number.parseInt((event.target as HTMLInputElement).value, 10));
    this.onModelChanged();
  }

  onRealisedBandwidth(segment: HardwareSegmentEnum, event: Event) {
    const percent = Number.parseFloat((event.target as HTMLInputElement).value);
    if (percent >= this.realisedRange.min && percent <= this.realisedRange.max) {
      this.model.realisedBandwidth[segment] = percent / 100;
      this.onModelChanged();
    }
  }

  onTokenOverhead(segment: HardwareSegmentEnum, event: Event) {
    const milliseconds = Number.parseFloat((event.target as HTMLInputElement).value);
    if (milliseconds >= this.overheadRange.min && milliseconds <= this.overheadRange.max) {
      this.model.overheadMsPerToken[segment] = milliseconds;
      this.onModelChanged();
    }
  }

  resetModel() {
    this.model.reset();
    this.onModelChanged();
  }

  /** Every view reads the adjusted figures, so all of them rebuild. */
  private onModelChanged() {
    this.buildHeadlines();
    this.buildHero();
    this.buildMatrix();
    this.buildExplorer();
    this.buildHorizonChart();
  }

  onModelledToggle(event: Event) {
    this.showModelledValues = (event.target as HTMLInputElement).checked;
    this.buildHero();
    this.buildMatrix();
    this.buildExplorer();
    this.buildHorizonChart();
  }

  onHorizonClass(modelClass: ModelClassEnum) {
    this.horizonClass = modelClass;
    this.buildHorizonChart();
  }

  onHorizonYears(years: number) {
    this.horizonYears = years;
    this.buildHorizonChart();
  }

  toggleCategory(type: ConsumerTypeEnum) {
    if (this.horizonCategories.has(type)) {
      this.horizonCategories.delete(type);
    } else {
      this.horizonCategories.add(type);
    }
    this.buildHorizonChart();
  }

  showAllCategories() {
    this.horizonCategories = new Set(HORIZON_CATEGORY_ORDER);
    this.buildHorizonChart();
  }

  clearCategories() {
    this.horizonCategories = new Set();
    this.buildHorizonChart();
  }

  resetCategories() {
    this.horizonCategories = new Set(HORIZON_DEFAULT_CATEGORIES);
    this.buildHorizonChart();
  }

  onGroupingChange(grouping: MatrixGroupingEnum) {
    this.matrixGrouping = grouping;
    this.matrixFilter = 'all';
    this.buildMatrix();
  }

  onMatrixFilter(key: string) {
    this.matrixFilter = key;
    this.buildMatrix();
  }

  onMatrixSearch(event: Event) {
    this.matrixSearch = (event.target as HTMLInputElement).value;
    this.buildMatrix();
  }

  onExplorerSearch(event: Event) {
    this.explorerSearch = (event.target as HTMLInputElement).value;
    this.buildExplorer();
  }

  sortBy(column: ExplorerColumnViewModel) {
    if (this.sortColumn === column.key) {
      this.sortDirection = this.sortDirection === 1 ? -1 : 1;
    } else {
      this.sortColumn = column.key;
      this.sortDirection = column.numeric ? -1 : 1;
    }
    this.buildExplorer();
  }

  sortDirectionFor(column: ExplorerColumnViewModel): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn !== column.key) {
      return 'none';
    }
    return this.sortDirection === 1 ? 'ascending' : 'descending';
  }

  private onBandsChanged() {
    this.buildBandSliders();
    this.buildHero();
    this.buildMatrix();
    this.buildExplorer();
    this.buildHorizonChart();
  }

  // ── hover card ──────────────────────────────────────────────────────────────

  showHoverCard(event: Event, title: string, lines: string[]) {
    const estimatedWidth = 268;
    const estimatedHeight = 30 + lines.length * 17;

    let clientX: number;
    let clientY: number;

    if ('clientX' in event && (event as MouseEvent).clientX !== 0) {
      clientX = (event as MouseEvent).clientX + 14;
      clientY = (event as MouseEvent).clientY + 16;
    } else {
      // Keyboard focus has no pointer position: anchor the card under the element.
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      clientX = rect.left;
      clientY = rect.bottom + 8;
    }

    const viewportWidth = this.window?.innerWidth ?? 1280;
    const viewportHeight = this.window?.innerHeight ?? 800;

    if (clientX + estimatedWidth > viewportWidth - 8) {
      clientX = Math.max(8, viewportWidth - estimatedWidth - 8);
    }
    if (clientY + estimatedHeight > viewportHeight - 8) {
      clientY = Math.max(8, clientY - estimatedHeight - 30);
    }

    this.hoverCard = {x: clientX, y: clientY, title, lines};
  }

  hideHoverCard() {
    this.hoverCard = undefined;
  }

  // ── formatting & shared maths ───────────────────────────────────────────────

  formatRate(value: number): string {
    return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
  }

  formatNumber(value: number): string {
    return Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '∞';
  }

  formatPercent(value: number, digits = 1): string {
    return `${(value * 100).toFixed(digits)}%`;
  }

  get bands(): SpeedBandInterface[] {
    return this.scale.bands;
  }

  get bandsFastestFirst(): SpeedBandInterface[] {
    return this.scale.bandsFastestFirst;
  }

  get referenceBand(): SpeedBandInterface {
    return this.scale.bandAt(this.referenceBandIndex);
  }

  get advancedSummary(): string {
    return `bands ${this.scale.edgeSummary} · ${this.model.contextLabel} context`;
  }

  /** Footnote for the value legends: what every figure in the view is charged for. */
  get chargedNote(): string {
    return `Q4 weights · ${this.model.contextLabel} context${this.model.isTuned ? ' · losses tuned' : ''}`;
  }

  /** How much of its no-context speed each size keeps at the current context. */
  get contextCostHint(): string {
    if (this.model.contextTokens === 0) {
      return 'no KV cache charged — the figures as the source reports them';
    }
    const at = (key: ModelClassEnum) => this.model.contextCostPercent(MODEL_CLASS_BY_KEY[key]);
    return `costs ${at(ModelClassEnum.Nano1B)}% at 1B, ${at(ModelClassEnum.Light)}% at 8B, `
      + `${at(ModelClassEnum.Xl)}% at 70B`;
  }

  get contextValueLabel(): string {
    return this.model.contextTokens === 0 ? 'as published' : `${this.model.contextTokens / 1024}K tokens`;
  }

  private get currentYear(): number {
    return new Date().getFullYear();
  }

  private positionToValue(position: number): number {
    return Math.round(Math.pow(position / SLIDER_POSITIONS, 2) * BAND_SLIDER_MAX * 2) / 2;
  }

  private valueToPosition(value: number): number {
    return Math.round(Math.sqrt(Math.min(value, BAND_SLIDER_MAX) / BAND_SLIDER_MAX) * SLIDER_POSITIONS);
  }

  /**
   * What a machine manages on a model size: the measured figure where the source has one,
   * a sibling size scaled from the same column, else one modelled from bandwidth.
   * Sub-billion models are never modelled — they leave most of the bus idle, so the
   * bandwidth law does not describe them.
   */
  private throughputFor(device: HardwareDeviceInterface,
                        modelClass: ModelClassInterface,
                        allowModelled = this.showModelledValues): Throughput {
    const figure = device.throughput[modelClass.sourceColumn];
    // The requirement moves with the context the reader chose, so a machine that held a
    // model at no context can fall out of range at 32K.
    const fitsInMemory = device.maxMemoryGb === null
      || device.maxMemoryGb >= this.model.memoryNeededGb(modelClass);

    if (figure.tokensPerSecond !== null) {
      // Half the weights, twice the tokens, for a size scaled off the shared bucket.
      const raw = figure.tokensPerSecond * modelClass.multiplier;
      return fitsInMemory ? this.adjusted(raw, modelClass, device) : 'wont-fit';
    }

    if (figure.wontFit && (modelClass.multiplier === 1 || !fitsInMemory)) {
      return 'wont-fit';
    }

    if (!allowModelled || !modelClass.followsBandwidthLaw || device.bandwidthGbps === null) {
      return null;
    }
    if (!fitsInMemory) {
      return 'wont-fit';
    }
    return this.adjusted(device.bandwidthGbps * this.dataset!.fits[modelClass.key].tokensPerGbps, modelClass, device);
  }

  /** Charges a raw figure for realised bandwidth, KV cache and per-token overhead. */
  private adjusted(tokensPerSecond: number,
                   modelClass: ModelClassInterface,
                   device: HardwareDeviceInterface): number {
    return this.model.adjust(
      tokensPerSecond,
      modelClass,
      device.segment,
      this.dataset!.fits[modelClass.key].bandwidthEfficiency,
    );
  }

  /** True only when the number comes straight from the source, at its own size. */
  private isMeasured(device: HardwareDeviceInterface, modelClass: ModelClassInterface): boolean {
    return modelClass.multiplier === 1
      && device.throughput[modelClass.sourceColumn].tokensPerSecond !== null;
  }

  /** True when the figure was read off the 1–4B bucket and scaled to this size. */
  private isScaledFromBucket(device: HardwareDeviceInterface, modelClass: ModelClassInterface): boolean {
    return modelClass.multiplier !== 1
      && device.throughput[modelClass.sourceColumn].tokensPerSecond !== null;
  }

  // ── build ───────────────────────────────────────────────────────────────────

  private rebuildAll() {
    this.buildHeadlines();
    this.buildCapacityCaveat();
    this.buildBandSliders();
    this.buildHero();
    this.buildMatrix();
    this.buildExplorer();
    this.buildHorizonChart();
  }

  private buildHeadlines() {
    if (!this.dataset) {
      return;
    }

    const lawful = PROJECTED_MODEL_CLASSES.map(modelClass => this.dataset!.fits[modelClass.key]);
    const rSquaredValues = lawful.map(fit => fit.rSquared);
    this.rSquaredRangeLabel = `${Math.min(...rSquaredValues).toFixed(2)}–${Math.max(...rSquaredValues).toFixed(2)}`;

    const years = this.dataset.years;
    this.yearRangeLabel = years.length ? `${years[0]}–${years[years.length - 1]}` : '';

    // What the machines realise of their rated peak, as the reader currently has it set.
    const realised = HARDWARE_SEGMENT_ORDER.map(segment => this.model.realisedBandwidth[segment]);
    this.realisedRangeLabel = `${Math.round(Math.min(...realised) * 100)}–${Math.round(Math.max(...realised) * 100)}%`;

    // How much of a token is actually spent streaming weights: the rest is fixed
    // overhead, which is why a small model stops scaling with bandwidth. Measured across
    // the machines in the dataset, per size, and reported smallest to largest.
    const shares = PROJECTED_MODEL_CLASSES.map(modelClass => {
      const perDevice = this.dataset!.devices
        .filter(device => device.bandwidthGbps !== null)
        .map(device => {
          const raw = device.bandwidthGbps as number * this.dataset!.fits[modelClass.key].tokensPerGbps;
          const streaming = this.model.streamMilliseconds(
            raw, modelClass, device.segment, this.dataset!.fits[modelClass.key].bandwidthEfficiency);
          return streaming / (streaming + this.model.overheadMsPerToken[device.segment]);
        })
        .sort((left, right) => left - right);
      return perDevice.length ? perDevice[Math.floor(perDevice.length / 2)] : 0;
    });
    this.engineShareRangeLabel = shares.length
      ? `${Math.round(shares[0] * 100)}–${Math.round(shares[shares.length - 1] * 100)}%`
      : '';

    this.efficiencyItems = HARDWARE_SEGMENT_ORDER.map(segment => ({
      name: SEGMENT_LABELS[segment],
      valueLabel: `${this.model.overheadMsPerToken[segment]} ms`,
      tooltipTitle: SEGMENT_LABELS[segment],
      tooltipLines: [
        `${this.model.overheadMsPerToken[segment]} ms per token before a single weight is read`,
        `and it realises ${Math.round(this.model.realisedBandwidth[segment] * 100)}% of its rated bandwidth`,
        'a 4B model streams in about 6 ms on a fast bus, so this overhead — not bandwidth — is what it runs into',
      ],
    }));
  }

  // ── 1. bands ────────────────────────────────────────────────────────────────

  private buildBandSliders() {
    this.bandConflicts = this.scale.conflicts();

    this.bandSliders = this.scale.bands.map(band => {
      const conflicted = this.bandConflicts.some(conflict =>
        conflict.index === band.index || conflict.neighbourIndex === band.index);
      const highValue = band.index === this.scale.topIndex ? BAND_SLIDER_MAX : band.high;

      return {
        index: band.index,
        name: band.name,
        rangeLabel: band.rangeLabel,
        lowPosition: this.valueToPosition(band.low),
        highPosition: this.valueToPosition(highValue),
        fillLeftPercent: this.valueToPosition(band.low) / SLIDER_POSITIONS * 100,
        fillRightPercent: 100 - this.valueToPosition(highValue) / SLIDER_POSITIONS * 100,
        lowLocked: band.index === 0,
        highLocked: band.index === this.scale.topIndex,
        conflicted,
        tooltipTitle: band.name,
        tooltipLines: [
          `${band.rangeLabel} tok/s`,
          ...(band.index === 0 ? ['starts at zero — drag the right handle'] : []),
          ...(band.index === this.scale.topIndex ? ['no upper limit — drag the left handle'] : []),
        ],
      };
    });

    this.bandConflictNote = this.bandConflicts.some(conflict => conflict.kind === BandConflictKindEnum.Overlap)
      ? 'Overlaps resolve to the faster band; gaps fall to the band beneath.'
      : 'Gaps fall to the band beneath.';
  }

  // ── 2. hero: every kind of machine, as of one year ──────────────────────────

  /**
   * The one caveat that quotes figures: how far a category's memory ran ahead of its
   * bandwidth. Read off that category's own oldest and newest machines, so the sentence
   * cannot drift from the file.
   */
  private buildCapacityCaveat() {
    const family = (this.dataset?.devices ?? [])
      .filter(device => device.consumerType === ConsumerTypeEnum.AppleDesktop
        && device.year !== null && device.bandwidthGbps !== null && device.maxMemoryGb !== null)
      .sort((left, right) => (left.year as number) - (right.year as number));

    if (family.length < 2) {
      this.capacityCaveat = undefined;
      return;
    }

    const oldest = family[0];
    const newest = family[family.length - 1];

    this.capacityCaveat = {
      label: CONSUMER_TYPE_LABELS[ConsumerTypeEnum.AppleDesktop],
      fromYear: oldest.year as number,
      memoryFrom: Math.round(oldest.maxMemoryGb as number),
      memoryTo: Math.round(newest.maxMemoryGb as number),
      bandwidthFrom: Math.round(oldest.bandwidthGbps as number),
      bandwidthTo: Math.round(newest.bandwidthGbps as number),
      bandwidthPercent: this.formatPercent(BandwidthLawCalculator.compoundAnnualGrowth(
        oldest.bandwidthGbps as number,
        newest.bandwidthGbps as number,
        (newest.year as number) - (oldest.year as number))),
    };
  }

  /** Machines grouped by kind and release year — the shape both the hero and the
   *  Horizon chart read from. */
  private annualBuckets(): {type: ConsumerTypeEnum, year: number, devices: HardwareDeviceInterface[]}[] {
    const buckets = new Map<string, {type: ConsumerTypeEnum, year: number, devices: HardwareDeviceInterface[]}>();
    for (const device of this.dataset?.devices ?? []) {
      if (device.year === null) {
        continue;                              // one board carries no year in the source
      }
      const key = `${device.consumerType}|${device.year}`;
      if (!buckets.has(key)) {
        buckets.set(key, {type: device.consumerType, year: device.year, devices: []});
      }
      buckets.get(key)!.devices.push(device);
    }
    return [...buckets.values()];
  }

  /** What a set of machines averages on one model size, and how that average was made. */
  private summariseBucket(devices: HardwareDeviceInterface[], modelClass: ModelClassInterface): {
    mean: number | null,
    values: number[],
    sources: string[],
    wontFitCount: number,
    modelledCount: number,
  } {
    const values: number[] = [];
    const sources: string[] = [];
    let wontFitCount = 0;
    let modelledCount = 0;

    for (const device of devices) {
      const value = this.throughputFor(device, modelClass);
      if (value === 'wont-fit') {
        wontFitCount++;
        continue;
      }
      if (value === null) {
        continue;
      }
      values.push(value);
      if (!this.isMeasured(device, modelClass)) {
        modelledCount++;
      }
      sources.push(`${device.name} ${this.formatRate(value)}`);
    }

    return {
      mean: values.length ? values.reduce((total, value) => total + value, 0) / values.length : null,
      values,
      sources,
      wontFitCount,
      modelledCount,
    };
  }

  private buildHero() {
    if (!this.dataset) {
      return;
    }

    const newestFirst = this.annualBuckets().sort((left, right) => right.year - left.year);
    let carriedOver = 0;
    let notYet = 0;

    this.heroRows = CONSUMER_TYPE_ORDER.map(type => {
      // the newest machines of this kind a reader could own by the chosen year
      const bucket = newestFirst.find(candidate => candidate.type === type && candidate.year <= this.year);
      const label = CONSUMER_TYPE_LABELS[type];

      if (!bucket) {
        notYet++;
        return {
          label,
          detail: 'none yet',
          present: false,
          cells: MODEL_CLASSES.map(() => ({
            rampStep: null, display: '', modelled: false, wontFit: false,
            tooltipTitle: label, tooltipLines: [`nothing of this kind in the dataset by ${this.year}`],
          })),
          tooltipTitle: label,
          tooltipLines: [CONSUMER_TYPE_BLURBS[type], `nothing of this kind by ${this.year}`],
        };
      }

      if (bucket.year < this.year) {
        carriedOver++;
      }

      return {
        label,
        detail: `${bucket.year} · ${bucket.devices.length} machine${bucket.devices.length > 1 ? 's' : ''}`,
        present: true,
        cells: MODEL_CLASSES.map(modelClass => this.buildHeroCell(bucket, modelClass, label)),
        tooltipTitle: label,
        tooltipLines: [
          CONSUMER_TYPE_BLURBS[type],
          `newest by ${this.year}: ${bucket.year}`,
          ...bucket.devices.map(device => device.name),
        ],
      };
    });

    this.yearHint = [
      carriedOver ? `${carriedOver} carried over` : '',
      notYet ? `${notYet} not made yet` : '',
    ].filter(Boolean).join(' · ') || 'all current';

    this.buildYearTicks();
  }

  private buildHeroCell(bucket: {year: number, devices: HardwareDeviceInterface[]},
                        modelClass: ModelClassInterface,
                        typeLabel: string): HeroCellViewModel {
    const title = `${bucket.year} ${typeLabel} · ${modelClass.name} ${modelClass.sizeLabel}`;
    const summary = this.summariseBucket(bucket.devices, modelClass);

    if (summary.mean === null) {
      return summary.wontFitCount
        ? {
          rampStep: null, display: 'won\u2019t fit', modelled: false, wontFit: true, tooltipTitle: title,
          tooltipLines: [`none of these ${bucket.devices.length} machines has the `
            + `${this.formatRate(this.model.memoryNeededGb(modelClass))} GB to hold it at ${this.model.contextLabel} context`],
        }
        : {
          rampStep: null, display: '·', modelled: false, wontFit: false, tooltipTitle: title,
          tooltipLines: [
            'no figures in the source',
            ...(modelClass.followsBandwidthLaw ? [] : ['sub-billion models are never modelled']),
          ],
        };
    }

    const band = this.scale.bandFor(summary.mean);

    return {
      rampStep: band.index,
      display: band.name,
      modelled: summary.modelledCount === summary.values.length,
      wontFit: false,
      tooltipTitle: title,
      tooltipLines: [
        `${this.formatRate(summary.mean)} tok/s — ${band.name}`,
        ...(summary.values.length > 1
          ? [`mean of ${summary.values.length} machines (${this.formatRate(Math.min(...summary.values))}–${this.formatRate(Math.max(...summary.values))})`]
          : []),
        ...(summary.wontFitCount ? [`${summary.wontFitCount} more can't hold it at all`] : []),
        ...(summary.modelledCount ? [`${summary.modelledCount} of ${summary.values.length} not measured directly`] : []),
        summary.sources.slice(0, 4).join(' · '),
      ],
    };
  }

  private buildYearTicks() {
    if (!this.dataset?.years.length) {
      return;
    }
    const first = this.yearFloor;
    const last = this.yearCeiling;
    const span = Math.max(last - first, 1);

    this.yearTicks = this.dataset.years.map(year => ({
      year,
      // inset by half a thumb so a label sits under where the thumb actually lands
      offsetStyle: `calc(10px + ${((year - first) / span).toFixed(4)} * (100% - 20px))`,
      active: year === this.year,
      tooltipTitle: year.toString(),
      tooltipLines: [`${this.dataset!.devices.filter(device => device.year === year).length} machines released`],
    }));
  }

  // ── 3. matrix ───────────────────────────────────────────────────────────────

  private groupKeyOf(device: HardwareDeviceInterface): string {
    return this.matrixGrouping === MatrixGroupingEnum.Type ? device.consumerType : device.segment;
  }

  private groupOrder(): string[] {
    return this.matrixGrouping === MatrixGroupingEnum.Type ? CONSUMER_TYPE_ORDER : HARDWARE_SEGMENT_ORDER;
  }

  private groupLabel(key: string): string {
    return this.matrixGrouping === MatrixGroupingEnum.Type
      ? CONSUMER_TYPE_LABELS[key as ConsumerTypeEnum]
      : HARDWARE_SEGMENT_LABELS[key as HardwareSegmentEnum];
  }

  private groupBlurb(key: string): string {
    return this.matrixGrouping === MatrixGroupingEnum.Type
      ? CONSUMER_TYPE_BLURBS[key as ConsumerTypeEnum]
      : HARDWARE_SEGMENT_BLURBS[key as HardwareSegmentEnum];
  }

  private buildMatrix() {
    if (!this.dataset) {
      return;
    }

    const query = this.matrixSearch.trim().toLowerCase();
    const widestBus = Math.max(...this.dataset.devices.map(device => device.bandwidthGbps ?? 0), 1);

    const matches = this.dataset.devices
      .filter(device => this.matrixFilter === 'all' || this.groupKeyOf(device) === this.matrixFilter)
      .filter(device => !query || `${device.name} ${device.manufacturer} ${device.memoryType}`.toLowerCase().includes(query))
      // newest first: what a reader can buy now matters more than what was fastest once
      .sort((left, right) => (right.year ?? 0) - (left.year ?? 0) || (right.bandwidthGbps ?? 0) - (left.bandwidthGbps ?? 0));

    const counts = new Map<string, number>();
    for (const device of this.dataset.devices) {
      const key = this.groupKeyOf(device);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    this.matrixChips = [
      {key: 'all', label: 'All', count: this.dataset.devices.length},
      ...this.groupOrder()
        .filter(key => counts.has(key))
        .map(key => ({key, label: this.groupLabel(key), count: counts.get(key) ?? 0})),
    ];

    const groups = this.matrixFilter === 'all' ? this.groupOrder() : [this.matrixFilter];

    this.matrixGroups = groups
      .map(key => ({
        key,
        label: this.groupLabel(key),
        blurb: this.groupBlurb(key),
        rows: matches.filter(device => this.groupKeyOf(device) === key)
          .map(device => this.buildMatrixRow(device, widestBus)),
      }))
      .filter(group => group.rows.length > 0);

    this.matrixShownCount = matches.length;
  }

  private buildMatrixRow(device: HardwareDeviceInterface, widestBus: number): MatrixRowViewModel {
    return {
      deviceName: device.name,
      yearLabel: device.year !== null ? device.year.toString() : 'n/a',
      bandwidthLabel: device.bandwidthGbps !== null ? `${this.formatNumber(device.bandwidthGbps)} GB/s` : 'bus n/a',
      memoryLabel: this.memoryLabelFor(device),
      bandwidthBarPercent: Math.round(100 * (device.bandwidthGbps ?? 0) / widestBus),
      cells: MODEL_CLASSES.map(modelClass => this.buildMatrixCell(device, modelClass)),
      tooltipTitle: device.name,
      tooltipLines: [
        `${device.manufacturer} · ${device.year ?? 'year not listed'}`,
        `${this.memoryLabelFor(device)}${device.memoryType ? ' · ' + device.memoryType : ''}`,
        device.bandwidthGbps !== null
          ? `${this.formatNumber(device.bandwidthGbps)} GB/s of memory bandwidth`
          : 'bandwidth not listed in the source',
      ],
    };
  }

  private buildMatrixCell(device: HardwareDeviceInterface, modelClass: ModelClassInterface): MatrixCellViewModel {
    const title = `${device.name} · ${modelClass.name} ${modelClass.sizeLabel}`;
    const value = this.throughputFor(device, modelClass);
    const figure = device.throughput[modelClass.sourceColumn];

    if (value === 'wont-fit') {
      return {
        modelClass: modelClass.key,
        source: ThroughputSourceEnum.WontFit,
        tokensPerSecond: null,
        display: 'won’t fit',
        detail: '',
        rampStep: null,
        tooltipTitle: title,
        tooltipLines: [
          `${this.formatRate(this.model.memoryNeededGb(modelClass))} GB needed at ${this.model.contextLabel} context`,
          device.maxMemoryGb !== null ? `${this.formatNumber(device.maxMemoryGb)} GB available` : 'not enough memory',
        ],
      };
    }

    if (value === null) {
      return {
        modelClass: modelClass.key,
        source: ThroughputSourceEnum.Missing,
        tokensPerSecond: null,
        display: 'n/a',
        detail: '',
        rampStep: null,
        tooltipTitle: title,
        tooltipLines: [
          'no figure in the source',
          ...(modelClass.followsBandwidthLaw
            ? [this.showModelledValues ? 'and no bandwidth to model one from' : 'switch on modelled values to fill it in']
            : ['sub-billion models are engine-bound, so they are never modelled']),
        ],
      };
    }

    const band = this.scale.bandFor(value);
    const measured = this.isMeasured(device, modelClass);
    const scaled = this.isScaledFromBucket(device, modelClass);
    const fit = this.dataset!.fits[modelClass.key];

    return {
      modelClass: modelClass.key,
      source: measured ? ThroughputSourceEnum.Measured : ThroughputSourceEnum.Modelled,
      tokensPerSecond: value,
      display: band.name,
      detail: `${this.formatRate(value)} tok/s`,
      rampStep: band.index,
      tooltipTitle: title,
      tooltipLines: [
        `${this.formatRate(value)} tok/s — ${band.name} (${band.rangeLabel})`,
        measured
          ? 'measured figure from the source dataset'
          : scaled
            ? `scaled from this machine's 1–4B figure (×${modelClass.multiplier})`
            : `modelled: ${this.formatNumber(device.bandwidthGbps as number)} GB/s × ${fit.tokensPerGbps.toFixed(3)} tok/s per GB/s`,
        ...(modelClass.followsBandwidthLaw && device.bandwidthGbps !== null
          ? [`${this.formatRate(this.model.streamMilliseconds(
              measured || scaled
                ? (device.throughput[modelClass.sourceColumn].tokensPerSecond as number) * modelClass.multiplier
                : device.bandwidthGbps * fit.tokensPerGbps,
              modelClass, device.segment, fit.bandwidthEfficiency))} ms streaming`
            + ` + ${this.model.overheadMsPerToken[device.segment]} ms overhead`]
          : []),
        ...(figure.sourceRange
          ? [`source publishes a ${this.formatRate(figure.sourceRange[0])}–${this.formatRate(figure.sourceRange[1])} tok/s spread`]
          : []),
      ],
    };
  }

  private memoryLabelFor(device: HardwareDeviceInterface): string {
    if (device.maxMemoryGb === null) {
      return 'system RAM';
    }
    if (device.minMemoryGb !== null && device.minMemoryGb !== device.maxMemoryGb) {
      return `${this.formatNumber(device.minMemoryGb)}–${this.formatNumber(device.maxMemoryGb)} GB`;
    }
    return `${this.formatNumber(device.maxMemoryGb)} GB`;
  }

  // ── 4. explorer ─────────────────────────────────────────────────────────────

  private buildExplorer() {
    if (!this.dataset) {
      return;
    }

    this.explorerColumns = [
      {key: 'manufacturer', label: 'Maker', numeric: false, throughput: false},
      {key: 'name', label: 'Machine', numeric: false, throughput: false},
      {key: 'type', label: 'Kind', numeric: false, throughput: false},
      {key: 'year', label: 'Year', numeric: true, throughput: false},
      {key: 'memory', label: 'Memory GB', numeric: true, throughput: false},
      {key: 'memoryType', label: 'Memory type', numeric: false, throughput: false},
      {key: 'bandwidth', label: 'GB/s', numeric: true, throughput: false},
      ...MODEL_CLASSES.map(modelClass => ({
        key: `class:${modelClass.key}`,
        label: `${modelClass.name} ${modelClass.sizeLabel}`,
        numeric: true,
        throughput: true,
      })),
    ];

    const query = this.explorerSearch.trim().toLowerCase();

    this.explorerRows = this.dataset.devices
      .filter(device => !query || this.explorerHaystack(device).includes(query))
      .sort((left, right) => this.compareDevices(left, right))
      .map(device => ({
        deviceName: device.name,
        cells: this.explorerColumns.map(column => this.buildExplorerCell(device, column)),
      }));
  }

  private explorerHaystack(device: HardwareDeviceInterface): string {
    return `${device.name} ${device.manufacturer} ${device.memoryType} `
      + `${CONSUMER_TYPE_LABELS[device.consumerType]} ${HARDWARE_SEGMENT_LABELS[device.segment]}`.toLowerCase();
  }

  private compareDevices(left: HardwareDeviceInterface, right: HardwareDeviceInterface): number {
    const column = this.explorerColumns.find(candidate => candidate.key === this.sortColumn);
    if (!column) {
      return 0;
    }
    if (!column.numeric) {
      return this.sortDirection * this.explorerText(left, column.key).localeCompare(this.explorerText(right, column.key));
    }
    // Absent figures sort below "won't fit", which sorts below any number, so a
    // descending sort always opens on real data.
    return this.sortDirection * (this.explorerRank(left, column.key) - this.explorerRank(right, column.key));
  }

  private explorerText(device: HardwareDeviceInterface, key: string): string {
    switch (key) {
      case 'manufacturer':
        return device.manufacturer;
      case 'name':
        return device.name;
      case 'type':
        return CONSUMER_TYPE_LABELS[device.consumerType];
      case 'memoryType':
        return device.memoryType;
      default:
        return '';
    }
  }

  private explorerRank(device: HardwareDeviceInterface, key: string): number {
    if (key === 'year') {
      return device.year ?? -1;
    }
    if (key === 'memory') {
      return device.maxMemoryGb ?? -1;
    }
    if (key === 'bandwidth') {
      return device.bandwidthGbps ?? -1;
    }
    const modelClass = MODEL_CLASS_BY_KEY[key.replace('class:', '') as ModelClassEnum];
    const value = this.throughputFor(device, modelClass);
    if (typeof value === 'number') {
      return value;
    }
    return value === 'wont-fit' ? -0.5 : -1;
  }

  private buildExplorerCell(device: HardwareDeviceInterface, column: ExplorerColumnViewModel): ExplorerCellViewModel {
    if (!column.throughput) {
      let display: string;
      let muted = false;

      switch (column.key) {
        case 'year':
          display = device.year !== null ? device.year.toString() : 'n/a';
          muted = device.year === null;
          break;
        case 'memory':
          display = device.maxMemoryGb === null ? 'system' : this.memoryLabelFor(device).replace(' GB', '');
          muted = device.maxMemoryGb === null;
          break;
        case 'bandwidth':
          display = device.bandwidthGbps !== null ? this.formatNumber(device.bandwidthGbps) : 'n/a';
          muted = device.bandwidthGbps === null;
          break;
        case 'memoryType':
          display = device.memoryType || 'n/a';
          muted = !device.memoryType;
          break;
        default:
          display = this.explorerText(device, column.key);
      }

      return {columnKey: column.key, display, numeric: column.numeric, rampStep: null, muted, title: display};
    }

    const modelClass = MODEL_CLASS_BY_KEY[column.key.replace('class:', '') as ModelClassEnum];
    const value = this.throughputFor(device, modelClass);

    if (typeof value === 'number') {
      const band = this.scale.bandFor(value);
      const measured = this.isMeasured(device, modelClass);
      const scaled = this.isScaledFromBucket(device, modelClass);
      return {
        columnKey: column.key,
        display: `${band.name} ${this.formatRate(value)}`,
        numeric: true,
        rampStep: band.index,
        muted: false,
        modelled: !measured,
        title: `${this.formatRate(value)} tok/s — ${band.name}`
          + (measured ? '' : scaled ? `, scaled ×${modelClass.multiplier} from the 1–4B figure` : ', modelled from bandwidth'),
      };
    }

    return {
      columnKey: column.key,
      display: value === 'wont-fit' ? 'won’t fit' : 'n/a',
      numeric: true,
      rampStep: null,
      muted: true,
      modelled: false,
      title: value === 'wont-fit'
        ? `${modelClass.name} is too large for this machine`
        : `the source publishes no ${modelClass.name} figure for this machine`,
    };
  }

  // ── 5. horizon: where each kind of hardware is heading ──────────────────────

  private get horizonEndYear(): number {
    return this.lastMeasuredYear + this.horizonYears;
  }

  private get lastMeasuredYear(): number {
    return this.dataset?.years[this.dataset.years.length - 1] ?? this.currentYear;
  }

  private get firstMeasuredYear(): number {
    return this.dataset?.years[0] ?? this.currentYear - 10;
  }

  private horizonX(year: number): number {
    const span = this.horizonEndYear - this.firstMeasuredYear;
    return HORIZON.labelWidth
      + (year - this.firstMeasuredYear) / span * (HORIZON.width - HORIZON.labelWidth - HORIZON.rightMargin);
  }

  private horizonY(value: number, low: number, high: number): number {
    const span = Math.log(high) - Math.log(low);
    return HORIZON.height - HORIZON.bottomMargin
      - (Math.log(Math.max(value, low)) - Math.log(low)) / span
      * (HORIZON.height - HORIZON.topMargin - HORIZON.bottomMargin);
  }

  /**
   * One series per hardware category: the average its machines managed on the chosen
   * model size, year by year, plus a trend fitted through those averages.
   */
  private horizonSeries(): {
    type: ConsumerTypeEnum,
    label: string,
    colorSlot: number,
    years: {year: number, value: number, machineCount: number, spread: string, modelled: number}[],
    trend: LogTrendInterface | null,
    wontFit: boolean,
  }[] {
    const modelClass = MODEL_CLASS_BY_KEY[this.horizonClass];
    const buckets = this.annualBuckets();

    return HORIZON_CATEGORY_ORDER.map((type, colorSlot) => {
      const years: {year: number, value: number, machineCount: number, spread: string, modelled: number}[] = [];
      let sawWontFit = false;

      for (const bucket of buckets.filter(candidate => candidate.type === type).sort((left, right) => left.year - right.year)) {
        const summary = this.summariseBucket(bucket.devices, modelClass);
        if (summary.mean === null) {
          sawWontFit = sawWontFit || summary.wontFitCount > 0;
          continue;
        }
        years.push({
          year: bucket.year,
          value: summary.mean,
          machineCount: summary.values.length,
          spread: summary.values.length > 1
            ? `${this.formatRate(Math.min(...summary.values))}–${this.formatRate(Math.max(...summary.values))}`
            : '',
          modelled: summary.modelledCount,
        });
      }

      return {
        type,
        label: CONSUMER_TYPE_LABELS[type],
        colorSlot,
        years,
        trend: LogTrendCalculator.fit(years.map(entry => ({year: entry.year, value: entry.value}))),
        wontFit: !years.length && sawWontFit,
      };
    });
  }

  private buildHorizonChart() {
    if (!this.dataset) {
      return;
    }

    const series = this.horizonSeries();
    const endYear = this.horizonEndYear;
    const lastYear = this.lastMeasuredYear;

    this.categoryChips = series.map(entry => ({
      type: entry.type,
      label: entry.label,
      colorSlot: entry.colorSlot,
      active: this.horizonCategories.has(entry.type),
      note: entry.wontFit ? 'won’t fit' : !entry.years.length ? 'no data' : '',
    }));

    const shown = series.filter(entry => this.horizonCategories.has(entry.type) && entry.years.length);

    // Fit the vertical range to what is actually on screen, so the plot is not mostly
    // empty space below the slowest line.
    const values: number[] = [];
    for (const entry of shown) {
      entry.years.forEach(year => values.push(year.value));
      if (entry.trend) {
        values.push(entry.trend.valueAt(endYear));
      }
    }
    const low = values.length ? Math.max(0.3, Math.min(...values) * 0.55) : 0.4;
    const high = values.length ? Math.min(3000, Math.max(...values) * 1.7) : 1000;
    const y = (value: number) => this.horizonY(value, low, high);

    // The speed bands the reader set, as stripes behind the lines.
    const bands: HorizonBandViewModel[] = [];
    for (const band of this.scale.bands) {
      const top = band.index === this.scale.topIndex ? high : band.high;
      const bottom = band.low || low;
      if (bottom >= high) {
        continue;
      }
      const yTop = y(Math.min(top, high));
      const yBottom = y(Math.max(bottom, low));
      if (yBottom - yTop < 1) {
        continue;
      }
      bands.push({
        y: yTop,
        height: yBottom - yTop,
        rampStep: band.index,
        name: band.name,
        showLabel: yBottom - yTop > 15,
      });
    }

    const yTicks: AxisTickViewModel[] = [0.3, 1, 3, 10, 30, 100, 300, 1000, 3000]
      .filter(value => value >= low && value <= high)
      .map(value => ({position: y(value), label: SpeedBandScale.format(value)}));

    const xTicks: (AxisTickViewModel & {emphasis: boolean, projected: boolean})[] = [];
    for (let year = this.firstMeasuredYear; year <= endYear; year++) {
      xTicks.push({
        position: this.horizonX(year),
        label: year.toString(),
        emphasis: year % 5 === 0,
        projected: year > lastYear,
      });
    }

    const modelClass = MODEL_CLASS_BY_KEY[this.horizonClass];
    const drawn: HorizonSeriesViewModel[] = shown.map(entry => {
      const points: HorizonPointViewModel[] = entry.years.map(measured => ({
        cx: this.horizonX(measured.year),
        cy: y(measured.value),
        tooltipTitle: `${measured.year} · ${entry.label}`,
        tooltipLines: [
          `${this.formatRate(measured.value)} tok/s — ${this.scale.bandFor(measured.value).name}`,
          `mean of ${measured.machineCount} machine${measured.machineCount > 1 ? 's' : ''}`
            + (measured.spread ? ` (${measured.spread})` : ''),
          ...(measured.modelled
            ? [`${measured.modelled} of ${measured.machineCount} modelled from bandwidth`]
            : []),
        ],
      }));

      const projected: string[] = [];
      if (entry.trend) {
        for (let year = entry.trend.lastYear; year <= endYear; year += 0.5) {
          projected.push(`${this.horizonX(year)},${y(Math.min(entry.trend.valueAt(year), high))}`);
        }
      }

      const endValue = entry.trend ? entry.trend.valueAt(endYear) : entry.years[entry.years.length - 1].value;
      const rate = entry.trend
        ? `${entry.trend.ratePerYear >= 0 ? '+' : '−'}${Math.abs(Math.round(entry.trend.ratePerYear * 100))}%/yr`
        : '';

      return {
        type: entry.type,
        label: entry.label,
        colorSlot: entry.colorSlot,
        measuredPoints: points.map(point => `${point.cx},${point.cy}`).join(' '),
        projectedPoints: projected.join(' '),
        points,
        labelX: HORIZON.width - HORIZON.rightMargin + 9,
        labelY: y(Math.min(endValue, high)),
        labelDetail: `${this.formatRate(endValue)} tok/s${rate ? ' · ' + rate : ''}`,
      };
    });

    // Right-edge labels are the identity channel here, so they must not stack.
    const ordered = [...drawn].sort((left, right) => left.labelY - right.labelY);
    for (let index = 1; index < ordered.length; index++) {
      if (ordered[index].labelY - ordered[index - 1].labelY < 30) {
        ordered[index].labelY = ordered[index - 1].labelY + 30;
      }
    }

    this.horizonChart = {
      width: HORIZON.width,
      height: HORIZON.height,
      plotLeft: HORIZON.labelWidth,
      plotRight: HORIZON.width - HORIZON.rightMargin,
      plotTop: HORIZON.topMargin,
      plotBottom: HORIZON.height - HORIZON.bottomMargin,
      xTicks,
      yTicks,
      bands,
      series: drawn,
      projectedX: this.horizonX(lastYear),
      projectedWidth: HORIZON.width - HORIZON.rightMargin - this.horizonX(lastYear),
    };

    this.buildHorizonNote(series, modelClass);
  }

  /** Who is already fast enough, who arrives before the horizon, and who does not. */
  private buildHorizonNote(series: ReturnType<ConsumerHardwareAnalysisPage['horizonSeries']>,
                           modelClass: ModelClassInterface) {
    const target = this.referenceBand.low;
    const endYear = this.horizonEndYear;
    const there: string[] = [];
    const coming: string[] = [];
    const notYet: string[] = [];

    for (const entry of series.filter(candidate => this.horizonCategories.has(candidate.type))) {
      if (!entry.years.length) {
        notYet.push(entry.label);
        continue;
      }
      if (entry.years[entry.years.length - 1].value >= target) {
        there.push(entry.label);
        continue;
      }
      if (!entry.trend) {
        notYet.push(entry.label);
        continue;
      }
      let arrival: number | null = null;
      for (let year = entry.trend.lastYear + 1; year <= endYear; year++) {
        if (entry.trend.valueAt(year) >= target) {
          arrival = year;
          break;
        }
      }
      if (arrival) {
        coming.push(`${entry.label} ${arrival}`);
      } else {
        notYet.push(entry.label);
      }
    }

    this.horizonHeadline = `${modelClass.name} ${modelClass.sizeLabel} at ${this.referenceBand.name} speed:`;
    this.horizonNote = [
      there.length ? `already there — ${there.join(', ')}.` : 'nothing is there yet.',
      coming.length ? `Arriving by ${endYear} — ${coming.join(', ')}.` : '',
      notYet.length ? `Not by ${endYear} — ${notYet.join(', ')}.` : '',
    ].filter(Boolean).join(' ');

    this.horizonCaveat = !modelClass.followsBandwidthLaw
      ? 'Measured figures only — models this small do not follow the bandwidth law, so nothing here is modelled and the lines are sparser.'
      : isDerivedModelClass(modelClass)
        ? `Derived: the source measures the 1–4B bucket as a whole, and this size is scaled from it by weight (×${modelClass.multiplier}).`
        : '';
  }
}
