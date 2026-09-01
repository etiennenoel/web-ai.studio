import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';

import {HARDWARE_DATASET_URL} from '../constants/csv-columns.constant';
import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';
import {ModelClassEnum} from '../enums/model-class.enum';
import {SourceColumnEnum} from '../enums/source-column.enum';
import {HardwareDatasetInterface} from '../interfaces/hardware-dataset.interface';
import {HardwareDatasetService} from './hardware-dataset.service';

/**
 * A slice of the real dataset: four Apple Max parts (a full tier history) plus two
 * NVIDIA rows carrying the awkward conventions — an en-dash range, the "too large for
 * this machine" dash, and a row with no figures at all.
 */
const CSV = [
  'Manufacturer,Name,Year,Min Memory(GB),Max Memory(GB),Memory Type,Bandwidth(GBps),Tiny [200-600M] Min (tok/s),Tiny [200-600M] Max (tok/s),Nano (tok/s) [1-4B],Light (tok/s) [7-9B],Mid (tok/s) [12-14B],Large(tok/s) [27-34B],XL(tok/s) [70B+]',
  'Apple,M1 Max,2021,32,64,LPDDR5,400,70,120,96,55,27,13,5.7',
  'Apple,M2 Max,2023,32,96,LPDDR5,400,90,140,96,62,27,13,5.7',
  'Apple,M3 Max,2023,36,128,LPDDR5,400,90,140,96,63,27,13,5.7',
  'Apple,M4 Max,2024,36,128,LPDDR5X,546,100,160,131,55,36,18,7.8',
  'NVIDIA,RTX 3060 12GB,2021,12,12,GDDR6,360,140,230,86,42,23–29,—,—',
  'NVIDIA,"RTX Nothing 8GB",2020,8,8,GDDR6,,,,,,,,',
  // a system built around silicon the file already lists: folded into M4 Max
  'Apple,Apple M4 Max Mac Studio,2025,36,128,,546,,,,55,,,',
].join('\n');

