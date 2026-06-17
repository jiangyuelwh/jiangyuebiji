const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Find the exact checkbox template and dump hex around it
const idx = html.indexOf("toggleFileSelect");
const snippet = html.substring(idx - 5, idx + 60);
console.log("Text:");
console.log(snippet);
console.log("\nHex:");
const bytes = Buffer.from(snippet, "utf-8");
for (let i = 0; i < bytes.length; i += 20) {
  const hex = Array.from(bytes.slice(i, Math.min(i+20, bytes.length))).map(b => b.toString(16).padStart(2, "0")).join(" ");
  const text = Array.from(bytes.slice(i, Math.min(i+20, bytes.length))).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : ".").join("");
  console.log(hex.padEnd(60) + " | " + text);
}