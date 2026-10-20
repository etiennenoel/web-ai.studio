import { Attachment } from "../interfaces/attachment.interface";

export type LanguageModelSamplingMode =
  | 'most-predictable'
  | 'predictable'
  | 'slightly-predictable'
  | 'balanced'
  | 'slightly-creative'
  | 'creative'
  | 'most-creative';

export const PROMPT_SAMPLING_MODES: { value: LanguageModelSamplingMode; label: string; description: string }[] = [
  {
    value: 'most-predictable',
    label: 'Most Predictable ("most-predictable")',
    description: 'Strict consistency, reproducibility, and speculative decoding'
  },
  {
    value: 'predictable',
    label: 'Predictable ("predictable")',
    description: 'Focused outputs with minimal variation'
  },
  {
    value: 'slightly-predictable',
    label: 'Slightly Predictable ("slightly-predictable")',
    description: 'Focused outputs with a bit more variation than predictable'
  },
  {
    value: 'balanced',
    label: 'Balanced ("balanced" - Default)',
    description: 'Standard preset for most conversational interactions'
  },
  {
    value: 'slightly-creative',
    label: 'Slightly Creative ("slightly-creative")',
    description: 'Creative outputs slightly more focused than creative'
  },
  {
    value: 'creative',
    label: 'Creative ("creative")',
    description: 'Variety and creativity preferred over strict reproducibility'
  },
  {
    value: 'most-creative',
    label: 'Most Creative ("most-creative")',
    description: 'Maximum diversity of output and creative brainstorming'
  }
];

export class PromptRunOptions {
  systemPrompt: string = '';
  samplingMode: LanguageModelSamplingMode = 'balanced';
  /** @deprecated Restricted to web extension contexts; use samplingMode instead. */
  temperature: number | null = null;
  /** @deprecated Restricted to web extension contexts; use samplingMode instead. */
  topK: number | null = null;
  attachments: Attachment[] = [];
  structuredOutputEnabled: boolean = false;
  structuredOutputJsonSchema: string = '';
  prompt: string = '';
  stream: boolean = true;
  expectedInputs?: any[];
}
