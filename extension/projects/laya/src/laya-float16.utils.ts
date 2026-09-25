/** Converts one IEEE 754 half-precision value (as uint16 bits) to a JavaScript number. */
export function float16BitsToNumber(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const fraction = bits & 0x03ff;
  if (exponent === 0) {
    return sign * Math.pow(2, -14) * (fraction / 1024);
  }
  if (exponent === 0x1f) {
    return fraction === 0 ? sign * Infinity : NaN;
  }
  return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}