describe('HardwareDatasetService', () => {

  let service: HardwareDatasetService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HardwareDatasetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function loadFixture(): HardwareDatasetInterface {
    let dataset: HardwareDatasetInterface | undefined;
    service.load().subscribe(loaded => dataset = loaded);
    http.expectOne(HARDWARE_DATASET_URL).flush(CSV);
    expect(dataset).toBeDefined();
    return dataset as HardwareDatasetInterface;
  }

  it('reads every row, including the one with no throughput figures', () => {
    expect(loadFixture().devices.length).toBe(6);
  });

  it('folds a system row into the silicon it contains, and says which', () => {
    const dataset = loadFixture();

    expect(dataset.devices.some(device => device.name === 'Apple M4 Max Mac Studio')).toBeFalse();
    expect(dataset.foldedDevices).toEqual([{name: 'Apple M4 Max Mac Studio', into: 'M4 Max'}]);
  });

  it('keeps a folded row out of the fits, so one memory bus is counted once', () => {
    // The Mac Studio publishes a Light figure at the same 546 GB/s as the M4 Max.
    // Counting it would weight that bus twice.
    expect(loadFixture().fits[ModelClassEnum.Light].sampleCount).toBe(5);
  });

  it('records which years the dataset covers', () => {
    expect(loadFixture().years).toEqual([2020, 2021, 2023, 2024]);
  });

  it('takes the midpoint of the Tiny min/max pair and keeps the published spread', () => {
    const m1Max = loadFixture().devices.find(device => device.name === 'M1 Max')!;
    const tiny = m1Max.throughput[SourceColumnEnum.Tiny];

    expect(tiny.tokensPerSecond).toBe(95);
    expect(tiny.sourceRange).toEqual([70, 120]);
  });

  it('reads a range as its midpoint and a dash as "will not fit"', () => {
    const card = loadFixture().devices.find(device => device.name === 'RTX 3060 12GB')!;

    expect(card.throughput[SourceColumnEnum.Mid].tokensPerSecond).toBe(26);
    expect(card.throughput[SourceColumnEnum.Large].wontFit).toBeTrue();
    expect(card.throughput[SourceColumnEnum.Large].tokensPerSecond).toBeNull();
  });

  it('leaves a blank cell absent rather than zero', () => {
    const empty = loadFixture().devices.find(device => device.name === 'RTX Nothing 8GB')!;

    expect(empty.bandwidthGbps).toBeNull();
    expect(empty.throughput[SourceColumnEnum.Nano].tokensPerSecond).toBeNull();
    expect(empty.throughput[SourceColumnEnum.Nano].wontFit).toBeFalse();
  });

  it('sorts machines into segments', () => {
    const devices = loadFixture().devices;

    expect(devices.find(device => device.name === 'M4 Max')!.segment).toBe(HardwareSegmentEnum.AppleSoc);
    expect(devices.find(device => device.name === 'RTX 3060 12GB')!.segment).toBe(HardwareSegmentEnum.DiscreteGpu);
  });

  it('fits tokens/second against bandwidth per model size', () => {
    const fit = loadFixture().fits[ModelClassEnum.Nano4B];

    expect(fit.sampleCount).toBe(5);
    expect(fit.tokensPerGbps).toBeCloseTo(0.239817, 6);
    expect(fit.rSquared).toBeCloseTo(0.99989, 5);
    expect(fit.gbPerToken).toBeCloseTo(4.16984, 5);
    expect(fit.bandwidthEfficiency).toBeCloseTo(0.599543, 6);
  });

  it('excludes machines with no bandwidth from a fit', () => {
    // Five Nano figures across six machines: the bandwidth-less row cannot be placed.
    expect(loadFixture().fits[ModelClassEnum.Nano4B].sampleCount).toBe(5);
  });

  describe('the sizes that share the 1–4B column', () => {

    it('scales the slope by weight and leaves the efficiency alone', () => {
      const fits = loadFixture().fits;
      const measured = fits[ModelClassEnum.Nano4B];

      // A quarter of the weights streams four times as fast, and the share of the bus
      // the engine converts is a property of the law, not of the size.
      expect(fits[ModelClassEnum.Nano1B].tokensPerGbps).toBeCloseTo(measured.tokensPerGbps * 4, 9);
      expect(fits[ModelClassEnum.Nano2B].tokensPerGbps).toBeCloseTo(measured.tokensPerGbps * 2, 9);
      expect(fits[ModelClassEnum.Nano1B].gbPerToken).toBeCloseTo(measured.gbPerToken / 4, 9);
      expect(fits[ModelClassEnum.Nano1B].bandwidthEfficiency).toBeCloseTo(measured.bandwidthEfficiency, 6);
    });

    it('marks the scaled sizes as derived and shares the column\'s fit quality', () => {
      const fits = loadFixture().fits;

      expect(fits[ModelClassEnum.Nano4B].derived).toBeFalse();
      expect(fits[ModelClassEnum.Nano1B].derived).toBeTrue();
      expect(fits[ModelClassEnum.Nano1B].sourceColumn).toBe(SourceColumnEnum.Nano);
      expect(fits[ModelClassEnum.Nano1B].sampleCount).toBe(fits[ModelClassEnum.Nano4B].sampleCount);
      expect(fits[ModelClassEnum.Nano1B].rSquared).toBe(fits[ModelClassEnum.Nano4B].rSquared);
    });

    it('counts the shared column once, not once per size that reads it', () => {
      // Nano 5, Light 5, Mid 5, Large 4, XL 4 — the three Nano columns are one set.
      expect(loadFixture().figureCountAtOneBillionPlus).toBe(23);
    });
  });

  it('counts measured figures either side of one billion parameters', () => {
    // Tiny: five machines publish a min/max pair.
    expect(loadFixture().figureCountSubBillion).toBe(5);
  });

  it('loads the dataset once and replays it', () => {
    loadFixture();

    let second: HardwareDatasetInterface | undefined;
    service.load().subscribe(loaded => second = loaded);

    expect(second).toBeDefined();
    http.expectNone(HARDWARE_DATASET_URL);
  });
});
