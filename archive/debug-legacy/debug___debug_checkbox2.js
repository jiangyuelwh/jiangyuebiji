const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Extract the exact renderFileList innerHTML line
const cbLine = html.indexOf("file-item-checkbox");
const lineStart = html.lastIndexOf("\n", cbLine);
const lineEnd = html.indexOf("\n", cbLine);
console.log("Line:");
console.log(html.substring(lineStart, lineEnd));

// Also check the esc function for comparison
const escIdx = html.indexOf("function esc(s)");
if (escIdx >= 0) {
  console.log("\nesc function:");
  console.log(html.substring(escIdx, html.indexOf("}", escIdx) + 1));
}