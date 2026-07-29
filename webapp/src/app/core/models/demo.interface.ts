import {PromptRunOptions} from './prompt-run.options';
import {AttachmentTypeEnum} from '../enums/attachment-type.enum';
import {DemoPreview} from './demo-preview.interface';

export type DemoCategory = 'Text Input' | 'Image Input' | 'Audio Input' | 'Tools Calling' | 'Mix-and-Match' | 'Embeddings' | 'Speech';

export type DemoApi =
  | 'Prompt API'
  | 'Semantic Embedder'
  | 'Web Speech'
  | 'Translator'
  | 'Language Detector'
  | 'Summarizer'
  | 'Writer'
  | 'Rewriter'
  | 'Proofreader';

export interface DemoExample {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  apis: DemoApi[];
  icon: string;
  onDeviceReason: string;
  codeSnippet: string;

  /** Hand-authored sample of what the demo produces, shown on the listing card. */
  preview?: DemoPreview;
  
  // To power the execution
  promptRunOptions: Partial<PromptRunOptions>;
  initialPrompt: string; // the string that populates the input textarea
  
  // (Optional) initial attachments mock to show UI elements, like empty state or required file type
  requiredAttachmentTypes?: AttachmentTypeEnum[];
}