import {
  RewriterFormatEnum,
  RewriterLengthEnum,
  RewriterToneEnum,
  SummarizerFormatEnum,
  SummarizerLengthEnum,
  SummarizerTypeEnum,
  WriterFormatEnum,
  WriterLengthEnum,
  WriterToneEnum
} from '../enums/writing-assistance.enums';
import { LocaleEnum } from '../enums/locale.enum';

export interface WritingAssistanceOptions {
  // Common
  sharedContext?: string;
  context?: string;
  expectedInputLanguages?: LocaleEnum[];
  expectedContextLanguages?: LocaleEnum[];
  outputLanguage?: LocaleEnum;

  // Summarizer
  summarizerType?: SummarizerTypeEnum;
  summarizerFormat?: SummarizerFormatEnum;
  summarizerLength?: SummarizerLengthEnum;

  // Writer
  writerTone?: WriterToneEnum;
  writerFormat?: WriterFormatEnum;
  writerLength?: WriterLengthEnum;

  // Rewriter
  rewriterTone?: RewriterToneEnum;
  rewriterFormat?: RewriterFormatEnum;
  rewriterLength?: RewriterLengthEnum;
}
