import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { BasePage } from '../../base-page';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageDetector: any;
declare const Translator: any;

interface LocaleEntry {
  key: string;
  value: string;
  detectedLanguage: string | null;
  confidence: number | null;
  status: 'pending' | 'ok' | 'wrong-language' | 'fixed';
  previousValue: string | null;
  isFixing: boolean;
}

const SAMPLE_LOCALE: Record<string, string> = {
  'nav.home': 'Accueil',
  'nav.settings': 'Paramètres',
  'nav.profile': 'Profil',
  'button.save': 'Enregistrer les modifications',
  'button.cancel': 'Cancel',
  'dialog.delete.title': 'Supprimer ce document ?',
  'dialog.delete.body': 'Cette action est irréversible. Le document sera définitivement supprimé.',
  'toast.saved': 'Your changes have been saved successfully',
  'error.network': 'La connexion au serveur a échoué. Veuillez réessayer.',
  'error.quota': 'Speicherplatz ist voll. Bitte löschen Sie einige Dateien.',
  'settings.language': 'Langue de l\'interface',
  'settings.notifications': 'Recevoir des notifications par e-mail',
  'onboarding.welcome': 'Bienvenue ! Commençons par configurer votre espace de travail.',
  'footer.terms': 'Terms of service and privacy policy'
};

const EXPECTED_LANGUAGES = [
  { code: 'fr', label: 'French' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' }
];

@Component({
  selector: 'app-localization-qa-demo',
  templateUrl: './localization-qa-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class LocalizationQaDemoComponent extends BasePage implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'localization-qa')!;

  expectedLanguages = EXPECTED_LANGUAGES;
  expectedLanguage = 'fr';
  fileName = 'fr.json';

  entries: LocaleEntry[] = Object.entries(SAMPLE_LOCALE).map(([key, value]) => ({
    key,
    value,
    detectedLanguage: null,
    confidence: null,
    status: 'pending',
    previousValue: null,
    isFixing: false
  }));

  detectorStatus = 'loading...';
  translatorStatus = 'loading...';
  errorMessage = '';

  isScanning = false;
  hasScanned = false;
  scanTimeMs: number | null = null;

  private detector: any = null;
  private translators = new Map<string, any>();

  constructor(
    @Inject(DOCUMENT) document: Document,
    title: Title,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    super(document, title);
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    try {
      this.detectorStatus = 'LanguageDetector' in self ? await LanguageDetector.availability() : 'unavailable';
    } catch { this.detectorStatus = 'unavailable'; }
    try {
      this.translatorStatus = 'Translator' in self
        ? await Translator.availability({ sourceLanguage: 'en', targetLanguage: this.expectedLanguage })
        : 'unavailable';
    } catch { this.translatorStatus = 'unavailable'; }
  }

  get statusPills() {
    return [
      { name: 'Language Detector', status: this.detectorStatus },
      { name: 'Translator', status: this.translatorStatus }
    ];
  }

  get issueCount(): number {
    return this.entries.filter(e => e.status === 'wrong-language').length;
  }

  get fixedCount(): number {
    return this.entries.filter(e => e.status === 'fixed').length;
  }

  languageLabel(code: string | null): string {
    if (!code) return '?';
    return this.expectedLanguages.find(l => l.code === code)?.label ?? code;
  }

  onExpectedChanged() {
    this.fileName = `${this.expectedLanguage}.json`;
    this.entries.forEach(entry => {
      if (entry.status !== 'fixed') {
        entry.status = 'pending';
        entry.detectedLanguage = null;
        entry.confidence = null;
      }
    });
    this.hasScanned = false;
  }

  async scan() {
    if (this.isScanning || this.detectorStatus === 'unavailable') return;

    this.isScanning = true;
    this.errorMessage = '';
    const start = performance.now();

    try {
      if (!this.detector) this.detector = await LanguageDetector.create();

      for (const entry of this.entries) {
        const results = await this.detector.detect(entry.value);
        const top = results?.[0];
        if (top && top.detectedLanguage !== 'und') {
          entry.detectedLanguage = top.detectedLanguage;
          entry.confidence = top.confidence;
          entry.status = top.detectedLanguage === this.expectedLanguage || top.confidence < 0.5
            ? 'ok'
            : 'wrong-language';
        } else {
          entry.detectedLanguage = null;
          entry.confidence = null;
          entry.status = 'ok';
        }
      }

      this.scanTimeMs = Math.round(performance.now() - start);
      this.hasScanned = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'The scan failed.';
    } finally {
      this.isScanning = false;
    }
  }

  async fix(entry: LocaleEntry) {
    if (entry.status !== 'wrong-language' || entry.isFixing || !entry.detectedLanguage) return;
    if (this.translatorStatus === 'unavailable') {
      this.errorMessage = 'The Translator API is unavailable — cannot fix strings.';
      return;
    }

    entry.isFixing = true;
    this.errorMessage = '';
    try {
      const key = `${entry.detectedLanguage}->${this.expectedLanguage}`;
      if (!this.translators.has(key)) {
        this.translators.set(key, await Translator.create({
          sourceLanguage: entry.detectedLanguage,
          targetLanguage: this.expectedLanguage
        }));
      }
      entry.previousValue = entry.value;
      entry.value = await this.translators.get(key).translate(entry.previousValue);
      entry.status = 'fixed';
      entry.detectedLanguage = this.expectedLanguage;
    } catch (e: any) {
      this.errorMessage = e.message || `Could not translate "${entry.key}" — is the ${entry.detectedLanguage}→${this.expectedLanguage} pair available?`;
    } finally {
      entry.isFixing = false;
    }
  }

  async fixAll() {
    for (const entry of this.entries.filter(e => e.status === 'wrong-language')) {
      await this.fix(entry);
    }
  }

  get dynamicCodeSnippet(): string {
    return `const detector = await LanguageDetector.create();
const expected = "${this.expectedLanguage}"; // auditing ${this.fileName}

// Audit every string locally — no localization service involved
const issues = [];
for (const [key, value] of Object.entries(localeStrings)) {
  const [top] = await detector.detect(value);
  if (top.detectedLanguage !== expected && top.confidence >= 0.5) {
    issues.push({ key, value, found: top.detectedLanguage });
  }
}
${this.hasScanned ? `// → found ${this.issueCount + this.fixedCount} strings not in ${this.languageLabel(this.expectedLanguage)}` : ''}

// Fix a straggler: translate it into the expected language
async function fix(issue) {
  const translator = await Translator.create({
    sourceLanguage: issue.found,
    targetLanguage: expected
  });
  localeStrings[issue.key] = await translator.translate(issue.value);
}`;
  }
}
