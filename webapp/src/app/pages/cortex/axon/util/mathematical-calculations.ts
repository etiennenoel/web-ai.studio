export class MathematicalCalculations {
  static calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) {
      return 0;
    }
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum / numbers.length;
  }

  static calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) {
      return 0;
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }
}
