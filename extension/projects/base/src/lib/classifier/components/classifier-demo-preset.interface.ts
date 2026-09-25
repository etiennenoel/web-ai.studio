import { ClassifierSchema } from '../interfaces/classifier-schema.interface';

/** A ready-made schema plus sample inputs for the interactive demo. */
export interface ClassifierDemoPreset {
  id: string;
  title: string;
  description: string;
  schema: ClassifierSchema;
  samples: string[];
}
