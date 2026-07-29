import { Component, NgZone, OnInit, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

type Room = 'living room' | 'bedroom' | 'kitchen';

interface HomeState {
  lights: Record<Room, boolean>;
  thermostat: number;
  music: { playing: boolean; genre: string | null };
}

interface ToolCall {
  tool: string;
  args: string;
  result: string;
  timeMs: number;
}

@Component({
  selector: 'app-tool-calling-demo',
  templateUrl: './tool-calling-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ToolCallingDemoComponent extends BaseDemoComponent implements OnInit {
  private readonly ngZone = inject(NgZone);

  demo = DEMOS_DATA.find(d => d.id === 'tool-calling')!;

  readonly rooms: Room[] = ['living room', 'bedroom', 'kitchen'];

  home: HomeState = {
    lights: { 'living room': false, 'bedroom': false, 'kitchen': false },
    thermostat: 20,
    music: { playing: false, genre: null }
  };

  command = '';
  assistantReply = '';
  toolCalls: ToolCall[] = [];
  totalToolCalls = 0;
  errorMessage = '';

  sampleCommands = [
    'Make the living room cozy and warm for movie night.',
    'Turn everything off, I\'m heading out.',
    'It\'s freezing in here!',
    'Put on some jazz in the kitchen and dim the rest.'
  ];

  private session: any = null;
  private commandStartTime = 0;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkAvailability();
  }

  get statusPills() {
    return [{ name: 'Prompt API (tool use)', status: this.languageModelAvailability }];
  }

  toggleLight(room: Room) {
    this.home.lights[room] = !this.home.lights[room];
  }

  get lightsOnCount(): number {
    return this.rooms.filter(room => this.home.lights[room]).length;
  }

  private logCall(tool: string, args: any, result: any): void {
    this.ngZone.run(() => {
      this.toolCalls.unshift({
        tool,
        args: JSON.stringify(args),
        result: JSON.stringify(result),
        timeMs: Math.round(performance.now() - this.commandStartTime)
      });
      this.totalToolCalls++;
      if (this.toolCalls.length > 12) this.toolCalls.pop();
    });
  }

  private buildTools(): any[] {
    return [
      {
        name: 'getHomeState',
        description: 'Read the current state of every device in the home.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        execute: async () => {
          const result = this.home;
          this.logCall('getHomeState', {}, result);
          return JSON.stringify(result);
        }
      },
      {
        name: 'setLight',
        description: 'Turn the light in one room on or off.',
        inputSchema: {
          type: 'object',
          properties: {
            room: { type: 'string', enum: this.rooms },
            on: { type: 'boolean' }
          },
          required: ['room', 'on'],
          additionalProperties: false
        },
        execute: async ({ room, on }: { room: Room; on: boolean }) => {
          const result = { ok: this.rooms.includes(room), room, on };
          if (result.ok) {
            this.ngZone.run(() => (this.home.lights[room] = on));
          }
          this.logCall('setLight', { room, on }, result);
          return JSON.stringify(result);
        }
      },
      {
        name: 'setThermostat',
        description: 'Set the home\'s target temperature in Celsius, between 10 and 30.',
        inputSchema: {
          type: 'object',
          properties: { temperature: { type: 'number', minimum: 10, maximum: 30 } },
          required: ['temperature'],
          additionalProperties: false
        },
        execute: async ({ temperature }: { temperature: number }) => {
          const clamped = Math.min(30, Math.max(10, Math.round(temperature)));
          this.ngZone.run(() => (this.home.thermostat = clamped));
          const result = { ok: true, temperature: clamped };
          this.logCall('setThermostat', { temperature }, result);
          return JSON.stringify(result);
        }
      },
      {
        name: 'playMusic',
        description: 'Start playing music of a given genre on the home speakers.',
        inputSchema: {
          type: 'object',
          properties: { genre: { type: 'string' } },
          required: ['genre'],
          additionalProperties: false
        },
        execute: async ({ genre }: { genre: string }) => {
          this.ngZone.run(() => (this.home.music = { playing: true, genre }));
          const result = { ok: true, playing: true, genre };
          this.logCall('playMusic', { genre }, result);
          return JSON.stringify(result);
        }
      },
      {
        name: 'stopMusic',
        description: 'Stop the music.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        execute: async () => {
          this.ngZone.run(() => (this.home.music = { playing: false, genre: null }));
          const result = { ok: true, playing: false };
          this.logCall('stopMusic', {}, result);
          return JSON.stringify(result);
        }
      }
    ];
  }

  useSample(sample: string) {
    this.command = sample;
    this.send();
  }

  async send() {
    const command = this.command.trim();
    if (!command || this.state === PromptInputStateEnum.Inferencing) return;
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable in this browser.';
      return;
    }

    this.state = PromptInputStateEnum.Inferencing;
    this.assistantReply = '';
    this.errorMessage = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    this.commandStartTime = performance.now();

    let firstTokenTime: number | null = null;

    try {
      // One persistent session: follow-ups like "now turn it back off" keep working.
      if (!this.session) {
        this.session = await LanguageModel.create({
          systemPrompt:
            'You are a smart home assistant. Use the available tools to fulfil the user\'s requests, ' +
            'then confirm briefly what you did. Call getHomeState first when the current state matters. ' +
            'Temperatures are in Celsius; "cozy and warm" is around 23.',
          tools: this.buildTools()
        });
      }

      const stream = this.session.promptStreaming(command, { signal: this.abortController.signal });
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - this.commandStartTime);
        }
        this.assistantReply += chunk;
      }
      this.totalTime = Math.round(performance.now() - this.commandStartTime);
      this.command = '';
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'The command failed.';
        // A create() rejection usually means this build has no tool-use support.
        this.session?.destroy?.();
        this.session = null;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  resetSession() {
    this.session?.destroy?.();
    this.session = null;
    this.toolCalls = [];
    this.totalToolCalls = 0;
    this.assistantReply = '';
  }

  override ngOnDestroy() {
    this.session?.destroy?.();
    super.ngOnDestroy();
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
