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

export interface WritingAssistanceOptions {
  // Common
  sharedContext?: string;
  context?: string;

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
