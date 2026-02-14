import { Attachment } from "../interfaces/attachment.interface";

export class PromptRunOptions {
  systemPrompt: string = '';
  temperature: number = 0.7;
  topK: number = 40;
  attachments: Attachment[] = [];
  structuredOutputEnabled: boolean = false;
  structuredOutputJsonSchema: string = '';
  prompt: string = '';
  stream: boolean = true;
}
