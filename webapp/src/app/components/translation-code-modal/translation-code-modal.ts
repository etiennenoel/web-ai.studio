import {Component, DOCUMENT, Inject, Input, OnInit} from '@angular/core';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import {FormControl} from '@angular/forms';
import {BaseComponent} from '../base.component';
import {LocaleInterface} from '../../interfaces/locale.interface';

@Component({
  selector: 'app-translation-code-modal',
  standalone: false,
  templateUrl: './translation-code-modal.html',
  styleUrl: './translation-code-modal.scss'
})
export class TranslationCodeModal extends BaseComponent implements OnInit {
  @Input()
  sourceLanguage?: LocaleInterface;

  @Input()
  targetLanguage?: LocaleInterface;

  code: string = "";

  languageFormControl = new FormControl<"typescript" | "javascript">("javascript");

  constructor(
    @Inject(DOCUMENT) document: Document,
    public dialogRef: DialogRef<TranslationCodeModal>,
    @Inject(DIALOG_DATA) public data: { sourceLanguage?: LocaleInterface, targetLanguage?: LocaleInterface }
  ) {
    super(document);
    if(data) {
      this.sourceLanguage = data.sourceLanguage;
      this.targetLanguage = data.targetLanguage;
    }
  }

  override ngOnInit() {
    super.ngOnInit();

    this.updateCode();
    this.subscriptions.push(this.languageFormControl.valueChanges.subscribe(() => {
      this.updateCode();
    }));
  }

  updateCode() {
    const isTs = this.languageFormControl.value === "typescript";
    const src = this.sourceLanguage ? `"${this.sourceLanguage.code}"` : 'null';
    const tgt = this.targetLanguage ? `"${this.targetLanguage.code}"` : '"es"';

    const detectSnippet = !this.sourceLanguage ? `
  // Detect language if source is unknown
  const detector = await ${isTs ? '(self as any).' : ''}LanguageDetector.create();
  const detectionResult = await detector.detect(textToTranslate);
  const detectedSource = detectionResult[0].detectedLanguage;

  if (detectedSource === 'und') {
    throw new Error('Could not detect the source language.');
  }
` : '';

    const sourceCode = this.sourceLanguage ? src : 'detectedSource';

    this.code = `async function translateText(textToTranslate${isTs ? ': string' : ''})${isTs ? ': Promise<string>' : ''} {${detectSnippet}
  // Check if translation is available for this language pair
  const availability = await ${isTs ? '(self as any).' : ''}Translator.availability({
    sourceLanguage: ${sourceCode},
    targetLanguage: ${tgt}
  });

  if (availability === 'unavailable') {
    throw new Error('Translation is not available for this language pair.');
  }

  if (availability !== 'available') {
    console.log('Language pack download required. Please wait...');
  }

  // Create translator instance (will trigger download if needed)
  const translator = await ${isTs ? '(self as any).' : ''}Translator.create({
    sourceLanguage: ${sourceCode},
    targetLanguage: ${tgt}
  });

  // Perform translation
  const translatedText = await translator.translate(textToTranslate);
  
  return translatedText;
}

// Example usage:
// translateText("Hello, world!").then(console.log);
`;
  }
}
