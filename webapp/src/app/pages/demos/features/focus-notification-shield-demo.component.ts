import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseClassifierDemoComponent } from '../components/base-demo/base-classifier-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ClassifierSchema } from '../../../core/services/classifier.service';

interface IncomingPing {
  id: number;
  sender: string;
  channel: string;
  text: string;
  deliveryMode: 'break_through' | 'digest_5pm' | 'muted' | null;
  latencyMs: number | null;
}

@Component({
  selector: 'app-focus-notification-shield-demo',
  standalone: false,
  host: { class: 'block h-full' },
  template: `
    <app-demo-layout
      [title]="demo.title"
      [description]="demo.description"
      [icon]="demo.icon"
      [category]="demo.category"
      [onDeviceReason]="demo.onDeviceReason"
      [codeSnippet]="demo.codeSnippet">
      <div demo-ui>

        <app-classifier-status
          [classifierStatus]="classifierStatus"
          [isDownloading]="isDownloading"
          [downloadProgress]="downloadProgress">
        </app-classifier-status>

        @if (errorMessage) {
          <div class="mb-4 bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-900/30 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300">
            {{ errorMessage }}
          </div>
        }

        <!-- Focus Shield Header -->
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
              <i class="bi bi-bell-slash-fill"></i>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white m-0">Deep Work Focus Shield Active</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 m-0">Only true emergencies break through — routine updates are batched for 5:00 PM.</p>
            </div>
          </div>

          <button type="button"
                  (click)="filterNotifications()"
                  [disabled]="isRunning || classifierStatus === 'unavailable'"
                  class="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all border-none disabled:opacity-50">
            @if (isRunning) {
              <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Screening Pings...
            } @else {
              <i class="bi bi-shield-check mr-1"></i> Screen Incoming Notifications
            }
          </button>
        </div>

        <!-- Two Columns: Allowed Interruptions vs. Quiet 5 PM Digest -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Column 1: Break-Through Alerts -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5">
            <div class="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <i class="bi bi-bell-fill"></i> Allowed to Ring Now ({{ breakThroughPings.length }})
            </div>

            <div class="space-y-3">
              @for (p of breakThroughPings; track p.id) {
                <div class="p-4 rounded-2xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/15">
                  <div class="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-semibold mb-1">
                    <span>{{ p.sender }} &bull; {{ p.channel }}</span>
                    @if (p.latencyMs) {
                      <span class="font-mono text-[10px]">{{ p.latencyMs }}ms</span>
                    }
                  </div>
                  <p class="text-sm text-slate-800 dark:text-slate-200 m-0">{{ p.text }}</p>
                </div>
              } @empty {
                <p class="text-xs text-slate-400 py-6 text-center m-0">Click "Screen Incoming Notifications" to filter your stream.</p>
              }
            </div>
          </div>

          <!-- Column 2: Held for 5:00 PM Digest -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5">
            <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <i class="bi bi-archive"></i> Held Quietly for 5:00 PM Digest ({{ digestPings.length }})
            </div>

            <div class="space-y-3">
              @for (p of digestPings; track p.id) {
                <div class="p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50/40 dark:bg-[#161616]/40">
                  <div class="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>{{ p.sender }} &bull; {{ p.channel }}</span>
                    @if (p.latencyMs) {
                      <span class="font-mono text-[10px]">{{ p.latencyMs }}ms</span>
                    }
                  </div>
                  <p class="text-sm text-slate-700 dark:text-slate-300 m-0">{{ p.text }}</p>
                </div>
              } @empty {
                <p class="text-xs text-slate-400 py-6 text-center m-0">Routine notifications will be collected here silently.</p>
              }
            </div>
          </div>
        </div>

      </div>
    </app-demo-layout>
  `
})
export class FocusNotificationShieldDemoComponent extends BaseClassifierDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'focus-notification-shield')!;

  schema: ClassifierSchema = {
    context: 'Deep-work focus mode notification filter.',
    questions: [
      {
        id: 'delivery_mode',
        type: 'categorical',
        prompt: 'Should this notification interrupt the user during Deep Work or wait for their 5 PM digest?',
        options: [
          { label: 'break_through', description: 'Critical production emergency or urgent personal safety alert' },
          { label: 'digest_5pm', description: 'Routine work update, newsletter, or non-urgent question' }
        ]
      }
    ]
  };

  pings: IncomingPing[] = [
    {
      id: 1,
      sender: 'PagerDuty',
      channel: '#prod-alerts',
      text: 'SEV-1: Checkout API latency exceeded 15s and payment webhooks are failing.',
      deliveryMode: null,
      latencyMs: null
    },
    {
      id: 2,
      sender: 'Workplace Ops',
      channel: '#general',
      text: 'Reminder: Free bagels and cold brew in the 4th floor kitchen until 11 AM!',
      deliveryMode: null,
      latencyMs: null
    },
    {
      id: 3,
      sender: 'Sarah (Security)',
      channel: 'Direct Message',
      text: 'We detected an unauthorized SSH login on the staging bastion — need your approval to rotate keys now.',
      deliveryMode: null,
      latencyMs: null
    },
    {
      id: 4,
      sender: 'Design Weekly',
      channel: 'Email',
      text: 'Here are the Figma component library updates and icon tweaks for next month.',
      deliveryMode: null,
      latencyMs: null
    }
  ];

  isRunning = false;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkClassifierAvailability(this.schema);
  }

  async filterNotifications() {
    if (this.classifierStatus === 'unavailable') return;
    this.isRunning = true;
    this.errorMessage = '';
    try {
      for (const ping of this.pings) {
        const res = await this.classifierService.classify(this.schema, ping.text, {
          onDownloadProgress: this.onDownloadProgress
        });
        ping.deliveryMode = (res.byId['delivery_mode']?.label as any) || 'digest_5pm';
        ping.latencyMs = res.elapsedMs;
        this.cdr.detectChanges();
      }
    } catch (e: any) {
      this.errorMessage = e.message || 'Notification screening failed.';
    } finally {
      this.isRunning = false;
      this.cdr.detectChanges();
    }
  }

  get breakThroughPings(): IncomingPing[] {
    return this.pings.filter(p => p.deliveryMode === 'break_through');
  }

  get digestPings(): IncomingPing[] {
    return this.pings.filter(p => p.deliveryMode === 'digest_5pm');
  }
}
