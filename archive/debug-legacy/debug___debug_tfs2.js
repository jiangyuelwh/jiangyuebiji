const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Get the exact toggleFileSelect function code
const idx = html.indexOf("function toggleFileSelect");
const endIdx = html.indexOf("\n\n", idx);
if (endIdx < 0) {
  // Find the next function
  const nextFunc = html.indexOf("\nfunction ", idx + 5);
  console.log("toggleFileSelect:");
  console.log(html.substring(idx, nextFunc));
} else {
  console.log("toggleFileSelect:");
  console.log(html.substring(idx, endIdx));
}