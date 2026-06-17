const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Find the individual checkbox in renderFileList
const renderStart = html.indexOf("function renderFileList(files)");
const snippet = html.substring(renderStart, renderStart + 1200);
const cbIdx = snippet.indexOf("checkbox");
const lineStart = snippet.lastIndexOf("\n", cbIdx);
const lineEnd = snippet.indexOf("\n", cbIdx);
const line = snippet.substring(lineStart + 1, lineEnd);

console.log("Line:");
console.log(line);
console.log("\nHex:");
const bytes = Buffer.from(line, "utf-8");
for (let i = 0; i < bytes.length; i += 24) {
  const hex = Array.from(bytes.slice(i, Math.min(i+24, bytes.length))).map(b => b.toString(16).padStart(2, "0")).join(" ");
  const text = Array.from(bytes.slice(i, Math.min(i+24, bytes.length))).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : ".").join("");
  console.log(hex.padEnd(72) + " | " + text);
}