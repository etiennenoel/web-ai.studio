import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { DEMOS_DATA } from './demos.data';
import { DemoExample } from '../models/demo.interface';

interface DemoDiscoveryState {
  version: number;
  /** Every demo id this browser has already been shown at least once. */
  knownIds: string[];
  /** Demo detail pages this browser has actually opened. */
  visitedIds: string[];
  /** Ids that appeared since the previous visit and have not been opened yet. */
  newIds: string[];
}

const STORAGE_KEY = 'web-ai-studio.demo-discovery';
const STATE_VERSION = 1;

/**
 * Tracks what the visitor has already seen so the demos surfaces can highlight what they
 * have not. All state is per-browser (localStorage) and browser-only: on the server every
 * getter resolves to the "nothing seen yet, nothing new" baseline so SSR output stays stable.
 */
@Injectable({
  providedIn: 'root'
})
export class DemoDiscoveryService {
  private readonly isBrowser: boolean;

  private state: DemoDiscoveryState = {
    version: STATE_VERSION,
    knownIds: [],
    visitedIds: [],
    newIds: [],
  };

  private readonly stateSubject = new BehaviorSubject<DemoDiscoveryState>(this.state);
  public readonly state$ = this.stateSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.reconcile();
    }
  }

  /**
   * Loads the stored state and diffs it against the demos currently shipped.
   *
   * On a first-ever visit every demo is marked known but none are marked new — a wall of 50
   * "New" badges tells the visitor nothing. From the second visit on, anything added since
   * counts as new until they open it.
   */
  private reconcile(): void {
    const stored = this.read();
    const currentIds = DEMOS_DATA.map(demo => demo.id);

    if (stored === null) {
      this.commit({
        version: STATE_VERSION,
        knownIds: currentIds,
        visitedIds: [],
        newIds: [],
      });
      return;
    }

    const known = new Set(stored.knownIds);
    const visited = new Set(stored.visitedIds.filter(id => currentIds.includes(id)));
    const addedSinceLastVisit = currentIds.filter(id => !known.has(id));

    // New stays new until it is opened, so a same-day second visit does not lose the badge.
    const newIds = [...new Set([...stored.newIds, ...addedSinceLastVisit])]
      .filter(id => currentIds.includes(id) && !visited.has(id));

    this.commit({
      version: STATE_VERSION,
      knownIds: currentIds,
      visitedIds: [...visited],
      newIds,
    });
  }

  private read(): DemoDiscoveryState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<DemoDiscoveryState>;
      if (parsed?.version !== STATE_VERSION || !Array.isArray(parsed.knownIds)) {
        return null;
      }

      return {
        version: STATE_VERSION,
        knownIds: parsed.knownIds ?? [],
        visitedIds: parsed.visitedIds ?? [],
        newIds: parsed.newIds ?? [],
      };
    } catch {
      // Private mode, quota errors, hand-edited storage — degrade to "first visit".
      return null;
    }
  }

  private commit(state: DemoDiscoveryState): void {
    this.state = state;
    this.stateSubject.next(state);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable: keep the in-memory state so the session still behaves.
    }
  }

  /** Records that the visitor opened a demo, which also clears its "new" flag. */
  markVisited(demoId: string): void {
    if (!this.isBrowser || this.state.visitedIds.includes(demoId)) {
      // Still clear the new flag if the id somehow lingers there.
      if (this.isBrowser && this.state.newIds.includes(demoId)) {
        this.commit({ ...this.state, newIds: this.state.newIds.filter(id => id !== demoId) });
      }
      return;
    }

    this.commit({
      ...this.state,
      visitedIds: [...this.state.visitedIds, demoId],
      newIds: this.state.newIds.filter(id => id !== demoId),
    });
  }

  isVisited(demoId: string): boolean {
    return this.state.visitedIds.includes(demoId);
  }

  isNew(demoId: string): boolean {
    return this.state.newIds.includes(demoId);
  }

  get visitedCount(): number {
    return this.state.visitedIds.length;
  }

  get totalCount(): number {
    return DEMOS_DATA.length;
  }

  get newDemos(): DemoExample[] {
    return DEMOS_DATA.filter(demo => this.state.newIds.includes(demo.id));
  }

  get unvisitedDemos(): DemoExample[] {
    return DEMOS_DATA.filter(demo => !this.state.visitedIds.includes(demo.id));
  }

  resetProgress(): void {
    if (!this.isBrowser) {
      return;
    }

    this.commit({
      version: STATE_VERSION,
      knownIds: DEMOS_DATA.map(demo => demo.id),
      visitedIds: [],
      newIds: [],
    });
  }

  /**
   * Ranks the other demos by how much they share with the given one: overlapping APIs first,
   * same category as a tie-break, then a nudge toward demos the visitor has not opened yet.
   *
   * Pass `personalized: false` for the render that has to match the server output — the
   * visited/new nudges are browser-only state and would otherwise break hydration.
   */
  getRelatedDemos(demo: DemoExample, limit = 3, personalized = true, excludeIds: string[] = []): DemoExample[] {
    return DEMOS_DATA
      .filter(candidate => candidate.id !== demo.id && !excludeIds.includes(candidate.id))
      .map(candidate => ({ candidate, score: this.relatednessScore(demo, candidate, personalized) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(entry => entry.candidate);
  }

  private relatednessScore(demo: DemoExample, candidate: DemoExample, personalized: boolean): number {
    const sharedApis = candidate.apis.filter(api => demo.apis.includes(api)).length;

    let score = sharedApis * 10;

    if (candidate.category === demo.category) {
      score += 4;
    }

    // Uses every API the source demo uses: a natural "next step up" from this one.
    if (sharedApis > 0 && sharedApis === demo.apis.length) {
      score += 2;
    }

    if (personalized && !this.isVisited(candidate.id)) {
      score += 3;
    }

    if (personalized && this.isNew(candidate.id)) {
      score += 2;
    }

    return score;
  }

  /** The demos before and after this one within its own category, for linear browsing. */
  getCategoryNeighbours(demo: DemoExample): { previous: DemoExample | null; next: DemoExample | null } {
    const siblings = DEMOS_DATA.filter(candidate => candidate.category === demo.category);
    const index = siblings.findIndex(candidate => candidate.id === demo.id);

    if (index === -1) {
      return { previous: null, next: null };
    }

    return {
      previous: siblings[index - 1] ?? null,
      next: siblings[index + 1] ?? null,
    };
  }

  /** A random demo, preferring ones the visitor has not opened yet. */
  getSurpriseDemo(excludeId?: string): DemoExample | null {
    const unvisited = this.unvisitedDemos.filter(demo => demo.id !== excludeId);
    const pool = unvisited.length > 0
      ? unvisited
      : DEMOS_DATA.filter(demo => demo.id !== excludeId);

    if (pool.length === 0) {
      return null;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * The same demo for everybody on a given day, so it is worth coming back for and worth
   * sharing. Derived from the day number rather than randomness.
   */
  getDemoOfTheDay(now: Date = new Date()): DemoExample {
    const dayNumber = Math.floor(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000
    );

    // A stride coprime with most list lengths keeps consecutive days far apart in the list.
    return DEMOS_DATA[(dayNumber * 7) % DEMOS_DATA.length];
  }
}
