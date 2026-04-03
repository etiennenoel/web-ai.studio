const fs = require('fs');

const tsFile = 'webapp/src/app/pages/cortex/cortex.page.ts';
let tsContent = fs.readFileSync(tsFile, 'utf8');

tsContent = tsContent.replace(
  /getGlobalAllValues\(metric: 'ttft' \| 'total' \| 'speed', coldVal\?: number\|null, warmVal\?: number\|null, cloudFlashVal\?: number\|null, cloudFlashLiteVal\?: number\|null\): number\[\] \{\n    return \[coldVal\|\|0, warmVal\|\|0, cloudFlashVal\|\|0, cloudFlashLiteVal\|\|0, \.\.\.this.getAllBaselineGlobalValues\(metric\)\];\n  \}/,
  `getGlobalAllValues(metric: 'ttft' | 'total' | 'speed', coldVal?: number|null, warmVal?: number|null): number[] {
    return [coldVal||0, warmVal||0, ...this.getAllBaselineGlobalValues(metric)];
  }`
);

tsContent = tsContent.replace(
  /getTestAllValues\(testId: any, metric: 'ttft' \| 'total' \| 'speed', coldVal\?: number\|null, warmVal\?: number\|null, cloudFlashVal\?: number\|null, cloudFlashLiteVal\?: number\|null\): number\[\] \{\n    return \[coldVal\|\|0, warmVal\|\|0, cloudFlashVal\|\|0, cloudFlashLiteVal\|\|0, \.\.\.this.getAllBaselineValues\(testId, metric\)\];\n  \}/,
  `getTestAllValues(testId: any, metric: 'ttft' | 'total' | 'speed', coldVal?: number|null, warmVal?: number|null): number[] {
    return [coldVal||0, warmVal||0, ...this.getAllBaselineValues(testId, metric)];
  }`
);

fs.writeFileSync(tsFile, tsContent);

const htmlFile = 'webapp/src/app/pages/cortex/cortex.page.html';
let htmlContent = fs.readFileSync(htmlFile, 'utf8');

// Global scope vars
htmlContent = htmlContent.replace(/[\s]*@let globalCloudFlash = comparisonService\.getGlobalSummaryResults\(comparisonService\.cloudFlashData, selectedTestIds\);/g, '');
htmlContent = htmlContent.replace(/[\s]*@let globalCloudFlashLite = comparisonService\.getGlobalSummaryResults\(comparisonService\.cloudFlashLiteData, selectedTestIds\);/g, '');

htmlContent = htmlContent.replace(/[\s]*@let ttftCloudFlash = globalCloudFlash\?\.averageTimeToFirstToken \|\| 0;/g, '');
htmlContent = htmlContent.replace(/[\s]*@let ttftCloudFlashLite = globalCloudFlashLite\?\.averageTimeToFirstToken \|\| 0;/g, '');

htmlContent = htmlContent.replace(/[\s]*@let totalCloudFlash = globalCloudFlash\?\.averageTotalResponseTime \|\| 0;/g, '');
htmlContent = htmlContent.replace(/[\s]*@let totalCloudFlashLite = globalCloudFlashLite\?\.averageTotalResponseTime \|\| 0;/g, '');

htmlContent = htmlContent.replace(/[\s]*@let speedCloudFlash = globalCloudFlash\?\.averageTokenPerSecond \|\| 0;/g, '');
htmlContent = htmlContent.replace(/[\s]*@let speedCloudFlashLite = globalCloudFlashLite\?\.averageTokenPerSecond \|\| 0;/g, '');

htmlContent = htmlContent.replace(
  /@let allTtft = getGlobalAllValues\('ttft', ttftColdLocal, ttftWarmLocal, ttftCloudFlash, ttftCloudFlashLite\);/g,
  `@let allTtft = getGlobalAllValues('ttft', ttftColdLocal, ttftWarmLocal);`
);
htmlContent = htmlContent.replace(
  /@let allTotal = getGlobalAllValues\('total', totalColdLocal, totalWarmLocal, totalCloudFlash, totalCloudFlashLite\);/g,
  `@let allTotal = getGlobalAllValues('total', totalColdLocal, totalWarmLocal);`
);
htmlContent = htmlContent.replace(
  /@let allSpeed = getGlobalAllValues\('speed', speedColdLocal, speedWarmLocal, speedCloudFlash, speedCloudFlashLite\);/g,
  `@let allSpeed = getGlobalAllValues('speed', speedColdLocal, speedWarmLocal);`
);

