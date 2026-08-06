import {BandConflictKindEnum} from '../enums/band-conflict-kind.enum';
import {SpeedBandEnum} from '../enums/speed-band.enum';
import {SpeedBandScale} from './speed-band.scale';

describe('SpeedBandScale', () => {

  let scale: SpeedBandScale;

  beforeEach(() => scale = new SpeedBandScale([10, 20, 35, 50]));

  it('pins the slowest band to zero and leaves the fastest open-ended', () => {
    expect(scale.bandAt(0).low).toBe(0);
    expect(scale.bandAt(0).rangeLabel).toBe('0–10');
    expect(scale.bandAt(4).high).toBe(Number.POSITIVE_INFINITY);
    expect(scale.bandAt(4).rangeLabel).toBe('50+');
  });

  it('places a rate in the band that claims it', () => {
    expect(scale.bandFor(4).key).toBe(SpeedBandEnum.Crawling);
    expect(scale.bandFor(12).key).toBe(SpeedBandEnum.Slow);
    expect(scale.bandFor(20).key).toBe(SpeedBandEnum.Readable);
    expect(scale.bandFor(35).key).toBe(SpeedBandEnum.Conversational);
    expect(scale.bandFor(400).key).toBe(SpeedBandEnum.Instant);
  });

  it('treats each edge as the start of the faster band', () => {
    expect(scale.bandFor(9.9).key).toBe(SpeedBandEnum.Crawling);
    expect(scale.bandFor(10).key).toBe(SpeedBandEnum.Slow);
  });

  it('refuses to move a pinned edge', () => {
    scale.setLow(0, 5);
    scale.setHigh(4, 60);

    expect(scale.bandAt(0).low).toBe(0);
    expect(scale.bandAt(4).high).toBe(Number.POSITIVE_INFINITY);
  });

  describe('when the reader drags neighbours into disagreement', () => {

    it('reports an overlap and resolves it to the faster band', () => {
      scale.setHigh(1, 30);                       // slow now runs 10–30, readable 20–35

      const conflicts = scale.conflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].kind).toBe(BandConflictKindEnum.Overlap);
      expect(conflicts[0].message).toContain('20–30');
      // 25 is claimed by both; the faster of the two wins
      expect(scale.bandFor(25).key).toBe(SpeedBandEnum.Readable);
    });

    it('reports a gap and drops the orphaned range to the band beneath', () => {
      scale.setHigh(1, 14);                       // 14–20 now belongs to nobody

      const conflicts = scale.conflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].kind).toBe(BandConflictKindEnum.Gap);
      expect(conflicts[0].message).toContain('14–20');
      expect(scale.bandFor(17).key).toBe(SpeedBandEnum.Slow);
    });

    it('reports a band whose end has been dragged below its start', () => {
      scale.setHigh(2, 15);                       // readable starts at 20, ends at 15

      const kinds = scale.conflicts().map(conflict => conflict.kind);
      expect(kinds).toContain(BandConflictKindEnum.Inverted);
    });

    it('never silently corrects an edge', () => {
      scale.setHigh(1, 30);

      expect(scale.bandAt(1).high).toBe(30);
      expect(scale.bandAt(2).low).toBe(20);
    });
  });

  describe('reconcile', () => {

    it('meets a disputed pair at its midpoint and clears the conflict', () => {
      scale.setHigh(1, 30);
      scale.reconcile();

      expect(scale.conflicts()).toEqual([]);
      expect(scale.bandAt(1).high).toBe(25);
      expect(scale.bandAt(2).low).toBe(25);
    });

    it('leaves no band inverted, even when several edges cross at once', () => {
      scale.setHigh(1, 48);
      scale.setHigh(2, 12);
      scale.setLow(3, 11);
      scale.reconcile();

      expect(scale.conflicts()).toEqual([]);
      for (let index = 0; index < 4; index++) {
        expect(scale.bandAt(index).high).toBeGreaterThan(scale.bandAt(index).low);
        expect(scale.bandAt(index + 1).low).toBe(scale.bandAt(index).high);
      }
    });
  });

  it('reports its edges for the settings summary, and restores them on reset', () => {
    expect(scale.edgeSummary).toBe('10 · 20 · 35 · 50');
    expect(scale.isDefault).toBeTrue();

    scale.setLow(2, 22.5);
    expect(scale.edgeSummary).toBe('10 · 22.5 · 35 · 50');
    expect(scale.isDefault).toBeFalse();

    scale.reset();
    expect(scale.edgeSummary).toBe('10 · 20 · 35 · 50');
    expect(scale.isDefault).toBeTrue();
  });
});
