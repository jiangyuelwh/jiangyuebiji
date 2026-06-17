const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Check toggleFileSelect
const tfs = html.indexOf("function toggleFileSelect");
console.log("=== toggleFileSelect ===");
console.log(html.substring(tfs, html.indexOf("}", tfs) + 1));

// Check the batch-bar CSS
const cssStart = html.indexOf("<style>");
const cssEnd = html.indexOf("</style>");
const css = html.substring(cssStart + 7, cssEnd);
console.log("\n=== batch-bar CSS ===");
const bbCSS = css.substring(css.indexOf("batch-bar"), css.indexOf("}", css.indexOf("batch-bar")) + 1);
console.log(bbCSS);

// Check if .show class exists
console.log("\n=== .show in CSS ===");
console.log("contains .show:", css.includes(".show"));

// Check the batch-bar HTML
const bbIdx = html.indexOf("batchBar");
console.log("\n=== batch bar HTML ===");
console.log(html.substring(bbIdx - 20, html.indexOf("</div>", bbIdx) + 12));

// Check what selectAll uses vs individual
const saIdx = html.indexOf("selectAllCheckbox");
console.log("\n=== selectAll ===");
console.log(html.substring(saIdx, html.indexOf("</th>", saIdx)));

// Check the renderFileList checkbox line
const cbIdx = html.indexOf("file-item-checkbox");
console.log("\n=== checkbox in renderFileList ===");
console.log(html.substring(cbIdx - 50, html.indexOf("\n", cbIdx)));