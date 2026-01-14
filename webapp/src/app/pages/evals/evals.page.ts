import {Component, DOCUMENT, Inject, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {BasePage} from '../base-page';
import {AdvancedForm, AdvancedFormArray, FormFactory} from '@magieno/angular-advanced-forms';
import {EvalsRunOptions} from './evals-run.options';
import {EvalsRow} from './evals.row';
import {InferenceStatusEnum} from '../../enums/inference-status.enum';
import {ApiEnum} from './api.enum';
import {EvalsExecutionEnum} from '../../enums/evals-execution.enum';

@Component({
  selector: 'page-evals',
  templateUrl: './evals.page.html',
  standalone: false,
  styleUrl: './evals.page.scss'
})
export class EvalsPage extends BasePage implements OnInit, OnDestroy {

  form: AdvancedForm<EvalsRunOptions>;

  statusMessage?: string;

  status = EvalsExecutionEnum.Idle;

  constructor(
    private readonly formFactory: FormFactory,
    router: Router,
    route: ActivatedRoute,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    title: Title,
  ) {
    super(document, title)

    this.setTitle("Evals")
    this.form = this.formFactory.create(new EvalsRunOptions());
  }

  override async ngOnInit() {
    super.ngOnInit();
  }

  get rowsAdvancedFormArray(): AdvancedFormArray<EvalsRow> {
    return this.form.formElements.rows as AdvancedFormArray<EvalsRow>;
  }

  async run() {
    this.status = EvalsExecutionEnum.InProgress;

    for(let i = 0; i < this.rowsAdvancedFormArray.formGroups.length; i++) {
      const formRow = this.rowsAdvancedFormArray.formGroups[i];

      formRow.value.status = InferenceStatusEnum.InProgress;

      switch (formRow.value.api) {
        case ApiEnum.Summarizer:
          await this.runSummarizer(formRow.value.context, formRow.value.input, (chunk: string) => {
            formRow.value.output += chunk;
          })
          break;

        case ApiEnum.Prompt:
          await this.runPrompt(formRow.value.context, formRow.value.input, (chunk: string) => {
            formRow.value.output += chunk;
          })
          break;
      }

      formRow.value.status = InferenceStatusEnum.Success;
    }

    this.status = EvalsExecutionEnum.Success;
  }

  async runSummarizer(context: string, input: string, callback: (chunk: string) => void): Promise<string> {
    const session = await Summarizer.create();
    const response = session.summarizeStreaming(input, {context})

    let fullResponse = "";

    for await (const chunk of response) {
      fullResponse += chunk;
      callback(chunk)
    }

    return fullResponse;
  }

  async runPrompt(context: string, input: string, callback: (chunk: string) => void): Promise<string> {
    const session = await LanguageModel.create({
      initialPrompts: [
        {
          role: "system",
          content: context,
        }
      ]
    });
    const response = session.promptStreaming(input, {})

    let fullResponse = "";

    for await (const chunk of response) {
      fullResponse += chunk;
      callback(chunk)
    }

    return fullResponse;
  }

  public onPaste(event: ClipboardEvent, rowIndex: number): void {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    const htmlData = clipboardData?.getData('text/html');

    if (htmlData) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');
      const table = doc.querySelector('table');

      if (table) {
        const rows = Array.from(table.querySelectorAll('tr'));
        const lines: {context: string, input: string, api: string}[] = [];
        rows.forEach(row => {
          const firstCell = row.querySelector('td, th'); // Get first cell (td or th)
          let context = "";
          let input = "";
          let api = "";
          if (firstCell) {
            context = firstCell.textContent?.trim() || '';
          }

          const secondCell = row.querySelector('td:nth-child(2), th:nth-child(2)');
          if (secondCell) {
            input = secondCell.textContent?.trim() || '';
          }

          const thirdCell = row.querySelector('td:nth-child(3), th:nth-child(3)');
          if (thirdCell) {
            api = thirdCell.textContent?.trim() || '';
          }

          lines.push({context, input, api});
        });

        if (lines.length > 0) {
          const evalsRunOptions = new EvalsRunOptions();

          // For subsequent lines, insert new FormGroups
          for (let i = 0; i < lines.length; i++) {
            const evalsRow = new EvalsRow();
            evalsRow.context = lines[i].context;
            evalsRow.input = lines[i].input;
            evalsRow.api = lines[i].api as ApiEnum;

            evalsRunOptions.rows.push(evalsRow)
          }

          // todo: Check if there's existing data in the form.
          this.form.setValue(evalsRunOptions);
        }
        return; // Exit after processing HTML table
      }
    }
  }

  protected readonly InferenceStatusEnum = InferenceStatusEnum;
  protected readonly EvalsExecutionEnum = EvalsExecutionEnum;
}
