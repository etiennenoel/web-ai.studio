import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

interface TrackedIssue {
  id: number;
  title: string;
  vector: Float32Array;
  isNew?: boolean;
}

interface DuplicateMatch {
  issue: TrackedIssue;
  score: number;
}

const EXISTING_ISSUES: string[] = [
  'Google OAuth sign-in returns a 500 error',
  'Dark mode colors flicker when switching tabs',
  'CSV export drops rows containing commas',
  'Push notifications arrive twice on Android',
  'Profile photo upload fails for files over 5 MB',
  'Search results ignore the selected date filter',
  'Password reset email never arrives',
  'Dashboard charts overlap on small screens',
  'Keyboard shortcuts stop working after closing a modal',
  'Session expires while actively typing a comment',
  'Drag-and-drop reordering breaks in Firefox',
  'Emoji in team names break the invitation email',
  'Billing page shows the wrong currency for EU accounts',
  'Two-factor authentication QR code does not render',
  'Autosave overwrites edits made on another device',
  'Calendar sync duplicates recurring events',
  'PDF invoices render blank in Safari',
  'App freezes when uploading more than 20 images',
  'Mentions are not highlighted in comment threads',
  'Timezone offset is wrong during daylight saving time',
  'Archived projects still send email digests',
  'Table sorting resets after a page refresh',
  'Video call audio cuts out after screen sharing',
  'Offline mode loses drafts created without a connection'
];

@Component({
  selector: 'app-duplicate-detector-demo',
  templateUrl: './duplicate-detector-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class DuplicateDetectorDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'duplicate-detector')!;

  issues: TrackedIssue[] = [];
  draftTitle = '';
  threshold = 0.6;

  sampleDrafts = [
    'Can\'t log in with my Google account — server error',
    'Exported CSV file is missing some of the lines',
    'The password reset link email is not coming through',
    'Meeting invites show the wrong time after clocks changed'
  ];

  isIndexing = false;
  indexReady = false;
  isChecking = false;
  hasChecked = false;
  checkLatencyMs: number | null = null;
  duplicates: DuplicateMatch[] = [];
  submittedMessage = '';

  private draft$ = new Subject<string>();
  private checkToken = 0;
  private nextIssueId = 1;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);

    this.subscriptions.push(
      this.draft$.pipe(debounceTime(300)).subscribe(() => this.checkForDuplicates())
    );

    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    if (this.embedderStatus === 'available') {
      await this.buildIndex();
    }
  }

  async buildIndex() {
    if (this.isIndexing || this.indexReady) return;
    this.isIndexing = true;
    this.errorMessage = '';
    try {
      const vectors = await this.semanticEmbedder.embed(EXISTING_ISSUES, 'semantic-similarity', this.onDownloadProgress);
      this.issues = EXISTING_ISSUES.map((title, i) => ({
        id: this.nextIssueId++,
        title,
        vector: vectors[i]
      }));
      this.indexReady = true;
      if (this.draftTitle.trim()) this.checkForDuplicates();
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to embed the existing issues.';
    } finally {
      this.isIndexing = false;
    }
  }

  onDraftChanged() {
    this.submittedMessage = '';
    this.draft$.next(this.draftTitle);
  }

  onThresholdChanged() {
    if (this.hasChecked) this.checkForDuplicates();
  }

  useSample(sample: string) {
    this.draftTitle = sample;
    this.checkForDuplicates();
  }

  async checkForDuplicates() {
    const title = this.draftTitle.trim();
    const token = ++this.checkToken;

    if (!title || !this.indexReady) {
      this.duplicates = [];
      this.hasChecked = false;
      return;
    }

    this.isChecking = true;
    try {
      const start = performance.now();
      const draftVector = await this.semanticEmbedder.embedOne(title, 'semantic-similarity');
      const latency = Math.round(performance.now() - start);
      if (token !== this.checkToken) return;

      this.checkLatencyMs = latency;
      this.duplicates = this.issues
        .map(issue => ({ issue, score: this.semanticEmbedder.cosineSimilarity(draftVector, issue.vector) }))
        .filter(match => match.score >= this.threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      this.hasChecked = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'Duplicate check failed.';
    } finally {
      if (token === this.checkToken) this.isChecking = false;
    }
  }

  async submitIssue() {
    const title = this.draftTitle.trim();
    if (!title || !this.indexReady) return;

    try {
      const vector = await this.semanticEmbedder.embedOne(title, 'semantic-similarity');
      this.issues.forEach(i => (i.isNew = false));
      const issue: TrackedIssue = { id: this.nextIssueId++, title, vector, isNew: true };
      this.issues.unshift(issue);
      this.submittedMessage = `Issue #${issue.id} filed. It is now part of the index — try typing it again!`;
      this.draftTitle = '';
      this.duplicates = [];
      this.hasChecked = false;
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to file the issue.';
    }
  }

  get dynamicCodeSnippet(): string {
    const draft = this.draftTitle.trim() || this.sampleDrafts[0];
    return `const embedder = await SemanticEmbedder.create({ taskType: "semantic-similarity" });

// Embed the ${this.issues.length || EXISTING_ISSUES.length} existing issue titles once (single batched call)
const { embeddings } = await embedder.embed(existingIssueTitles);

// As the reporter types, check the draft against every known issue
const draft = ${JSON.stringify(draft)};
const { embeddings: [d] } = await embedder.embed(draft);

const duplicates = embeddings
  .map((e, i) => ({
    title: existingIssueTitles[i],
    score: cosineSimilarity(d.values, e.values)
  }))
  .filter(match => match.score >= ${this.threshold.toFixed(2)}) // similarity threshold
  .sort((a, b) => b.score - a.score);

if (duplicates.length > 0) {
  showWarning("Possible duplicates:", duplicates);
}`;
  }
}
