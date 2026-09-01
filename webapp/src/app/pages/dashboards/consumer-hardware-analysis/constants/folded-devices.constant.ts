/**
 * Rows of the source CSV that describe a *system* built around silicon the file already
 * lists on its own. Keeping both would double-count the same memory bus: a Mac Studio
 * has exactly the M3 Ultra's bandwidth, and "Strix Halo mini-PCs" is the Ryzen AI Max+
 * 395 in a smaller case. They are folded into the chip they contain, and the page says
 * so in its footer rather than dropping them quietly.
 */
export const FOLDED_DEVICE_NAMES: Record<string, string> = {
  'Apple M3 Ultra Mac Studio': 'M3 Ultra',
  'Apple M4 Max Mac Studio': 'M4 Max',
  'AMD Strix Halo mini-PCs': 'Ryzen AI Max+ 395 (Strix Halo)',
};
