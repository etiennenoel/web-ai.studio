import { Injectable } from '@angular/core';
import { WritingAssistanceApiEnum } from '../enums/writing-assistance-api.enum';

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

  async run(api: WritingAssistanceApiEnum, input: string, options?: any): Promise<string> {
    if (this.session) {
      this.session.destroy();
    }

    try {
      if (api === WritingAssistanceApiEnum.SummarizerApi) {
        this.session = await Summarizer.create(options);
        return await this.session.summarize(input);
      } else if (api === WritingAssistanceApiEnum.WriterApi) {
        this.session = await Writer.create(options);
        return await this.session.write(input);
      } else if (api === WritingAssistanceApiEnum.RewriterApi) {
        this.session = await Rewriter.create(options);
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
