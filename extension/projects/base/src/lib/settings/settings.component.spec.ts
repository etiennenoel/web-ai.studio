import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsComponent } from './settings.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { vi } from 'vitest';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, FormsModule, CommonModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    
    (window as any).chrome = {
      runtime: {
        sendMessage: vi.fn().mockImplementation((req: any, cb: any) => {
          if (req.action === 'get_setting') {
            if (req.key === 'wrap_api') cb({ value: true });
            else if (req.key === 'providers') cb({ value: req.defaultValue });
            else if (req.key === 'activeProviderId') cb({ value: 'chrome' });
            else cb({ value: req.defaultValue });
          } else if (req.action === 'set_setting') {
            cb({ success: true });
          }
        }),
        lastError: null
      }
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load settings on init', () => {
    expect((window as any).chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'get_setting', key: 'wrap_api', defaultValue: true },
      expect.any(Function)
    );
    expect(component.wrapApiEnabled).toBe(true);
  });

  it('should save settings and show message', async () => {
    component.wrapApiEnabled = false;
    component.saveSettings();
    
    expect((window as any).chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'set_setting', key: 'wrap_api', value: false },
      expect.any(Function)
    );
    
    expect(component.savedMessage).toBe(true);
    
    // Wait for the timeout in showSavedMessage
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    expect(component.savedMessage).toBe(false);
  });
});
