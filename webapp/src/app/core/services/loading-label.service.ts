import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, of, catchError } from 'rxjs';
import { LoadingLabelsConfig, LoadingLabel, LoadingLabelType, LoadingLabelPlatform } from '../models/loading-label.model';

@Injectable({
  providedIn: 'root'
})
export class LoadingLabelService {
  private configUrl = 'data/loading-labels.json';
  private configSubject = new BehaviorSubject<LoadingLabelsConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  private loadConfig() {
    this.http.get<LoadingLabelsConfig>(this.configUrl).pipe(
      catchError(error => {
        console.error('Failed to load loading labels', error);
        return of(null);
      })
    ).subscribe(config => {
      this.configSubject.next(config);
    });
  }

  getRandomLabel(category: keyof LoadingLabelsConfig, platform: LoadingLabelPlatform = 'generic'): LoadingLabel | null {
    const config = this.configSubject.value;
    if (!config || !config[category]) {
      return null;
    }

    const labels = config[category].filter(l => l.platform === 'generic' || l.platform === platform);
    if (labels.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * labels.length);
    return labels[randomIndex];
  }
}
