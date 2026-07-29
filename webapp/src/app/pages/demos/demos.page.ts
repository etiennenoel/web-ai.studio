import { Component, Inject, OnInit } from '@angular/core';
import { BasePage } from '../base-page';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DEMOS_DATA } from '../../core/services/demos.data';
import { DemoApi, DemoCategory, DemoExample } from '../../core/models/demo.interface';
import { DemoApiAvailability, DemoAvailabilityService } from '../../core/services/demo-availability.service';

interface CategoryStyle {
  icon: string;
  iconContainer: string;
}

@Component({
  selector: 'app-demos-page',
  templateUrl: './demos.page.html',
  styleUrls: ['./demos.page.scss'],
  standalone: false
})
export class DemosPage extends BasePage implements OnInit {
  demos: DemoExample[] = DEMOS_DATA;
  categories: DemoCategory[] = ['Embeddings', 'Speech', 'Text Input', 'Image Input', 'Audio Input', 'Tools Calling', 'Mix-and-Match'];
  apis: DemoApi[] = ['Prompt API', 'Semantic Embedder', 'Web Speech', 'Translator', 'Language Detector', 'Summarizer', 'Writer', 'Rewriter', 'Proofreader'];

  searchQuery = '';
  selectedCategory: DemoCategory | null = null;
  selectedApi: DemoApi | null = null;

  availability: Record<DemoApi, DemoApiAvailability> = {
    'Prompt API': 'checking',
    'Semantic Embedder': 'checking',
    'Web Speech': 'checking',
    'Translator': 'checking',
    'Language Detector': 'checking',
    'Summarizer': 'checking',
    'Writer': 'checking',
    'Rewriter': 'checking',
    'Proofreader': 'checking',
  };

  private readonly categoryStyles: Record<DemoCategory, CategoryStyle> = {
    'Speech': {
      icon: 'text-cyan-600 dark:text-cyan-400',
      iconContainer: 'bg-cyan-50 dark:bg-cyan-500/10',
    },
    'Embeddings': {
      icon: 'text-indigo-600 dark:text-indigo-400',
      iconContainer: 'bg-indigo-50 dark:bg-indigo-500/10',
    },
    'Text Input': {
      icon: 'text-sky-600 dark:text-sky-400',
      iconContainer: 'bg-sky-50 dark:bg-sky-500/10',
    },
    'Image Input': {
      icon: 'text-violet-600 dark:text-violet-400',
      iconContainer: 'bg-violet-50 dark:bg-violet-500/10',
    },
    'Audio Input': {
      icon: 'text-amber-600 dark:text-amber-400',
      iconContainer: 'bg-amber-50 dark:bg-amber-500/10',
    },
    'Tools Calling': {
      icon: 'text-emerald-600 dark:text-emerald-400',
      iconContainer: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    'Mix-and-Match': {
      icon: 'text-rose-600 dark:text-rose-400',
      iconContainer: 'bg-rose-50 dark:bg-rose-500/10',
    },
  };

  constructor(
    @Inject(DOCUMENT) document: Document,
    title: Title,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly demoAvailabilityService: DemoAvailabilityService,
  ) {
    super(document, title);
    this.setTitle("Demos");
  }

  override ngOnInit(): void {
    super.ngOnInit();

    this.subscriptions.push(this.route.queryParamMap.subscribe(params => {
      this.searchQuery = params.get('q') ?? '';

      const category = params.get('category');
      this.selectedCategory = this.categories.find(c => c === category) ?? null;

      const api = params.get('api');
      this.selectedApi = this.apis.find(a => a === api) ?? null;
    }));

    this.subscriptions.push(this.demoAvailabilityService.availability$.subscribe(availability => {
      this.availability = availability;
    }));
  }

  get filteredDemos(): DemoExample[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.demos.filter(demo => {
      if (this.selectedCategory && demo.category !== this.selectedCategory) {
        return false;
      }

      if (this.selectedApi && !demo.apis.includes(this.selectedApi)) {
        return false;
      }

      if (query) {
        const haystack = `${demo.title} ${demo.description} ${demo.category} ${demo.apis.join(' ')}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  get visibleCategories(): DemoCategory[] {
    const filtered = this.filteredDemos;
    return this.categories.filter(category => filtered.some(demo => demo.category === category));
  }

  getDemosByCategory(category: DemoCategory): DemoExample[] {
    return this.filteredDemos.filter(demo => demo.category === category);
  }

  onSearchChanged(query: string): void {
    this.searchQuery = query;
    this.syncQueryParams();
  }

  toggleCategory(category: DemoCategory): void {
    this.selectedCategory = this.selectedCategory === category ? null : category;
    this.syncQueryParams();
  }

  toggleApi(api: DemoApi): void {
    this.selectedApi = this.selectedApi === api ? null : api;
    this.syncQueryParams();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = null;
    this.selectedApi = null;
    this.syncQueryParams();
  }

  get hasActiveFilters(): boolean {
    return this.searchQuery.trim() !== '' || this.selectedCategory !== null || this.selectedApi !== null;
  }

  getCategoryStyle(category: DemoCategory): CategoryStyle {
    return this.categoryStyles[category];
  }

  getDemoAvailability(demo: DemoExample): DemoApiAvailability {
    const severity: DemoApiAvailability[] = ['unavailable', 'checking', 'downloading', 'downloadable', 'available'];
    return demo.apis
      .map(api => this.availability[api])
      .reduce((worst, current) => severity.indexOf(current) < severity.indexOf(worst) ? current : worst, 'available');
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchQuery.trim() || null,
        category: this.selectedCategory,
        api: this.selectedApi,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