// Local scope vars
htmlContent = htmlContent.replace(/[\s]*@let cloudFlashTtft = comparisonService\.getSummaryResults\(comparisonService\.cloudFlashData, element\.id, selectedTestIds\)\?\.averageTimeToFirstToken;/g, '');
htmlContent = htmlContent.replace(/[\s]*@let cloudFlashLiteTtft = comparisonService\.getSummaryResults\(comparisonService\.cloudFlashLiteData, element\.id, selectedTestIds\)\?\.averageTimeToFirstToken;/g, '');

htmlContent = htmlContent.replace(/[\s]*@let cloudFlashTotal = comparisonService\.getSummaryResults\(comparisonService\.cloudFlashData, element\.id, selectedTestIds\)\?\.averageTotalResponseTime;/g, '');
htmlContent = htmlContent.replace(/[\s]*@let cloudFlashLiteTotal = comparisonService\.getSummaryResults\(comparisonService\.cloudFlashLiteData, element\.id, selectedTestIds\)\?\.averageTotalResponseTime;/g, '');

htmlContent = htmlContent.replace(/[\s]*@let cloudFlashSpeed = comparisonService\.getSummaryResults\(comparisonService\.cloudFlashData, element\.id, selectedTestIds\)\?\.averageTokenPerSecond;/g, '');
htmlContent = htmlContent.replace(/[\s]*@let cloudFlashLiteSpeed = comparisonService\.getSummaryResults\(comparisonService\.cloudFlashLiteData, element\.id, selectedTestIds\)\?\.averageTokenPerSecond;/g, '');

htmlContent = htmlContent.replace(
  /@let allTtft = getTestAllValues\(element\.id, 'ttft', coldTtft, warmTtft, cloudFlashTtft, cloudFlashLiteTtft\);/g,
  `@let allTtft = getTestAllValues(element.id, 'ttft', coldTtft, warmTtft);`
);
htmlContent = htmlContent.replace(
  /@let allTotal = getTestAllValues\(element\.id, 'total', coldTotal, warmTotal, cloudFlashTotal, cloudFlashLiteTotal\);/g,
  `@let allTotal = getTestAllValues(element.id, 'total', coldTotal, warmTotal);`
);
htmlContent = htmlContent.replace(
  /@let allSpeed = getTestAllValues\(element\.id, 'speed', coldSpeed, warmSpeed, cloudFlashSpeed, cloudFlashLiteSpeed\);/g,
  `@let allSpeed = getTestAllValues(element.id, 'speed', coldSpeed, warmSpeed);`
);

// Function to remove a block safely
function removeBlock(contentStr, startCommentRegex) {
    let newContent = contentStr;
    while (true) {
        let match = startCommentRegex.exec(newContent);
        if (!match) break;
        
        let startIndex = match.index;
        
        // Find the start of the div right after the comment
        let divStartString = '<div class="flex flex-col gap-1.5 mt-2">';
        let divStartIndex = newContent.indexOf(divStartString, startIndex);
        if (divStartIndex === -1 || divStartIndex > startIndex + 100) {
            // Something is wrong, break to prevent infinite loop
            break;
        }

        let divCount = 0;
        let endIdx = -1;
        let inBlock = false;

        for (let i = divStartIndex; i < newContent.length; i++) {
            if (newContent.substr(i, 4) === '<div') {
                divCount++;
                inBlock = true;
            } else if (newContent.substr(i, 6) === '</div') {
                divCount--;
            }

            if (inBlock && divCount === 0) {
                endIdx = i + 6;
                break;
            }
        }

        if (endIdx !== -1) {
            const fullBlock = newContent.substring(startIndex, endIdx);
            newContent = newContent.replace(fullBlock, '');
        } else {
            break; // Failed to parse end of div
        }
    }
    return newContent;
}

htmlContent = removeBlock(htmlContent, /[\s]*<!-- Cloud Flash Lite -->/);
htmlContent = removeBlock(htmlContent, /[\s]*<!-- Cloud Flash -->/);
htmlContent = removeBlock(htmlContent, /[\s]*<!-- CLOUD FLASH LITE -->/);
htmlContent = removeBlock(htmlContent, /[\s]*<!-- CLOUD FLASH -->/);

fs.writeFileSync(htmlFile, htmlContent);
