const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Check for any issues I haven't considered
// 1. Does the toggleFileSelect function name match exactly?
const tfsCount = (html.match(/toggleFileSelect/g) || []).length;
console.log("toggleFileSelect occurrences: " + tfsCount);

// 2. Is selectedFiles properly defined before use?
const sfIdx = html.indexOf("var selectedFiles");
console.log("var selectedFiles at: " + sfIdx);
const beforeIdx = html.indexOf("selectedFiles", sfIdx + 20);
console.log("First usage after definition at: " + beforeIdx + ": " + html.substring(beforeIdx, beforeIdx + 60));

// 3. Check for duplicate batch bars in HTML output
const bbCount = (html.match(/id="batchBar"/g) || []).length;
console.log("id='batchBar' in HTML: " + bbCount + " (should be 1)");

// 4. Check if selectAll checkbox renderFileList checkbox use the same path format
// selectAll uses dataset.path, individual uses escAttr(f.path)
// Both should produce the same value

// 5. Check that esc function doesn't double-escape
// escAttr escapes & and ", esc escapes &, <, >, "
// f.path from API shouldn't contain HTML special chars normally