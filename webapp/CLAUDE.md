# CLAUDE.md - Web AI Studio Webapp

## Project Overview

Angular 21 SSR webapp showcasing Chrome's built-in AI APIs (LanguageModel, Summarizer, Writer, Rewriter, Translator, Language Detector, Proofreader). Includes documentation, interactive playgrounds, 21+ demos, and a comprehensive performance benchmarking suite (Cortex/Axon).

## Quick Reference

```bash
# Dev server (port 8200)
ng serve

# Build
ng build

# Test
ng test

# SSR server (port 4000)
node dist/web-ai.studio/server/server.mjs
```

## Architecture

### Component Pattern
- **Module-based** (NOT standalone). All components declared in `AppModule` (`app.module.ts`).
- `standalone: false` enforced in `angular.json` schematics.
- Base classes: `BasePage`, `BaseComponent` for shared functionality.

### Routing
- Module-based routing in `app-routing-module.ts`.
- Layout component wraps most routes as parent; Cortex and Bugs pages bypass layout.
- Routes defined via `RouteEnum` (30+ routes).

### State Management
- **RxJS-based** (BehaviorSubject, Observables). No NgRx/Signals.
- Services expose `$` observables (e.g., `messages$`, `status$`).
- All services are singleton (`providedIn: 'root'`).

### Styling
- **Tailwind CSS v4** with PostCSS.
- Dark mode via custom variant: `@custom-variant dark (&:is([data-bs-theme="dark"], [data-bs-theme="dark"] *));`
- SCSS for global styles (`src/styles.scss`).
- Bootstrap Icons for iconography (`bi bi-*` classes).

### SSR
- Full SSR with `@angular/ssr`, prerendering via `app.routes.server.ts`.
- Platform detection: `isPlatformBrowser(this.platformId)` / `isPlatformServer(this.platformId)` guards for browser-only code (localStorage, DOM APIs).
- Service Worker configured (`ngsw-config.json`).

## Key Directories

```
src/app/
  pages/              # Feature pages
    chat/             # Main LanguageModel Prompt API interface
    cortex/           # Performance benchmarking (Axon test suite)
    cortex-insights/  # Benchmarking analytics dashboard
    translation/      # Translation API demo
    writing-assistance/ # Summarizer, Writer, Rewriter demos
    docs/             # Documentation pages (7+ API guides)
    playgrounds/      # Interactive API playgrounds (7 tools)
    demos/            # 21+ feature demonstrations
    evals/            # Evaluation/testing
    bugs/             # Bug tracking
  components/         # Reusable UI components (chat, sidebar, header, etc.)
  core/
    services/         # Business logic services
    enums/            # Core enums (InferenceStateEnum, etc.)
    models/           # Data models (PromptRunOptions, etc.)
    interfaces/       # TypeScript interfaces
    stores/           # Event store
  shared/
    components/       # CodeEditor (ACE), DragAndDrop
    pipes/            # MarkdownPipe, SafeHtmlPipe
  enums/              # App-level enums (RouteEnum, TestStatus, BuiltInAiApi)
```

## Cortex / Axon Test Suite (Performance Benchmarking)

This is the most complex subsystem. Key files:

### Core Files
- `cortex.page.ts` / `.html` - Main page with 3 views: Insights overview, API pages, Test (scenario inspector)
- `cortex-insights.page.ts` / `.html` - Insights dashboard with KPI cards and leaderboard
- `cortex/services/comparison-data.service.ts` - Loads baseline JSON files, provides `getSummaryResults()` and `getGlobalSummaryResults()` for baseline comparisons
- `cortex/services/global-filter.service.ts` - Manages filter state (hardware, compute, engine, variant, API) with `filtersChanged` Subject for cross-component reactivity
- `cortex/axon/` - Test suite executor, test definitions, interfaces

