import { Component, Input } from '@angular/core';
import { HistoryItem } from '../../interfaces/data/history-item.interface';
import { ToastService } from 'base';

@Component({
  selector: 'app-history-list',
  templateUrl: './history-list.component.html',
  styleUrls: ['./history-list.component.scss'],
  standalone: false
})
export class HistoryListComponent {
  @Input() history: HistoryItem[] = [];
  @Input() apiClassName: string = 'LanguageModel';
  @Input() methodName: string = 'prompt';

  expandedItems = new Set<string>();

  constructor(private toastService: ToastService) {}

  toggleDetails(id: string) {
    if (this.expandedItems.has(id)) {
      this.expandedItems.delete(id);
    } else {
      this.expandedItems.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedItems.has(id);
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.toastService.show('Code copied to clipboard.');
    });
  }

  reportBug(id: string) {
    this.toastService.show(`Bug report for ${id} generated.`, 'error');
  }

  generateCodeSnippet(item: HistoryItem): string {
    const escapedPrompt = item.prompt.replace(/"/g, '\\"');
    const temperature = item.params?.temperature ?? 'undefined';
    const topK = item.params?.topK ?? 'undefined';

    return `// Configuration
const params = {
  temperature: ${temperature},
  topK: ${topK}
};

// Execution
const session = await ${this.apiClassName}.create(params);
const result = await session.${this.methodName}("${escapedPrompt}");
console.log(result);
`;
  }
}
