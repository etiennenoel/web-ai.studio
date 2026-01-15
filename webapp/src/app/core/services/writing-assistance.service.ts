import { Injectable } from '@angular/core';
import { WritingAssistanceApiEnum } from '../enums/writing-assistance-api.enum';
import { WritingAssistanceOptions } from '../models/writing-assistance-options.model';

declare const Summarizer: any;
declare const Writer: any;
declare const Rewriter: any;

@Injectable({
  providedIn: 'root'
})
export class WritingAssistanceService {
  private session: any;

  async checkAvailability(api: WritingAssistanceApiEnum): Promise<string> {
    try {
      if (api === WritingAssistanceApiEnum.SummarizerApi && "Summarizer" in self) {
        return await Summarizer.availability();
      }
      if (api === WritingAssistanceApiEnum.WriterApi && "Writer" in self) {
        return await Writer.availability();
      }
      if (api === WritingAssistanceApiEnum.RewriterApi && "Rewriter" in self) {
        return await Rewriter.availability();
      }
      return 'unavailable';
    } catch (e) {
      return 'unavailable';
    }
  }

  async runStreaming(api: WritingAssistanceApiEnum, input: string, options: WritingAssistanceOptions, onChunk: (chunk: string, full: string) => void): Promise<string> {
    if (this.session) {
      try {
        this.session.destroy();
      } catch (e) {
        console.warn('Error destroying session', e);
      }
    }

    try {
      let stream: ReadableStream;
      const context = options.context;
      const sharedContext = options.sharedContext;

      if (api === WritingAssistanceApiEnum.SummarizerApi) {
        this.session = await Summarizer.create({
          sharedContext,
          type: options.summarizerType,
          format: options.summarizerFormat,
          length: options.summarizerLength
        });
        stream = await this.session.summarizeStreaming(input, { context });
      } else if (api === WritingAssistanceApiEnum.WriterApi) {
        this.session = await Writer.create({
          sharedContext,
          tone: options.writerTone,
          format: options.writerFormat,
          length: options.writerLength
        });
        stream = await this.session.writeStreaming(input, { context });
      } else if (api === WritingAssistanceApiEnum.RewriterApi) {
        this.session = await Rewriter.create({
          sharedContext,
          tone: options.rewriterTone,
          format: options.rewriterFormat,
          length: options.rewriterLength
        });
        stream = await this.session.rewriteStreaming(input, { context });
      } else {
        throw new Error('Unknown API');
      }

      let fullText = '';
      const reader = stream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += value;
          onChunk(value, fullText);
        }
      } finally {
        reader.releaseLock();
      }

      return fullText;

    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async run(api: WritingAssistanceApiEnum, input: string, options: WritingAssistanceOptions): Promise<string> {
     // Fallback to streaming implementation but just return final result if needed, 
     // but to match existing non-streaming signature:
     return this.runStreaming(api, input, options, () => {});
  }

  cancel() {
    if (this.session) {
      try {
        this.session.destroy();
      } catch (e) {
        console.warn('Error destroying session', e);
      }
      this.session = null;
    }
  }
}
