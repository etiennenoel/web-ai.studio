import { Component, Inject, PLATFORM_ID, Directive } from '@angular/core';
import { BasePage } from '../../../base-page';
import { Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { PromptInputStateEnum } from '../../../../core/enums/prompt-input-state.enum';
import { Message } from '../../../../core/services/conversation.manager';
import { PromptRunOptions } from '../../../../core/models/prompt-run.options';

declare const LanguageModel: any;

@Directive()
export abstract class BaseDemoComponent extends BasePage {
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;
  capabilities = { available: false, audio: false, image: false, text: false };
  languageModelAvailability: string = 'loading...';
  
  messages: Message[] = [];
  
  ttft: number | null = null;
  totalTime: number | null = null;
  
  currentPromptText = "";
  
  protected abortController: AbortController | null = null;

  constructor(
    @Inject(DOCUMENT) document: Document,
    title: Title,
    @Inject(PLATFORM_ID) protected platformId: Object
  ) {
    super(document, title);
  }

  async checkAvailability(expectedInputs: any[] = [{ type: "text", languages: ["en"] }]) {
    if (isPlatformServer(this.platformId)) return;

    try {
      if ('LanguageModel' in self) {
        const availability = await LanguageModel.availability({ expectedInputs });
        
        this.languageModelAvailability = availability;
        
        if (availability !== 'unavailable') {
          this.capabilities.available = true;
          this.capabilities.text = true;
          this.capabilities.image = expectedInputs.some((i: any) => i.type === 'image');
          this.capabilities.audio = expectedInputs.some((i: any) => i.type === 'audio');
        }
      } else {
        this.languageModelAvailability = 'unavailable';
      }
    } catch (e) {
      console.error(e);
      this.languageModelAvailability = 'unavailable';
    }
  }

  async runPrompt(options: PromptRunOptions, systemPrompt?: string, expectedInputs?: any[]) {
    if (!this.capabilities.available) return;
    
    this.messages = [{ role: 'user', content: options.prompt, attachments: options.attachments }];
    this.state = PromptInputStateEnum.Inferencing;
    this.ttft = null;
    this.totalTime = null;
    
    this.abortController = new AbortController();
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: systemPrompt,
        temperature: options.temperature,
        topK: options.topK,
        expectedInputs: expectedInputs
      });

      let promptInput: any = options.prompt;
      
      if (options.attachments && options.attachments.length > 0) {
        let content: any[] = [];
        if (options.prompt && options.prompt.trim() !== "") {
           content.push({ type: "text", value: options.prompt });
        }
        
        for (const pt of options.attachments) {
           if (pt.type === 'image') {
              const bmp = await createImageBitmap(pt.file);
              content.push({ type: "image", value: bmp });
           } else if (pt.type === 'audio') {
              content.push({ type: "audio", value: pt.file });
           }
        }
        promptInput = [{ role: "user", content: content }];
      }

      this.messages.push({ role: 'model', content: '' });

      if (options.structuredOutputEnabled && options.structuredOutputJsonSchema) {
         const response = await session.prompt(promptInput, {
            signal: this.abortController.signal,
            responseConstraint: JSON.parse(options.structuredOutputJsonSchema)
         });
         
         firstTokenTime = performance.now();
         this.ttft = Math.round(firstTokenTime - startTime);
         
         this.messages[1].content = response;
      } else {
         const stream = session.promptStreaming(promptInput, {
           signal: this.abortController.signal
         });
         
         for await (const chunk of stream) {
           if (!firstTokenTime) {
             firstTokenTime = performance.now();
             this.ttft = Math.round(firstTokenTime - startTime);
           }
           this.messages[1].content += chunk;
         }
      }

      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
      this.state = PromptInputStateEnum.Ready;

    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.messages[1].content = 'Error executing prompt: ' + e.message;
      }
      this.state = PromptInputStateEnum.Ready;
    } finally {
      this.abortController = null;
    }
  }

  onCancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
