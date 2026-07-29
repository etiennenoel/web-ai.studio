/**
 * Hand-authored, illustrative previews shown on the demo cards.
 *
 * Nothing here runs a model: the content is fake sample data whose only job is to let
 * someone scanning /demos see the *shape* of what a demo produces before opening it.
 */

export type DemoPreviewKind =
  | 'io'        // input block -> output block
  | 'diff'      // before / after, with the changed spans marked
  | 'chat'      // alternating conversation bubbles
  | 'captions'  // stacked transcript tracks
  | 'list'      // ranked rows with a score bar
  | 'chips'     // labelled tags, clusters or categories
  | 'json'      // pretty-printed structured output
  | 'code';     // generated code

/** The small tile shown on the left of the preview when a demo consumes a media input. */
export interface DemoPreviewSource {
  icon: string;   // bi-* class, e.g. bi-mic, bi-camera, bi-image
  label: string;  // e.g. "receipt.jpg", "standup.wav"
}

export interface DemoPreviewIoRow {
  /** `in` renders muted (the user's input), `out` renders as the model's answer. */
  role: 'in' | 'out';
  text: string;
}

export interface DemoPreviewDiffRow {
  text: string;
  /** Marks the span as corrected / rewritten. */
  changed?: boolean;
}

export interface DemoPreviewListRow {
  text: string;
  /** 0..1 — drawn as a bar plus a percentage. */
  score: number;
  /** Optional trailing label, e.g. a matched category. */
  meta?: string;
}

export interface DemoPreviewChipRow {
  label: string;
  /** Optional grouping header rendered above the chip row. */
  group?: string;
}

export type DemoPreviewRow =
  | DemoPreviewIoRow
  | DemoPreviewDiffRow
  | DemoPreviewListRow
  | DemoPreviewChipRow;

interface DemoPreviewBase {
  source?: DemoPreviewSource;
}

export interface DemoIoPreview extends DemoPreviewBase {
  kind: 'io' | 'chat' | 'captions';
  rows: DemoPreviewIoRow[];
}

export interface DemoDiffPreview extends DemoPreviewBase {
  kind: 'diff';
  before: DemoPreviewDiffRow[];
  after: DemoPreviewDiffRow[];
}

export interface DemoListPreview extends DemoPreviewBase {
  kind: 'list';
  query?: string;
  rows: DemoPreviewListRow[];
}

export interface DemoChipsPreview extends DemoPreviewBase {
  kind: 'chips';
  caption?: string;
  rows: DemoPreviewChipRow[];
}

export interface DemoCodePreview extends DemoPreviewBase {
  kind: 'json' | 'code';
  /** Rendered verbatim in a monospace block; keep it to ~6 short lines. */
  code: string;
  /** Optional single-line prompt shown above the block. */
  caption?: string;
}

export type DemoPreview =
  | DemoIoPreview
  | DemoDiffPreview
  | DemoListPreview
  | DemoChipsPreview
  | DemoCodePreview;
