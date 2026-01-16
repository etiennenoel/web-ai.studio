import { AttachmentTypeEnum } from "../enums/attachment-type.enum";
import { FramingAlgorithm } from "../enums/framing-algorithm.enum";
import { SafeUrl } from "@angular/platform-browser";

export interface Attachment {
  id: string;
  type: AttachmentTypeEnum;
  file: File;
  content: Blob | File;
  safeUrl: SafeUrl;
  mimeType: string;
  width?: number;
  height?: number;
  framingAlgorithm?: FramingAlgorithm;
}
