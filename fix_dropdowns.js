const fs = require('fs');

let html = fs.readFileSync('webapp/src/app/pages/cortex-insights/cortex-insights.page.html', 'utf8');

const filterTypes = [
  { id: 'compute', varName: 'selectedComputes' },
  { id: 'engine', varName: 'selectedEngines' },
  { id: 'variant', varName: 'selectedVariants' },
  { id: 'api', varName: 'selectedApis' }
];

filterTypes.forEach(f => {
  const regex = new RegExp(`(<span \\[ngClass\\]="${f.varName}\\.length > 0 \\? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'"(?!>)[^>]*>)\\{\\{ ${f.varName}\\.length === 0 \\? 'All' : \\(${f.varName}\\.length === 1 \\? ${f.varName}\\[0\\] : ${f.varName}\\.length \\+ ' Selected'\\) \\}\\}(<\\/span>)`);
  
  const replacement = `$1
              @if (${f.varName}.length === 0) {
                All
              } @else {
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (val of ${f.varName}; track val) {
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border" [ngClass]="getFilterBadgeClass('${f.id}', val)">
                      <i class="bi" [ngClass]="getFilterIcon('${f.id}', val)"></i> {{ val }}
                    </span>
                  }
                </div>
              }
            $2`;
            
  html = html.replace(regex, replacement);
});

fs.writeFileSync('webapp/src/app/pages/cortex-insights/cortex-insights.page.html', html);
console.log('Fixed dropdowns HTML again');
