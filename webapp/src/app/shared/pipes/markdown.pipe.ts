import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

@Pipe({
  name: 'render_markdown',
  standalone: false
})
export class MarkdownPipe implements PipeTransform {
  async transform(value: string): Promise<string> {
    if (!value) return '';
    return marked(value);
  }
}
