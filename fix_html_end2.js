const fs = require('fs');
let html = fs.readFileSync('webapp/src/app/pages/cortex-insights/cortex-insights.page.html', 'utf8');

html = html.replace(/<\/div>\s*<\/div>\s*<main/g, '      </div>\n    </div>\n  </div>\n\n  <main');

fs.writeFileSync('webapp/src/app/pages/cortex-insights/cortex-insights.page.html', html);
console.log('Fixed file end');
