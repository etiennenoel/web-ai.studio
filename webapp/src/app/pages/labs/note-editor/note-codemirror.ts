/**
 * The note editor, built on CodeMirror 6 in the "live preview" arrangement Obsidian uses.
 *
 * The markdown text **is** the document — nothing here ever transforms it. Decorations only change
 * how it is *displayed*: the syntax on every line except the one the caret is on is hidden, so the
 * editor reads like the preview while staying a plain text field underneath.
 *
 * Ported (trimmed) from etiennenoel.com's notes-codemirror.ts: the sync anchors, to-do
 * drag-reorder and highlight.js code highlighting were left behind — this page is a Summarizer
 * timing testbed, not a synced notes app.
 *
 * Browser only: import it dynamically behind an isPlatformBrowser guard so it never reaches the
 * SSR bundle.
 */
import { EditorState, Range } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
  placeholder,
} from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { markdown as markdownLang, markdownLanguage } from '@codemirror/lang-markdown';
import { tags as t } from '@lezer/highlight';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';

export interface NoteEditorOptions {
  parent: HTMLElement;
  doc: string;
  placeholder?: string;
  /** Fired only when the document text actually changed. */
  onDocChange: (text: string) => void;
  /** Up on the first line leaves the body for the title, the way it does in Apple Notes. */
  onArrowUpAtTop: () => void;
}

export interface NoteEditor {
  view: EditorView;
  setDoc(text: string, caret?: number): void;
  focusAt(pos: number): void;
  focus(): void;
  destroy(): void;
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const markdown = markdownLang({ base: markdownLanguage });

// Only the document's own markdown — headings, emphasis, links.
const highlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.6em', fontWeight: '700', lineHeight: '1.3' },
  { tag: t.heading2, fontSize: '1.35em', fontWeight: '700', lineHeight: '1.3' },
  { tag: t.heading3, fontSize: '1.15em', fontWeight: '700' },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: '700' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.monospace, fontFamily: MONO, fontSize: '0.9em' },
  { tag: [t.link, t.url], color: 'var(--note-accent, #6366f1)' },
  { tag: t.quote, color: 'var(--note-muted, #64748b)', fontStyle: 'italic' },
  // The markers themselves — mostly hidden, so this is how they look on the line you are editing.
  { tag: t.processingInstruction, color: 'var(--note-subtle, #94a3b8)' },
]);

class CheckboxWidget extends WidgetType {
  constructor(
    private readonly checked: boolean,
    private readonly from: number,
  ) {
    super();
  }

