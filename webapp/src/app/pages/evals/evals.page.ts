import {Component, DOCUMENT, Inject, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {BasePage} from '../base-page';
import {FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl} from '@angular/forms';
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

  form: FormGroup;

  statusMessage?: string;

  status = EvalsExecutionEnum.Idle;

  previewImageSrc: string | null = null;

  showResetConfirmation: boolean = false;
  pendingAudioFiles: File[] = [];

  constructor(
    private readonly fb: FormBuilder,
    router: Router,
    route: ActivatedRoute,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    title: Title,
  ) {
    super(document, title)

    this.setTitle("Evals")
    this.form = this.fb.group({
      rows: this.fb.array([this.createRow()])
    });
  }

  override async ngOnInit() {
    super.ngOnInit();
  }

  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  createRow(data?: {context?: string, input?: string, api?: ApiEnum, images?: string[], audio?: string[]}): FormGroup {
    return this.fb.group({
      api: [data?.api || ApiEnum.Prompt],
      context: [data?.context || ''],
      input: [data?.input || ''],
      images: [data?.images || []],
      audio: [data?.audio || []],
      status: [InferenceStatusEnum.Idle],
      output: ['']
    });
  }

  async run() {
    this.status = EvalsExecutionEnum.InProgress;

    for(let i = 0; i < this.rows.length; i++) {
      const formRow = this.rows.at(i) as FormGroup;

      formRow.patchValue({status: InferenceStatusEnum.InProgress});

      try {
        switch (formRow.value.api) {
          case ApiEnum.Summarizer:
            await this.runSummarizer(formRow.value.context, formRow.value.input, (chunk: string) => {
              const currentOutput = formRow.value.output || '';
              formRow.patchValue({output: currentOutput + chunk});
            })
            break;

          case ApiEnum.Prompt:
            await this.runPrompt(formRow.value.context, formRow.value.input, formRow.value.images, formRow.value.audio, (chunk: string) => {
              const currentOutput = formRow.value.output || '';
              formRow.patchValue({output: currentOutput + chunk});
            })
            break;
        }
        formRow.patchValue({status: InferenceStatusEnum.Success});
      } catch (e) {
        console.error(e);
        formRow.patchValue({status: InferenceStatusEnum.Error});
      }
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

  async runPrompt(context: string, input: string, images: string[], audio: string[], callback: (chunk: string) => void): Promise<string> {
    const sessionCreationOptions: any = {
      initialPrompts: [
        {
          role: "system",
          content: context,
        }
      ],
      expectedInputs: []
    };

    if(images && images.length > 0) {
      sessionCreationOptions.expectedInputs.push({type: "image"});
    }

    if(audio && audio.length > 0) {
      sessionCreationOptions.expectedInputs.push({type: "audio"});
    }

    const session = await LanguageModel.create(sessionCreationOptions);

    let promptInput: any = input;
    if ((images && images.length > 0) || (audio && audio.length > 0)) {
      promptInput = [{ type: "text", value: input }];
      if (images) {
        for (const img of images) {
          const blob = await (await fetch(img)).blob();
          promptInput.push({ type: "image", value: blob });
        }
      }
      if (audio) {
        for (const aud of audio) {
          const blob = await (await fetch(aud)).blob();
          promptInput.push({ type: "audio", value: blob });
        }
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

  public onAudioFilesDropped(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.pendingAudioFiles = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
      
      // Check if there is any data in the first row or if there are multiple rows
      const firstRow = this.rows.at(0).value;
      const hasData = firstRow.context || firstRow.input || firstRow.images.length > 0 || firstRow.audio.length > 0;
      
      if (this.rows.length > 1 || hasData) {
         this.showResetConfirmation = true;
      } else {
        this.processAudioFiles();
      }
    }
  }

  public processAudioFiles() {
    this.rows.clear();

    this.pendingAudioFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        this.rows.push(this.createRow({audio: [base64]}));
      };
      reader.readAsDataURL(file);
    });

    this.pendingAudioFiles = [];
    this.showResetConfirmation = false;
  }

  public cancelReset() {
    this.pendingAudioFiles = [];
    this.showResetConfirmation = false;
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
              const formRow = this.rows.at(rowIndex);
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
        const tableRows = Array.from(table.querySelectorAll('tr'));
        const lines: {context: string, input: string, api: string, images: string[]}[] = [];
        tableRows.forEach(row => {
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
          for (let i = 0; i < lines.length; i++) {
            if (i < this.rows.length) {
              const formRow = this.rows.at(i);
              formRow.patchValue({
                context: lines[i].context,
                input: lines[i].input,
                api: lines[i].api as ApiEnum,
                images: lines[i].images
              });
            } else {
              this.rows.push(this.createRow({
                context: lines[i].context,
                input: lines[i].input,
                api: lines[i].api as ApiEnum,
                images: lines[i].images
              }));
            }
          }
        }
        return; 
      }
    }
  }

  public onFileDropped(event: DragEvent, rowIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const formRow = this.rows.at(rowIndex);
      
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const file = event.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const newImages = formRow.value.images || [];
            formRow.patchValue({images: [...newImages, base64]});
          };
          reader.readAsDataURL(file);
        } else if (file.type.startsWith('audio/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const newAudio = formRow.value.audio || [];
            formRow.patchValue({audio: [...newAudio, base64]});
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
      const formRow = this.rows.at(rowIndex);

      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const newImages = formRow.value.images || [];
            formRow.patchValue({images: [...newImages, base64]});
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  public selectAudio(event: Event, rowIndex: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const formRow = this.rows.at(rowIndex);

      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.type.startsWith('audio/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const newAudio = formRow.value.audio || [];
            formRow.patchValue({audio: [...newAudio, base64]});
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  public removeImage(rowIndex: number, imageIndex: number) {
    const formRow = this.rows.at(rowIndex);
    const currentImages = formRow.value.images || [];
    currentImages.splice(imageIndex, 1);
    formRow.patchValue({images: currentImages});
  }

  public removeAudio(rowIndex: number, audioIndex: number) {
    const formRow = this.rows.at(rowIndex);
    const currentAudio = formRow.value.audio || [];
    currentAudio.splice(audioIndex, 1);
    formRow.patchValue({audio: currentAudio});
  }

  public previewImage(imageSrc: string) {
    this.previewImageSrc = imageSrc;
  }

  public closePreview() {
    this.previewImageSrc = null;
  }

  public removeRow(index: number) {
    this.rows.removeAt(index);
  }

  public addRow() {
    this.rows.push(this.createRow());
  }

  protected readonly InferenceStatusEnum = InferenceStatusEnum;
  protected readonly EvalsExecutionEnum = EvalsExecutionEnum;
  protected readonly ApiEnum = ApiEnum;
}
