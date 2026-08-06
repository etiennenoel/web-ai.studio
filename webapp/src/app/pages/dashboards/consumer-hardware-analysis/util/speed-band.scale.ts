import {BandConflictKindEnum} from '../enums/band-conflict-kind.enum';
import {DEFAULT_BAND_EDGES, SPEED_BAND_META} from '../constants/speed-bands.constant';
import {BandConflictInterface} from '../interfaces/band-conflict.interface';
import {SpeedBandInterface} from '../interfaces/speed-band.interface';

/**
 * The five speed bands, and the four edges between them that a reader can drag.
 *
 * Each band owns *both* ends of its interval, so neighbours are allowed to disagree.
 * Nothing is auto-corrected: an overlap or a gap is reported, and only reconciled when
 * the reader asks. That way dragging one handle never silently moves another.
 */
export class SpeedBandScale {

  /** Inclusive lower edge per band. Index 0 is pinned to zero. */
  private low: number[] = [];

  /** Exclusive upper edge per band. The top band is pinned to Infinity. */
  private high: number[] = [];

  constructor(edges: number[] = DEFAULT_BAND_EDGES) {
    this.applyEdges(edges);
  }

  /** Index of the fastest band. */
  get topIndex(): number {
    return SPEED_BAND_META.length - 1;
  }

  /** The bands, slowest first, with their current intervals resolved. */
  get bands(): SpeedBandInterface[] {
    return SPEED_BAND_META.map((meta, index) => ({
      key: meta.key,
      name: meta.name,
      index,
      low: this.low[index],
      high: this.high[index],
      rangeLabel: this.rangeLabel(index),
    }));
  }

  /** The bands, fastest first — the order a legend reads in. */
  get bandsFastestFirst(): SpeedBandInterface[] {
    return [...this.bands].reverse();
  }

  bandAt(index: number): SpeedBandInterface {
    return this.bands[Math.min(Math.max(index, 0), this.topIndex)];
  }

  /**
   * Which band a rate falls into. Where bands overlap the faster one wins; where they
   * leave a gap, the rate falls to the band beneath it.
   */
  indexFor(tokensPerSecond: number): number {
    const hits: number[] = [];
    for (let index = 0; index <= this.topIndex; index++) {
      if (tokensPerSecond >= this.low[index] && (index === this.topIndex || tokensPerSecond < this.high[index])) {
        hits.push(index);
      }
    }
    if (hits.length) {
      return hits[hits.length - 1];
    }

    let beneath = 0;
    for (let index = 0; index <= this.topIndex; index++) {
      if (this.low[index] <= tokensPerSecond) {
        beneath = index;
      }
    }
    return beneath;
  }

  bandFor(tokensPerSecond: number): SpeedBandInterface {
    return this.bandAt(this.indexFor(tokensPerSecond));
  }

  rangeLabel(index: number): string {
    const low = SpeedBandScale.format(this.low[index]);
    return index === this.topIndex ? `${low}+` : `${low}–${SpeedBandScale.format(this.high[index])}`;
  }

  /** The four edges, as the advanced-settings summary shows them. */
  get edgeSummary(): string {
    return this.low.slice(1).map(value => SpeedBandScale.format(value)).join(' · ');
  }

  setLow(index: number, value: number) {
    if (index > 0) {
      this.low[index] = Math.max(0, value);
    }
  }

  setHigh(index: number, value: number) {
    if (index < this.topIndex) {
      this.high[index] = Math.max(0, value);
    }
  }

  /** The movable lower edges: every band's floor but the slowest, which is pinned to zero. */
  get lowEdges(): number[] {
    return this.low.slice(1);
  }

  /** The movable upper edges: every band's ceiling but the fastest, which has none. */
  get highEdges(): number[] {
    return this.high.slice(0, this.topIndex);
  }

  /**
   * Restores both sets of edges at once — how a shared URL puts the scale back, including
   * a scale the sender left deliberately in conflict.
   */
  setEdges(lows: number[], highs: number[]) {
    if (lows.length !== this.topIndex || highs.length !== this.topIndex) {
      return;
    }
    this.low = [0, ...lows.map(value => Math.max(0, value))];
    this.high = [...highs.map(value => Math.max(0, value)), Number.POSITIVE_INFINITY];
  }

  /** Everything the reader's edges currently disagree about. */
  conflicts(): BandConflictInterface[] {
    const found: BandConflictInterface[] = [];

    for (let index = 0; index <= this.topIndex; index++) {
      if (this.low[index] > this.high[index]) {
        found.push({
          kind: BandConflictKindEnum.Inverted,
          index,
          message: `${SPEED_BAND_META[index].name} ends before it starts`,
        });
      }
    }

    for (let index = 0; index < this.topIndex; index++) {
      const upper = this.high[index];
      const nextLower = this.low[index + 1];
      if (upper < nextLower) {
        found.push({
          kind: BandConflictKindEnum.Gap,
          index,
          neighbourIndex: index + 1,
          message: `${SpeedBandScale.format(upper)}–${SpeedBandScale.format(nextLower)} tok/s belongs to no band`,
        });
      } else if (upper > nextLower) {
        found.push({
          kind: BandConflictKindEnum.Overlap,
          index,
          neighbourIndex: index + 1,
          message: `${SPEED_BAND_META[index].name} and ${SPEED_BAND_META[index + 1].name} both claim `
            + `${SpeedBandScale.format(nextLower)}–${SpeedBandScale.format(upper)}`,
        });
      }
    }

    return found;
  }

  /**
   * Meet each disputed pair at its midpoint, then sort and space the resulting edges.
   * Settling pairs left to right on their own can leave a band inverted.
   */
  reconcile() {
    const edges: number[] = [];
    for (let index = 0; index < this.topIndex; index++) {
      edges.push((Math.max(this.high[index], this.low[index]) + this.low[index + 1]) / 2);
    }
    edges.sort((left, right) => left - right);

    for (let position = 0; position < edges.length; position++) {
      let value = Math.max(0.5, Math.round(edges[position] * 2) / 2);
      if (position && value <= edges[position - 1]) {
        value = edges[position - 1] + 0.5;
      }
      edges[position] = value;
    }

    this.applyEdges(edges);
  }

  reset() {
    this.applyEdges(DEFAULT_BAND_EDGES);
  }

  get isDefault(): boolean {
    return this.low.slice(1).every((value, index) => value === DEFAULT_BAND_EDGES[index])
      && this.high.slice(0, this.topIndex).every((value, index) => value === DEFAULT_BAND_EDGES[index]);
  }

  private applyEdges(edges: number[]) {
    this.low = [0, ...edges];
    this.high = [...edges, Number.POSITIVE_INFINITY];
  }

  /** Half-steps read better than long decimals on a slider. */
  static format(value: number): string {
    if (!Number.isFinite(value)) {
      return '∞';
    }
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }
}
