import { ClassifierSerializedError } from './classifier-serialized-error.interface';

export interface ClassifierRuntimeResponse<T = unknown> {
  ok: boolean;
  value?: T;
  error?: ClassifierSerializedError;
}
