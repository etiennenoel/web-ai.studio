export interface WordDiffToken {
  text: string;
  kind: 'match' | 'sub' | 'ins' | 'del';
}

export interface WordDiffResult {
  tokens: WordDiffToken[];
  substitutions: number;
  insertions: number;
  deletions: number;
  /** Word error rate relative to the reference; accuracy = 1 - wer. */
  wer: number;
}

export function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .split(/\s+/)
    .filter(Boolean);
}

/** Word-level alignment via edit distance, backtraced into per-token diff ops. */
export function diffWords(reference: string[], hypothesis: string[]): WordDiffResult {
  const n = reference.length, m = hypothesis.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const substitution = d[i - 1][j - 1] + (reference[i - 1] === hypothesis[j - 1] ? 0 : 1);
      d[i][j] = Math.min(substitution, d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }

  const tokens: WordDiffToken[] = [];
  let i = n, j = m, substitutions = 0, insertions = 0, deletions = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] && reference[i - 1] === hypothesis[j - 1]) {
      tokens.unshift({ text: hypothesis[j - 1], kind: 'match' });
      i--; j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      tokens.unshift({ text: hypothesis[j - 1], kind: 'sub' });
      substitutions++; i--; j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      tokens.unshift({ text: hypothesis[j - 1], kind: 'ins' });
      insertions++; j--;
    } else {
      tokens.unshift({ text: reference[i - 1], kind: 'del' });
      deletions++; i--;
    }
  }

  const wer = n > 0 ? (substitutions + insertions + deletions) / n : 0;
  return { tokens, substitutions, insertions, deletions, wer };
}
