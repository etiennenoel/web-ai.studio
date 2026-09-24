import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseClassifierDemoComponent } from '../components/base-demo/base-classifier-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ClassifierSchema, NormalizedClassifierResult } from '../../../core/services/classifier.service';

interface CatalogProduct {
  name: string;
  category: 'outerwear' | 'footwear' | 'packs' | 'camping';
  price: number;
  waterproof: boolean;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-nl-catalog-matcher-demo',
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

        <div class="flex flex-col gap-6">
          <!-- 1. Storefront Search & Auto-Toggled Filter Bar -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-grow flex items-center gap-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-zinc-700 rounded-full px-4 py-2.5">
                <i class="bi bi-search text-indigo-500"></i>
                <input type="text"
                       [(ngModel)]="queryText"
                       (keydown.enter)="applyNaturalLanguageFilters()"
                       class="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-200"
                       placeholder="Describe what gear you need in plain English..." />
              </div>
              <button type="button"
                      (click)="applyNaturalLanguageFilters()"
                      [disabled]="isFiltering || classifierStatus === 'unavailable'"
                      class="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all border-none disabled:opacity-50">
                @if (isFiltering) {
                  <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Filtering...
                } @else {
                  Apply Smart Filters
                }
              </button>
            </div>

            <!-- Sample queries -->
            <div class="mt-3 flex flex-wrap gap-2">
              @for (q of sampleQueries; track q.label) {
                <button type="button"
                        (click)="setQuery(q.text)"
                        class="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 transition-colors">
                  {{ q.label }}
                </button>
              }
            </div>

            <!-- Interactive Storefront Filter Pills (Toggled by Classifier OR User Click) -->
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-700/60 flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold text-slate-400 mr-1">Active Filters:</span>

              @for (cat of ['all', 'outerwear', 'footwear', 'packs', 'camping']; track cat) {
                <button type="button"
                        (click)="selectedCategory = cat"
                        class="px-3 py-1 rounded-full text-xs font-semibold capitalize border transition-colors"
                        [ngClass]="selectedCategory === cat
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700'">
                  {{ cat }}
                </button>
              }

              <button type="button"
                      (click)="under150Only = !under150Only"
                      class="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
                      [ngClass]="under150Only
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700'">
                Under $150
              </button>

              <button type="button"
                      (click)="waterproofOnly = !waterproofOnly"
                      class="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
                      [ngClass]="waterproofOnly
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700'">
                Waterproof
              </button>
            </div>
          </div>

          <!-- 2. Filtered Storefront Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (item of filteredProducts; track item.name) {
              <div class="rounded-3xl bg-[#ffffff] dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 p-5 flex items-start gap-4 shadow-sm">
                <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shrink-0">
                  <i class="bi {{ item.icon }}"></i>
                </div>
                <div class="flex-grow">
                  <div class="flex items-center justify-between gap-2">
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white m-0">{{ item.name }}</h4>
                    <span class="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">\${{ item.price }}</span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">{{ item.description }}</p>
                  <div class="flex items-center gap-2 mt-2.5">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400">
                      {{ item.category }}
                    </span>
                    @if (item.waterproof) {
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">
                        Waterproof
                      </span>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="col-span-2 rounded-3xl bg-[#ffffff] dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 p-8 text-center text-sm text-slate-500">
                No gear matches all active filter pills — click a filter pill above to broaden your search.
              </div>
            }
          </div>
        </div>

      </div>
    </app-demo-layout>
  `
})
export class NlCatalogMatcherDemoComponent extends BaseClassifierDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'nl-catalog-matcher')!;

  schema: ClassifierSchema = {
    context: 'Outdoor gear storefront filter assistant.',
    questions: [
      {
        id: 'category',
        type: 'categorical',
        prompt: 'Which gear category matches the shopper query?',
        options: [
          { label: 'outerwear', description: 'Jackets, parkas, rain shells' },
          { label: 'footwear', description: 'Hiking boots and trail shoes' },
          { label: 'packs', description: 'Backpacks and daypacks' },
          { label: 'camping', description: 'Tents and sleeping bags' }
        ]
      },
      {
        id: 'budget_tier',
        type: 'categorical',
        prompt: 'Select the target budget tier.',
        options: [
          { label: 'under_150', description: 'Under $150' },
          { label: 'premium', description: '$150 and above' }
        ]
      },
      {
        id: 'waterproof',
        type: 'binary',
        prompt: 'Does the shopper specifically want waterproof gear?'
      }
    ]
  };

  sampleQueries = [
    { label: 'Waterproof jacket under $150', text: 'waterproof jacket for winter hiking in Norway under $150' },
    { label: 'Rainy trail boots under $150', text: 'lightweight waterproof hiking boots for rainy trails under $150' },
    { label: 'Expedition alpine tent', text: 'expedition 4-season alpine tent for extreme winter storms' },
    { label: 'Lightweight daypack (<$150)', text: 'compact commuter daypack backpack under $150' }
  ];

  products: CatalogProduct[] = [
    {
      name: 'Nordic Fjord Eco-Shell Jacket',
      category: 'outerwear',
      price: 138,
      waterproof: true,
      icon: 'bi-cloud-snow',
      description: 'Breathable 3-layer waterproof shell built for sub-zero coastal storms.'
    },
    {
      name: 'RidgeRunner Gore-Tex Trail Boots',
      category: 'footwear',
      price: 129,
      waterproof: true,
      icon: 'bi-compass',
      description: 'High-traction waterproof boots for muddy ridge trails.'
    },
    {
      name: 'SummitZero Alpine Base Tent',
      category: 'camping',
      price: 420,
      waterproof: true,
      icon: 'bi-house-door',
      description: '4-season expedition shelter engineered for high-altitude snow loads.'
    },
    {
      name: 'Verde 22L Recycled Daypack',
      category: 'packs',
      price: 44,
      waterproof: false,
      icon: 'bi-bag-check',
      description: 'Ultralight ripstop daypack crafted from 100% recycled ocean nylon.'
    }
  ];

  queryText = this.sampleQueries[0].text;
  selectedCategory: string = 'all';
  under150Only = false;
  waterproofOnly = false;
  isFiltering = false;
  result: NormalizedClassifierResult | null = null;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkClassifierAvailability(this.schema);
  }

  setQuery(q: string) {
    this.queryText = q;
    this.applyNaturalLanguageFilters();
  }

  async applyNaturalLanguageFilters() {
    if (!this.queryText.trim() || this.classifierStatus === 'unavailable') return;
    this.isFiltering = true;
    this.errorMessage = '';
    try {
      this.result = await this.classifierService.classify(this.schema, this.queryText, {
        onDownloadProgress: this.onDownloadProgress
      });
      this.selectedCategory = this.result.byId['category']?.label || 'all';
      this.under150Only = this.result.byId['budget_tier']?.label === 'under_150';
      this.waterproofOnly = this.result.byId['waterproof']?.label === 'true';
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to classify search filters.';
    } finally {
      this.isFiltering = false;
      this.cdr.detectChanges();
    }
  }

  get filteredProducts(): CatalogProduct[] {
    return this.products.filter(p => {
      if (this.selectedCategory !== 'all' && p.category !== this.selectedCategory) return false;
      if (this.under150Only && p.price >= 150) return false;
      if (this.waterproofOnly && !p.waterproof) return false;
      return true;
    });
  }
}
