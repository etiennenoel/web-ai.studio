import { Attachment } from "../interfaces/attachment.interface";

export class PromptRunOptions {
  systemPrompt: string = '';
  temperature: number = 1;
  topK: number = 3;
  attachments: Attachment[] = [];
  structuredOutputEnabled: boolean = false;
  structuredOutputJsonSchema: string = '';
  prompt: string = '';
  stream: boolean = true;
  expectedInputs?: any[];
}
