import { InjectionToken } from '@angular/core';

export interface FeatureFlags {
  showHistory: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  showHistory: false
};

export const FEATURE_FLAGS = new InjectionToken<FeatureFlags>('FEATURE_FLAGS', {
  providedIn: 'root',
  factory: () => DEFAULT_FEATURE_FLAGS
});
