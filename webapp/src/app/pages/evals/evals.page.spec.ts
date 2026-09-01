import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvalsPage } from './evals.page';
import { ApiEnum } from './api.enum';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

describe('EvalsPage', () => {
  let component: EvalsPage;
  let fixture: ComponentFixture<EvalsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvalsPage ],
      imports: [ ReactiveFormsModule, RouterTestingModule ],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvalsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a row', () => {
    const initialLength = component.rows.length;
    component.addRow();
    expect(component.rows.length).toBe(initialLength + 1);
  });

  it('should remove a row', () => {
    component.addRow();
    const initialLength = component.rows.length;
    component.removeRow(0);
    expect(component.rows.length).toBe(initialLength - 1);
  });

  it('should always keep one row', () => {
    component.removeRow(0);
    expect(component.rows.length).toBe(1);
  });

  describe('removeImage', () => {
    it('should only touch the addressed row', () => {
      component.addRow();
      component.rows.at(0).patchValue({ images: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'] });
      component.rows.at(1).patchValue({ images: ['data:image/png;base64,CCC'] });

      component.removeImage(1, 0);

      expect(component.rows.at(0).value.images.length).toBe(2);
      expect(component.rows.at(1).value.images.length).toBe(0);
    });
  });

  describe('buildExpectedInputs', () => {
    it('should always declare text with a language tag', () => {
      expect(component.buildExpectedInputs([], [])).toEqual([{ type: 'text', languages: ['en'] }]);
    });

    it('should add image and audio only when the row carries them', () => {
      expect(component.buildExpectedInputs(['data:image/png;base64,AAA'], [])).toEqual([
        { type: 'text', languages: ['en'] },
        { type: 'image', languages: ['en'] },
      ]);

      expect(component.buildExpectedInputs([], ['clip.mp3'])).toEqual([
        { type: 'text', languages: ['en'] },
        { type: 'audio', languages: ['en'] },
      ]);
    });
  });

  describe('normalizeApi', () => {
    it('should recognise every spelling of Web Speech', () => {
      expect(component.normalizeApi('Web Speech')).toBe(ApiEnum.WebSpeech);
      expect(component.normalizeApi(' webspeech ')).toBe(ApiEnum.WebSpeech);
      expect(component.normalizeApi('ASR')).toBe(ApiEnum.WebSpeech);
    });

    it('should recognise the other APIs', () => {
      expect(component.normalizeApi('Summarizer')).toBe(ApiEnum.Summarizer);
      expect(component.normalizeApi('prompt api')).toBe(ApiEnum.Prompt);
    });

    it('should fall back to Prompt', () => {
      expect(component.normalizeApi('nonsense')).toBe(ApiEnum.Prompt);
      expect(component.normalizeApi('')).toBe(ApiEnum.Prompt);
    });
  });

  describe('buildResponseConstraint', () => {
    it('should return null for an empty cell', () => {
      expect(component.buildResponseConstraint('')).toBeNull();
      expect(component.buildResponseConstraint('   ')).toBeNull();
    });

    it('should parse a JSON Schema', () => {
      expect(component.buildResponseConstraint('{"type":"object"}')).toEqual({ type: 'object' });
    });

    it('should parse a regex literal', () => {
      const constraint = component.buildResponseConstraint('/ab+c/i');
      expect(constraint instanceof RegExp).toBeTrue();
      expect((constraint as RegExp).flags).toBe('i');
    });

    it('should fail the row on broken JSON rather than run unconstrained', () => {
      expect(() => component.buildResponseConstraint('{"type":')).toThrowError(/not valid JSON/);
    });

    it('should fail the row on anything that is neither', () => {
      expect(() => component.buildResponseConstraint('hello')).toThrowError(/JSON Schema object/);
    });
  });

  describe('spreadsheet import', () => {
    const paste = (html: string) => {
      const event = {
        clipboardData: {
          items: [],
          getData: (type: string) => (type === 'text/html' ? html : ''),
        },
        preventDefault: () => {},
      } as unknown as ClipboardEvent;

      return component.onPaste(event, 0);
    };

    it('should map the real template headers, including parenthesised ones', async () => {
      await paste(`
        <table>
          <tr><td>Context</td><td>Input (Text)</td><td>Input (Images)</td><td>API</td></tr>
          <tr><td>be terse</td><td>Where is this city?</td><td></td><td>Prompt</td></tr>
        </table>`);

      expect(component.rows.length).toBe(1);
      const row = component.rows.at(0).value;
      expect(row.context).toBe('be terse');
      expect(row.input).toBe('Where is this city?');
      expect(row.api).toBe(ApiEnum.Prompt);
    });

    it('should ignore a column it does not recognise', async () => {
      await paste(`
        <table>
          <tr><td>Context</td><td>Input (Text)</td><td>Reviewer notes</td><td>API</td></tr>
          <tr><td>a</td><td>b</td><td>ignore me</td><td>Summarizer</td></tr>
        </table>`);

      const row = component.rows.at(0).value;
      expect(row.context).toBe('a');
      expect(row.input).toBe('b');
      expect(row.api).toBe(ApiEnum.Summarizer);
    });

    it('should not mistake a prose first row for a header', async () => {
      await paste(`
        <table>
          <tr><td>Context for the test</td><td>Describe the picture</td><td>Prompt</td></tr>
        </table>`);

      expect(component.rows.at(0).value.context).toBe('Context for the test');
    });

    it('should map columns by name when a header row is present', async () => {
      await paste(`
        <table>
          <tr><td>API</td><td>Context</td><td>Input</td><td>Schema</td></tr>
          <tr><td>Web Speech</td><td>be terse</td><td>transcribe this</td><td>{"type":"object"}</td></tr>
        </table>`);

      const row = component.rows.at(0).value;
      expect(row.api).toBe(ApiEnum.WebSpeech);
      expect(row.context).toBe('be terse');
      expect(row.input).toBe('transcribe this');
      expect(row.schema).toBe('{"type":"object"}');
    });

    it('should fall back to the legacy positional layout without a header row', async () => {
      await paste(`
        <table>
          <tr><td>be terse</td><td>describe this</td><td></td><td>Summarizer</td></tr>
        </table>`);

      const row = component.rows.at(0).value;
      expect(row.context).toBe('be terse');
      expect(row.input).toBe('describe this');
      expect(row.api).toBe(ApiEnum.Summarizer);
    });

    it('should read an audio path written as text', async () => {
      await paste(`
        <table>
          <tr><td>Context</td><td>Audio</td><td>API</td></tr>
          <tr><td></td><td>images/cortex/speeches/spontaneous-speech-en-46.mp3</td><td>Web Speech</td></tr>
        </table>`);

      const row = component.rows.at(0).value;
      expect(row.audio).toEqual(['images/cortex/speeches/spontaneous-speech-en-46.mp3']);
      expect(row.api).toBe(ApiEnum.WebSpeech);
    });

    it('should download a picture pasted from Sheets and inline it', async () => {
      const png = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
      spyOn(window, 'fetch').and.resolveTo(new Response(png, { status: 200, headers: { 'Content-Type': 'image/png' } }));

      await paste(`
        <table>
          <tr><td>Context</td><td>Input (Text)</td><td>Input (Images)</td><td>API</td></tr>
          <tr><td></td><td>Where is this city?</td>
              <td><img src="https://lh7-rt.googleusercontent.com/docsz/AbC123"></td>
              <td>Prompt</td></tr>
        </table>`);

      const row = component.rows.at(0).value;
      expect(row.images.length).toBe(1);
      expect(row.images[0].startsWith('data:image/png;base64,')).toBeTrue();
      expect(row.warnings.length).toBe(0);
    });

    it('should keep a remote image that cannot be downloaded and warn about it', async () => {
      spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));

      await paste(`
        <table>
          <tr><td>Context</td><td>Images</td></tr>
          <tr><td></td><td><img src="https://example.com/cat.png"></td></tr>
        </table>`);

      const row = component.rows.at(0).value;
      expect(row.images).toEqual(['https://example.com/cat.png']);
      expect(row.warnings.length).toBe(1);
      expect(row.warnings[0]).toContain('could not be downloaded');
    });

    it('should append rows beyond the ones already present', async () => {
      await paste(`
        <table>
          <tr><td>Context</td><td>Input</td></tr>
          <tr><td>one</td><td>a</td></tr>
          <tr><td>two</td><td>b</td></tr>
        </table>`);

      expect(component.rows.length).toBe(2);
      expect(component.rows.at(1).value.context).toBe('two');
    });
  });

  describe('matchColumn', () => {
    it('should resolve the template headings', () => {
      expect(component.matchColumn('Context')).toBe('context');
      expect(component.matchColumn('Input (Text)')).toBe('input');
      expect(component.matchColumn('Input (Images)')).toBe('images');
      expect(component.matchColumn('Input (Audio)')).toBe('audio');
      expect(component.matchColumn('API')).toBe('api');
      expect(component.matchColumn('Schema')).toBe('schema');
    });

    it('should reject prose', () => {
      expect(component.matchColumn('Context for the test')).toBeNull();
      expect(component.matchColumn('Where is this city?')).toBeNull();
      expect(component.matchColumn('')).toBeNull();
    });
  });

  describe('column visibility', () => {
    it('should hide the optional columns until something fills them', () => {
      expect(component.showColumn('images')).toBeFalse();
      expect(component.showColumn('audio')).toBeFalse();
      expect(component.showColumn('schema')).toBeFalse();
    });

    it('should show a column once a row fills it', () => {
      component.rows.at(0).patchValue({ audio: ['clip.mp3'] });
      expect(component.showColumn('audio')).toBeTrue();
      expect(component.hasColumnData('audio')).toBeTrue();
    });

    it('should let the user reveal an empty column and hide it again', () => {
      component.toggleColumn('schema');
      expect(component.showColumn('schema')).toBeTrue();

      component.toggleColumn('schema');
      expect(component.showColumn('schema')).toBeFalse();
    });
  });

  describe('usesField', () => {
    it('should limit Web Speech to audio', () => {
      expect(component.usesField(ApiEnum.WebSpeech, 'audio')).toBeTrue();
      expect(component.usesField(ApiEnum.WebSpeech, 'schema')).toBeFalse();
      expect(component.usesField(ApiEnum.WebSpeech, 'input')).toBeFalse();
      expect(component.usesField(ApiEnum.WebSpeech, 'images')).toBeFalse();
    });

    it('should limit Summarizer to text', () => {
      expect(component.usesField(ApiEnum.Summarizer, 'context')).toBeTrue();
      expect(component.usesField(ApiEnum.Summarizer, 'input')).toBeTrue();
      expect(component.usesField(ApiEnum.Summarizer, 'images')).toBeFalse();
      expect(component.usesField(ApiEnum.Summarizer, 'schema')).toBeFalse();
    });

    it('should give Prompt everything', () => {
      for (const field of ['context', 'input', 'images', 'audio', 'schema']) {
        expect(component.usesField(ApiEnum.Prompt, field)).toBeTrue();
      }
    });
  });

  describe('addRowsFromAudioPaths', () => {
    it('should create one row per path', () => {
      component.settings.patchValue({ audioPaths: 'a.mp3\nb.wav, c.ogg' });
      component.addRowsFromAudioPaths();

      expect(component.rows.length).toBe(3);
      expect(component.rows.at(0).value.audio).toEqual(['a.mp3']);
      expect(component.rows.at(2).value.audio).toEqual(['c.ogg']);
    });

    it('should ask before discarding rows that already hold data', () => {
      component.rows.at(0).patchValue({ input: 'do not lose me' });
      component.settings.patchValue({ audioPaths: 'a.mp3' });
      component.addRowsFromAudioPaths();

      expect(component.showResetConfirmation).toBeTrue();
      expect(component.rows.at(0).value.input).toBe('do not lose me');

      component.cancelReset();
      expect(component.rows.at(0).value.input).toBe('do not lose me');
    });
  });
});