  override eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked && other.from === this.from;
  }

  override toDOM(view: EditorView): HTMLElement {
    const box = document.createElement('span');
    box.className = 'nb-check' + (this.checked ? ' is-on' : '');
    box.setAttribute('role', 'checkbox');
    box.setAttribute('aria-checked', String(this.checked));
    // Never steal focus: ticking something must not close the keyboard on a phone.
    box.addEventListener('mousedown', (event) => event.preventDefault());
    box.addEventListener('click', () => {
      view.dispatch({
        changes: { from: this.from, to: this.from + 3, insert: this.checked ? '[ ]' : '[x]' },
      });
    });
    return box;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

/** Stands in for the `-` of a bullet, so a list reads as a list rather than as dashes. */
class BulletWidget extends WidgetType {
  override eq(): boolean {
    return true; // every bullet is the same bullet
  }

  override toDOM(): HTMLElement {
    const dot = document.createElement('span');
    dot.className = 'nb-bullet';
    dot.textContent = '•';
    return dot;
  }
}

/** Inline markers that simply vanish once the caret leaves their line. */
const HIDDEN_MARKS = new Set(['EmphasisMark', 'StrikethroughMark', 'LinkMark']);

const TASK_LINE_RE = /^\s*[-*+]\s+\[[ xX]\]/;

/**
 * What makes the editor read like the preview: the syntax on every line *except the one you are on*
 * is hidden, and the line you are on shows its raw markdown so you can edit it. That is the whole
 * live-preview trick — the text never changes, only what is drawn.
 */
function buildDecorations(view: EditorView): DecorationSet {
  const found: Range<Decoration>[] = [];
  const doc = view.state.doc;

  const activeLines = new Set<number>();
  for (const range of view.state.selection.ranges) {
    const first = doc.lineAt(range.from).number;
    const last = doc.lineAt(range.to).number;
    for (let line = first; line <= last; line++) {
      activeLines.add(line);
    }
  }

  /** Markers own the space that follows them; leaving it behind indents the text by one. */
  const withTrailingSpace = (to: number) => (doc.sliceString(to, to + 1) === ' ' ? to + 1 : to);

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        // The checkbox stays a checkbox even on the active line: you tap it, you never type it.
        if (node.name === 'TaskMarker') {
          const checked = doc.sliceString(node.from, node.to).toLowerCase() === '[x]';
          found.push(
            Decoration.replace({ widget: new CheckboxWidget(checked, node.from) }).range(node.from, node.to),
          );
          return true;
        }

        // Inline code `like this` drops its backticks. Hidden even on the active line — the
        // monospace already reads as code.
        if (node.name === 'CodeMark' && node.node.parent?.name === 'InlineCode') {
          found.push(Decoration.replace({}).range(node.from, node.to));
          return true;
        }

        // A quote keeps its bar whether or not the caret is in it — once the ">" is hidden, the bar
        // is the only thing that says "quote". We still descend, so those marks get hidden below.
        if (node.name === 'Blockquote') {
          for (let pos = node.from; ; ) {
            const line = doc.lineAt(pos);
            found.push(Decoration.line({ class: 'nb-quote-line' }).range(line.from));
            if (line.to >= node.to) {
              break;
            }
            pos = line.to + 1;
          }
          return true;
        }

        // Structural markers — a heading's "#" and a quote's ">" — are hidden even on the active
        // line: they are pure syntax whose rendered form already reads as itself.
        if (node.name === 'HeaderMark') {
          found.push(Decoration.replace({}).range(node.from, withTrailingSpace(node.to)));
          return true;
        }

        if (node.name === 'QuoteMark') {
          found.push(Decoration.replace({}).range(node.from, withTrailingSpace(node.to)));
          return true;
        }

        // A task item's dash is pure noise in front of the checkbox — gone even on the active line.
        if (node.name === 'ListMark' && TASK_LINE_RE.test(doc.lineAt(node.from).text)) {
          found.push(Decoration.replace({}).range(node.from, withTrailingSpace(node.to)));
          return true;
        }

        if (activeLines.has(doc.lineAt(node.from).number)) {
          return true; // inline syntax (emphasis, links…) stays editable on the line you are on
        }

        if (node.name === 'ListMark') {
          if (/^[-*+]$/.test(doc.sliceString(node.from, node.to))) {
            found.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to));
          }
          // An ordered list's "1." is content, not syntax — it stays.
          return true;
        }

        // `[text](url)` reads as just `text` — LinkMark takes the brackets, this takes the target.
        if (node.name === 'URL' && node.node.parent?.name === 'Link') {
          found.push(Decoration.replace({}).range(node.from, node.to));
          return true;
        }

        if (HIDDEN_MARKS.has(node.name)) {
          found.push(Decoration.replace({}).range(node.from, node.to));
        }

        return true;
      },
    });
  }

  // Let CodeMirror sort: line and replace decorations at the same offset have an ordering that a
  // naive from/to comparator gets wrong, and a mis-sorted set throws at runtime.
  return Decoration.set(found, true);
}

const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
  },
);

const theme = EditorView.theme({
  '&': {
    fontSize: '15px',
    height: '100%',
    backgroundColor: 'transparent',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': {
    fontFamily: 'inherit',
    lineHeight: '1.7',
    padding: '0',
    caretColor: 'var(--note-accent, #6366f1)',
  },
  '.cm-line': { padding: '0' },
  '.cm-scroller': { fontFamily: 'inherit', overflow: 'auto' },
});

export function createNoteEditor(options: NoteEditorOptions): NoteEditor {
  const view = new EditorView({
    parent: options.parent,
    state: EditorState.create({
      doc: options.doc,
      extensions: [
        markdown,
        syntaxHighlighting(highlight),
        livePreview,
        history(),
        theme,
        EditorView.lineWrapping,
        placeholder(options.placeholder ?? ''),
        keymap.of([
          {
            key: 'ArrowUp',
            run: (v) => {
              const { head } = v.state.selection.main;
              if (v.state.doc.lineAt(head).number === 1) {
                options.onArrowUpAtTop();
                return true;
              }
              return false;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            options.onDocChange(update.state.doc.toString());
          }
        }),
      ],
    }),
  });

  return {
    view,
    setDoc(text: string, caret?: number): void {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: caret === undefined ? undefined : { anchor: Math.min(caret, text.length) },
      });
    },
    focusAt(pos: number): void {
      view.focus();
      view.dispatch({ selection: { anchor: Math.min(pos, view.state.doc.length) } });
    },
    focus(): void {
      view.focus();
    },
    destroy(): void {
      view.destroy();
    },
  };
}
