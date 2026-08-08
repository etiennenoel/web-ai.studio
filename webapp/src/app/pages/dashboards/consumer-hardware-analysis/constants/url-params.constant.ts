/**
 * Query-parameter names for the shareable view. Short, because several of them carry
 * lists, and stable, because they end up in URLs people paste to each other.
 */
export const URL_PARAMS = {
  mode: 'task',
  tab: 'view',
  year: 'year',
  modelled: 'modelled',
  advanced: 'tuner',
  bandLows: 'bands',
  /** Only written when the reader has left a band's ceiling disagreeing with its neighbour. */
  bandHighs: 'bandsTo',
  context: 'ctx',
  realised: 'realised',
  overhead: 'overhead',
  audioTokens: 'asrTok',
  flopPerByte: 'flopByte',
  grouping: 'group',
  matrixFilter: 'only',
  matrixSearch: 'q',
  explorerSearch: 'dq',
  sort: 'sort',
  horizonClass: 'size',
  horizonYears: 'years',
  horizonCategories: 'cats',
} as const;
