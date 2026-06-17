const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Find ALL occurrences of toggleFileSelect
let pos = 0, count = 0;
while (true) {
  const idx = html.indexOf("toggleFileSelect", pos);
  if (idx < 0) break;
  count++;
  console.log("Occurrence " + count + " at " + idx);
  console.log("  Context: " + html.substring(Math.max(0, idx - 20), idx + 80));
  pos = idx + 1;
}

// Find the FULL function definition
console.log("\n=== Looking for function toggleFileSelect ===");
const funcStart = html.indexOf("function toggleFileSelect");
if (funcStart >= 0) {
  // Find the end: either next "function" or script end
  const funcEnd = html.indexOf("function", funcStart + 5);
  console.log("Function from " + funcStart + " to " + funcEnd);
  console.log(html.substring(funcStart, Math.min(funcStart + 400, funcEnd)));
}