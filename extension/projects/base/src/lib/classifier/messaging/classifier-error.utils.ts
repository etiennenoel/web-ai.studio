import { ClassifierSerializedError } from '../interfaces/classifier-serialized-error.interface';

export function serializeClassifierError(error: unknown): ClassifierSerializedError {
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: error.message };
  }
  return { name: 'Error', message: String(error) };
}

/** Rebuilds a DOMException or TypeError so page code can branch on `error.name`. */
export function deserializeClassifierError(error: ClassifierSerializedError): Error {
  if (error.name === 'TypeError') return new TypeError(error.message);
  if (error.name === 'RangeError') return new RangeError(error.message);
  if (error.name === 'Error') return new Error(error.message);
  return new DOMException(error.message, error.name);
}
