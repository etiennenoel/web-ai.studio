import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Browser-only testbed: CodeMirror injects DOM hydration does not know about, and the
    // hydration cleanup pass was observed wiping the mounted editor. No SSR, no cleanup.
    path: 'labs/**',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