### Key Concepts
- **Baselines**: Pre-recorded benchmark data loaded from `/data/baselines/index.json`. Each baseline has hardware info (hw, compute, engine) and test results.
- **selectedTestIds**: A `Set<string>` controlling which tests are included in aggregate metrics. Test selection affects local result aggregation but NOT baseline data display (baselines always use `ignoreSelection: true`).
- **API view**: Shows comparison table with Local Cold/Warm rows + baseline rows, sortable columns, progress bars, trophy icons for winners.
- **Test view (Scenario Inspector)**: Shows individual test details with telemetry cards, input payload, execution logs, and a benchmark comparison table below.
- **getSummaryResults()**: Two versions exist:
  - `cortex.page.ts` version: Aggregates local test iteration results by API + startType. Has `ignoreSelection` param.
  - `comparison-data.service.ts` version: Aggregates baseline data. Also has `ignoreSelection` param.
- **Filtering**: `GlobalFilterService` manages hardware/compute/engine/variant/API filters. `comparisonService.baselines` getter filters `_allBaselines` by filter state. `filtersChanged` Subject triggers change detection via `cdr.markForCheck()`.
- **Sorting**: `tableSortColumn` / `tableSortDirection` state in cortex.page.ts. `getSortedBaselines()` sorts baseline array. Both API and test page benchmark tables share the same sort state.

### Data Flow
1. `ComparisonDataService` loads `/data/baselines/index.json` on init
2. Fetches all baseline JSON files, derives engine labels from filenames (llminferenceengine -> "LLM IE", litertlm -> "LITERT-LM", default -> "Gemini API")
3. Populates `_allBaselines` array and filter options via `GlobalFilterService.setOptions()`
4. `baselines` getter filters by current filter state
5. Template uses `@let` variables for computed values (summary results, max values for bars)

### Enums
- `BuiltInAiApi` (`built-in-ai-api.enum.ts`): API names like "Language Detector", "Prompt API", etc.
- `TestStatus` (`test-status.enum.ts`): Success, Error, Fail, Executing, Idle

### Interfaces
- `AxonSummaryResultsInterface`: averageTokenPerSecond, averageInputTokensPerSecond, averageCharactersPerSecond, averageTimeToFirstToken, averageTotalResponseTime, averageInputTokens, plus median variants

## Key Services

| Service | File | Purpose |
|---------|------|---------|
| ConversationManager | `core/services/conversation-manager.service.ts` | Chrome LanguageModel sessions, message streaming |
| WritingAssistanceService | `core/services/writing-assistance.service.ts` | Summarizer/Writer/Rewriter API handling |
| ThemeService | `core/services/theme.service.ts` | Light/dark/auto theme (localStorage + system pref) |
| ComparisonDataService | `cortex/services/comparison-data.service.ts` | Baseline loading and comparison |
| GlobalFilterService | `cortex/services/global-filter.service.ts` | Cortex filter state management |

## Key Dependencies

- Angular 21.2.1, TypeScript ~5.9.2
- Tailwind CSS 4.2.1 (@tailwindcss/postcss, @tailwindcss/typography)
- ACE Editor (ace-builds v1.43.2) - code editing
- Marked v17 + DOMPurify v3 - markdown rendering
- PDF.js v5 - PDF handling
- @angular/cdk - dialogs, layout utilities
- @types/dom-chromium-ai - Chrome AI API types

## Conventions

- Prettier: 100 print width, single quotes
- Template: Angular `@let`, `@if`, `@for`, `@switch` control flow (new syntax)
- Icons: Bootstrap Icons (`bi bi-*`)
- Colors: Tailwind palette with dark mode variants (blue for cold start, orange for warm start, indigo for selected/active, emerald for speed metrics, slate for neutral)
- N/A display: Always show "N/A" for missing metrics rather than hiding entries
- Units displayed in subtle color next to values: `<span class="text-slate-400 dark:text-slate-500 text-[9px] ml-0.5">ms</span>`
