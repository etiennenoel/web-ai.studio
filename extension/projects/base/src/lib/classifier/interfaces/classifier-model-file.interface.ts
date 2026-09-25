import { ClassifierModelFileRole } from '../enums/classifier-model-file-role.enum';

export interface ClassifierModelFile {
  role: ClassifierModelFileRole;
  /** Path inside the Hugging Face repository. */
  path: string;
  bytes: number;
}
