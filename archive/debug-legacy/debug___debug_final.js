const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Show the exact batch bar HTML
const bbIdx = html.indexOf('class="batch-bar"');
const bbEnd = html.indexOf("</div>", bbIdx) + 6;
const bbHTML = html.substring(bbIdx, bbEnd);
console.log("Batch bar HTML:");
console.log(bbHTML);

// Check checkbox rendering - extract the template
const renderStart = html.indexOf("function renderFileList(files)");
const renderCode = html.substring(renderStart, renderStart + 1500);
const cbIdx2 = renderCode.indexOf("checkbox");
console.log("\nCheckbox HTML template:");
console.log(renderCode.substring(renderCode.indexOf("tr.innerHTML=", cbIdx2 - 200), renderCode.indexOf("\n", cbIdx2)));

// Check if there are multiple batch bars
const count = (html.match(/batchBar/g) || []).length;
if (count > 2) console.log("\nWARNING: batchBar appears " + count + " times (expected 2)");