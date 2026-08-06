import {ConsumerTypeEnum} from '../enums/consumer-type.enum';
import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';
import {SourceColumnEnum} from '../enums/source-column.enum';
import {ThroughputFigureInterface} from './throughput-figure.interface';

/** One machine, as parsed from a row of the source CSV. */
export interface HardwareDeviceInterface {
  name: string;
  manufacturer: string;

  /** Release year, or null when the source leaves it blank. */
  year: number | null;

  /** Lowest memory configuration sold, in GB. Null when the source lists none. */
  minMemoryGb: number | null;

  /** Highest memory configuration sold, in GB. Null for parts that use system RAM. */
  maxMemoryGb: number | null;

  memoryType: string;

  /** Theoretical memory bandwidth in GB/s. Null when the source lists none. */
  bandwidthGbps: number | null;

  /** How the machine gets its bandwidth. */
  segment: HardwareSegmentEnum;

  /** The kind of machine a reader would buy. */
  consumerType: ConsumerTypeEnum;

  /** Figures as published, keyed by the column they came from. */
  throughput: Record<SourceColumnEnum, ThroughputFigureInterface>;
}
