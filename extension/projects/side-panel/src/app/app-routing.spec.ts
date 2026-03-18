import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AppRoutingModule } from './app-routing-module';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('Side Panel Routing', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppRoutingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('should route empty path to overview', async () => {
    await router.navigateByUrl('');
    expect(location.path()).toBe(''); // HashLocationStrategy makes this tricky but location.path() usually gives the normalized path or '/'
  });

  it('should route to settings', async () => {
    const success = await router.navigateByUrl('/settings');
    expect(success).toBe(true);
    expect(location.path()).toBe('/settings');
  });

  it('should redirect unknown paths to overview', async () => {
    await router.navigateByUrl('/unknown-path');
    expect(location.path()).toBe('');
  });
});
