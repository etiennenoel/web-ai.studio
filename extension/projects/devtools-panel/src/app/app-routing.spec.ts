import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AppRoutingModule } from './app-routing-module';
import { Component } from '@angular/core';

describe('DevTools Panel Routing', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppRoutingModule],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('should redirect empty path to overview', async () => {
    await router.navigateByUrl('');
    expect(location.path()).toBe('/overview');
  });

  it('should route to prompt', async () => {
    const success = await router.navigateByUrl('/prompt');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/prompt');
  });

  it('should route to performance', async () => {
    const success = await router.navigateByUrl('/performance');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/performance');
  });

  it('should route to translator', async () => {
    const success = await router.navigateByUrl('/translator');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/translator');
  });
});
