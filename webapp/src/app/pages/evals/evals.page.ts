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

  previewImageSrc: string | null = null;

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
          await this.runPrompt(formRow.value.context, formRow.value.input, formRow.value.images, (chunk: string) => {
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

  async runPrompt(context: string, input: string, images: string[], callback: (chunk: string) => void): Promise<string> {
    const sessionCreationOptions: any = {
      initialPrompts: [
        {
          role: "system",
          content: context,
        }
      ]
    };

    if(images && images.length > 0) {
      sessionCreationOptions["expectedInputs"] = [{type: "image"}];
    }

    const session = await LanguageModel.create(sessionCreationOptions);

    let promptInput: any = input;
    if (images && images.length > 0) {
      promptInput = [{ type: "text", value: input }];
      for (const img of images) {
        const blob = await (await fetch(img)).blob();
        promptInput.push({ type: "image", value: blob });
      }
    }

    const response = session.promptStreaming([{"role":"user","content":promptInput}], {})

    let fullResponse = "";

    for await (const chunk of response) {
      fullResponse += chunk;
      callback(chunk)
    }

    return fullResponse;
  }

  public onPaste(event: ClipboardEvent, rowIndex: number): void {
    const clipboardData = event.clipboardData;
    const items = clipboardData?.items;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          event.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              const formRow = this.rowsAdvancedFormArray.formGroups[rowIndex];
              const currentImages = formRow.value.images || [];
              formRow.patchValue({images: [...currentImages, base64]});
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    }

    const htmlData = clipboardData?.getData('text/html');

    if (htmlData) {
      event.preventDefault();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');
      const table = doc.querySelector('table');

      if (table) {
        const rows = Array.from(table.querySelectorAll('tr'));
        const lines: {context: string, input: string, api: string, images: string[]}[] = [];
        rows.forEach(row => {
          const firstCell = row.querySelector('td, th'); 
          let context = "";
          let input = "";
          let api = "";
          let images: string[] = [];

          if (firstCell) {
            context = firstCell.textContent?.trim() || '';
          }

          const secondCell = row.querySelector('td:nth-child(2), th:nth-child(2)');
          if (secondCell) {
            input = secondCell.textContent?.trim() || '';
          }

          const thirdCell = row.querySelector('td:nth-child(3), th:nth-child(3)');
          if (thirdCell) {
             const imgs = Array.from(thirdCell.querySelectorAll('img'));
             imgs.forEach(img => {
               if (img.src.startsWith('data:image')) {
                 images.push(img.src);
               }
             });
          }
          
          const fourthCell = row.querySelector('td:nth-child(4), th:nth-child(4)');
          if (fourthCell) {
            api = fourthCell.textContent?.trim() || '';
          }

          lines.push({context, input, api, images});
        });

        if (lines.length > 0) {
          const evalsRunOptions = new EvalsRunOptions();

          // For subsequent lines, insert new FormGroups
          for (let i = 0; i < lines.length; i++) {
            const evalsRow = new EvalsRow();
            evalsRow.context = lines[i].context;
            evalsRow.input = lines[i].input;
            evalsRow.api = lines[i].api as ApiEnum;
            evalsRow.images = lines[i].images;

            evalsRunOptions.rows.push(evalsRow)
          }

          this.form.setValue(evalsRunOptions);
        }
        return; 
      }
    }
  }

  public onFileDropped(event: DragEvent, rowIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const formRow = this.rowsAdvancedFormArray.formGroups[rowIndex];
      const currentImages = formRow.value.images || [];
      
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const file = event.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            // Append to array, need to be careful with async loop, but for UI it's mostly fine
            // Better to accumulate and patch once, but this is simple enough
            const newImages = this.rowsAdvancedFormArray.formGroups[rowIndex].value.images || [];
            this.rowsAdvancedFormArray.formGroups[rowIndex].patchValue({images: [...newImages, base64]});
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  public onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  public selectImage(event: Event, rowIndex: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const formRow = this.rowsAdvancedFormArray.formGroups[rowIndex];
      const currentImages = formRow.value.images || [];

      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const newImages = this.rowsAdvancedFormArray.formGroups[rowIndex].value.images || [];
            this.rowsAdvancedFormArray.formGroups[rowIndex].patchValue({images: [...newImages, base64]});
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  public removeImage(rowIndex: number, imageIndex: number) {
    const formRow = this.rowsAdvancedFormArray.formGroups[rowIndex];
    const currentImages = formRow.value.images || [];
    currentImages.splice(imageIndex, 1);
    formRow.patchValue({images: currentImages});
  }

  public previewImage(imageSrc: string) {
    this.previewImageSrc = imageSrc;
  }

  public closePreview() {
    this.previewImageSrc = null;
  }

  protected readonly InferenceStatusEnum = InferenceStatusEnum;
  protected readonly EvalsExecutionEnum = EvalsExecutionEnum;
}
