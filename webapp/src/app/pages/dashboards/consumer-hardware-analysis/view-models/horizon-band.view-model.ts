/** A speed band drawn as a horizontal stripe behind the lines. */
export interface HorizonBandViewModel {
  y: number;
  height: number;

  /** Step of the speed ramp. */
  rampStep: number;

  name: string;

  /** False when the stripe is too thin to hold its name. */
  showLabel: boolean;
}
