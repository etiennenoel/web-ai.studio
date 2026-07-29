import { Component, OnInit, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-screenshot-to-code-demo',
  templateUrl: './screenshot-to-code-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ScreenshotToCodeDemoComponent extends BaseDemoComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);

  demo = DEMOS_DATA.find(d => d.id === 'screenshot-to-code')!;

  imageUrl: string | null = null;
  generatedHtml = '';
  renderedHtml: SafeHtml | null = null;
  showCode = false;
  errorMessage = '';

  private imageBitmap: ImageBitmap | null = null;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkAvailability([{ type: 'image' }]);
  }

  get statusPills() {
    return [{ name: 'Prompt API (image)', status: this.languageModelAvailability }];
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      this.imageBitmap = await createImageBitmap(file);
      this.imageUrl = URL.createObjectURL(file);
      this.generatedHtml = '';
      this.renderedHtml = null;
    } catch (e: any) {
      this.errorMessage = 'Could not read that file as an image.';
    }
  }

  /** Draws a sample "sign-in card" mockup so the demo works with zero assets. */
  async useSampleScreenshot() {
    const canvas = this.document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 420;
    const ctx = canvas.getContext('2d')!;

    // Page background + card
    ctx.fillStyle = '#eef2f7';
    ctx.fillRect(0, 0, 480, 420);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    (ctx as any).roundRect(60, 40, 360, 340, 16);
    ctx.fill();

    // Title + subtitle
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Welcome back', 100, 100);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText('Sign in to your account', 100, 126);

    // Inputs
    for (const [label, y] of [['Email', 160], ['Password', 230]] as [string, number][]) {
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(label, 100, y);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      (ctx as any).roundRect(100, y + 10, 280, 40, 8);
      ctx.stroke();
    }

    // Button
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    (ctx as any).roundRect(100, 310, 280, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sign in', 240, 338);
    ctx.textAlign = 'left';

    this.imageBitmap = await createImageBitmap(canvas);
    this.imageUrl = canvas.toDataURL('image/png');
    this.generatedHtml = '';
    this.renderedHtml = null;
  }

  async generate() {
    if (!this.imageBitmap || this.state === PromptInputStateEnum.Inferencing) return;
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable in this browser.';
      return;
    }

    this.state = PromptInputStateEnum.Inferencing;
    this.generatedHtml = '';
    this.renderedHtml = null;
    this.errorMessage = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    try {
      const session = await LanguageModel.create({
        expectedInputs: [{ type: 'image' }],
        systemPrompt:
          'You convert UI screenshots into clean, semantic HTML that reproduces the layout as closely as possible. ' +
          'Use ONLY inline CSS styles (no classes, no external stylesheets, no scripts). ' +
          'Output ONLY the HTML markup — no explanations, no markdown fences.'
      });

      const stream = session.promptStreaming([{
        role: 'user',
        content: [
          { type: 'text', value: 'Rebuild this UI as HTML with inline styles.' },
          { type: 'image', value: this.imageBitmap }
        ]
      }], { signal: this.abortController.signal });

      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.generatedHtml += chunk;
      }
      this.totalTime = Math.round(performance.now() - startTime);
      session.destroy?.();

      this.renderResult();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'Generation failed.';
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  private renderResult() {
    // Strip markdown fences if the model added them despite instructions.
    const html = this.generatedHtml
      .replace(/^```(?:html)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    this.generatedHtml = html;
    // Rendered inside a sandboxed iframe (no scripts, no same-origin access).
    this.renderedHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
