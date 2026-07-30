import { afterNextRender, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';
import { DEMOS_DATA } from '../../../../core/services/demos.data';
import { DemoExample } from '../../../../core/models/demo.interface';
import { DemoDiscoveryService } from '../../../../core/services/demo-discovery.service';

@Component({
  selector: 'app-demo-layout',
  templateUrl: './demo-layout.component.html',
  styleUrls: ['./demo-layout.component.scss'],
  standalone: false
})
export class DemoLayoutComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() icon: string = '';
  @Input() category: string = '';
  @Input() onDeviceReason: string = '';
  @Input() codeSnippet: string = '';
  @Input() ttft: number | null = null;
  @Input() totalTime: number | null = null;

  /**
   * The demo being shown. Resolved from the URL rather than taken as an input so that the
   * "keep exploring" footer works on every demo page without touching all 50 components —
   * each demo id is also its route segment.
   */
  demo: DemoExample | null = null;

  relatedDemos: DemoExample[] = [];
  previousDemo: DemoExample | null = null;
  nextDemo: DemoExample | null = null;

  /** Flipped after hydration, so localStorage-derived state never renders on the server. */
  personalized = false;

  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly router: Router,
    private readonly discoveryService: DemoDiscoveryService,
  ) {
    // Deferred one macrotask so zone.js schedules a change detection pass for the
    // personalized state — afterNextRender itself runs after CD has already finished.
    afterNextRender(() => setTimeout(() => {
      this.personalized = true;

      if (this.demo) {
        this.discoveryService.markVisited(this.demo.id);
        this.refreshRecommendations();
      }
    }));
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd), startWith(null))
        .subscribe(() => this.resolveDemo())
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  private resolveDemo(): void {
    const id = this.router.url.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
    this.demo = DEMOS_DATA.find(demo => demo.id === id) ?? null;

    if (!this.demo) {
      this.relatedDemos = [];
      this.previousDemo = null;
      this.nextDemo = null;
      return;
    }

    if (this.personalized) {
      this.discoveryService.markVisited(this.demo.id);
    }

    this.refreshRecommendations();
  }

  private refreshRecommendations(): void {
    if (!this.demo) {
      return;
    }

    const neighbours = this.discoveryService.getCategoryNeighbours(this.demo);
    this.previousDemo = neighbours.previous;
    this.nextDemo = neighbours.next;

    // The prev/next links already surface the neighbours — don't spend a card on them too.
    const neighbourIds = [neighbours.previous?.id, neighbours.next?.id].filter((id): id is string => !!id);
    this.relatedDemos = this.discoveryService.getRelatedDemos(this.demo, 3, this.personalized, neighbourIds);
  }

  isNew(demo: DemoExample): boolean {
    return this.personalized && this.discoveryService.isNew(demo.id);
  }

  isUnvisited(demo: DemoExample): boolean {
    return this.personalized && !this.discoveryService.isVisited(demo.id);
  }

  get exploredCount(): number {
    return this.personalized ? this.discoveryService.visitedCount : 0;
  }

  get totalCount(): number {
    return this.discoveryService.totalCount;
  }

  surpriseMe(): void {
    const demo = this.discoveryService.getSurpriseDemo(this.demo?.id);

    if (demo) {
      this.router.navigate(['/demos', demo.id]);
    }
  }
}
