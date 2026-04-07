const fs = require('fs');
const path = require('path');

const baselinesDir = path.join(__dirname, 'public', 'data', 'baselines');
const files = fs.readdirSync(baselinesDir).filter(f => f.endsWith('.json') && f !== 'index.json');

for (const file of files) {
  const filePath = path.join(baselinesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.results && data.results.summary) {
    for (const api of Object.keys(data.results.summary)) {
      for (const mode of ['cold', 'warm']) {
        if (data.results.summary[api][mode]) {
          const summary = data.results.summary[api][mode];
          if (summary.averageTokenPerSecond !== undefined) {
             summary.averageCharactersPerSecond = summary.averageTokenPerSecond;
             summary.averageTokenPerSecond = -1;
             summary.medianCharactersPerSecond = summary.medianTokenPerSecond;
             summary.medianTokenPerSecond = -1;
          }
        }
      }
    }
  }

  if (data.results && data.results.testsResults) {
    for (const testResult of data.results.testsResults) {
      if (testResult.averageTokensPerSecond !== undefined) {
         testResult.averageCharactersPerSecond = testResult.averageTokensPerSecond;
         testResult.averageTokensPerSecond = -1;
         testResult.medianCharactersPerSecond = testResult.medianTokensPerSecond;
         testResult.medianTokensPerSecond = -1;
      }
      if (testResult.testIterationResults) {
        for (const iter of testResult.testIterationResults) {
          if (iter.tokensPerSecond !== undefined) {
             iter.charactersPerSecond = iter.tokensPerSecond;
             iter.tokensPerSecond = -1;
             iter.totalNumberOfOutputCharacters = iter.totalNumberOfOutputTokens;
             iter.totalNumberOfOutputTokens = -1;
          }
        }
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

console.log('Migration complete');
