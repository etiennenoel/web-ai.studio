const fs = require('fs');
let html = fs.readFileSync('webapp/src/app/pages/cortex-insights/cortex-insights.page.html', 'utf8');
const endString = '  </main>\n</div>';
const firstIndex = html.indexOf(endString);
if (firstIndex !== -1) {
  html = html.substring(0, firstIndex + endString.length);
  fs.writeFileSync('webapp/src/app/pages/cortex-insights/cortex-insights.page.html', html);
  console.log('Fixed file end');
} else {
  console.log('Could not find end string');
}
