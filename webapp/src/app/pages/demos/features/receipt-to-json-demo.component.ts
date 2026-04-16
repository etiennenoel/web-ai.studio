import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-receipt-to-json-demo',
  templateUrl: './receipt-to-json-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ReceiptToJsonDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'receipt-to-json')!;
  
  extractedJson = '';
  
  isDragging = false;
  imageFile: File | null = null;
  imageUrl: string | null = null;
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    await this.checkAvailability([{ type: "image" }]);
  }

  get dynamicCodeSnippet() {
    return `const schema = ${this.demo.promptRunOptions.structuredOutputJsonSchema};

const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }]
});

const result = await session.prompt([
  { role: "user", content: [
    { type: "text", value: "${this.demo.initialPrompt}" },
    { type: "image", value: receiptImage }
  ]}
], { responseConstraint: schema });

console.log(JSON.parse(result));`;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.type.startsWith('image/')) {
      this.imageFile = file;
      this.imageUrl = URL.createObjectURL(file);
    }
  }

  clearImage() {
    this.imageFile = null;
    this.imageUrl = null;
  }

  async extractReceipt() {
    if (!this.imageFile) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.extractedJson = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        expectedInputs: [{ type: "image" }]
      });
      
      const bmp = await createImageBitmap(this.imageFile);
      const parsedSchema = JSON.parse(this.demo.promptRunOptions.structuredOutputJsonSchema || '{}');
      
      const promptInput = [{
        role: "user",
        content: [
          { type: "image", value: bmp },
          { type: "text", value: this.demo.initialPrompt }
        ]
      }];
      
      const result = await session.prompt(promptInput, { 
        signal: this.abortController.signal,
        responseConstraint: parsedSchema
      });
      
      firstTokenTime = performance.now();
      this.ttft = Math.round(firstTokenTime - startTime);
      
      try {
        this.extractedJson = JSON.stringify(JSON.parse(result), null, 2);
      } catch (e) {
        this.extractedJson = result;
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.extractedJson = '// Error parsing data:\n// ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelGenerate() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
