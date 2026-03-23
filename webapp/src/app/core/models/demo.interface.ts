import {PromptRunOptions} from './prompt-run.options';
import {AttachmentTypeEnum} from '../enums/attachment-type.enum';

export type DemoCategory = 'Text Input' | 'Image Input' | 'Audio Input' | 'Tools Calling' | 'Mix-and-Match';

export interface DemoExample {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  icon: string;
  onDeviceReason: string;
  codeSnippet: string;
  
  // To power the execution
  promptRunOptions: Partial<PromptRunOptions>;
  initialPrompt: string; // the string that populates the input textarea
  
  // (Optional) initial attachments mock to show UI elements, like empty state or required file type
  requiredAttachmentTypes?: AttachmentTypeEnum[];
}