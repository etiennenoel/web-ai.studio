import { Injectable } from '@angular/core';
import { WritingAssistanceApiEnum } from '../enums/writing-assistance-api.enum';

@Injectable({
  providedIn: 'root'
})
export class WritingAssistanceService {
  private session: any;

  async checkAvailability(api: WritingAssistanceApiEnum): Promise<string> {
    try {
      // @ts-ignore
      if (api === WritingAssistanceApiEnum.SummarizerApi && window.ai?.summarizer) {
        // @ts-ignore
        return await window.ai.summarizer.capabilities().then(c => c.available);
      }
      // @ts-ignore
      if (api === WritingAssistanceApiEnum.WriterApi && window.ai?.writer) {
        // @ts-ignore
        return await window.ai.writer.availability();
      }
      // @ts-ignore
      if (api === WritingAssistanceApiEnum.RewriterApi && window.ai?.rewriter) {
        // @ts-ignore
        return await window.ai.rewriter.availability();
      }
      return 'unavailable';
    } catch (e) {
      return 'unavailable';
    }
  }

  async run(api: WritingAssistanceApiEnum, input: string, options?: any): Promise<string> {
    if (this.session) {
      this.session.destroy();
    }

    try {
      if (api === WritingAssistanceApiEnum.SummarizerApi) {
        // @ts-ignore
        this.session = await window.ai.summarizer.create(options);
        return await this.session.summarize(input);
      } else if (api === WritingAssistanceApiEnum.WriterApi) {
        // @ts-ignore
        this.session = await window.ai.writer.create(options);
        return await this.session.write(input);
      } else if (api === WritingAssistanceApiEnum.RewriterApi) {
        // @ts-ignore
        this.session = await window.ai.rewriter.create(options);
        return await this.session.rewrite(input, options);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
    return '';
  }

  cancel() {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
