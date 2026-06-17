const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Check what the checkbox template ACTUALLY renders by evaluating the JS
// Find the exact template code
const renderStart = html.indexOf("function renderFileList(files)");
const renderUpTo = html.substring(renderStart, renderStart + 1500);
const innerHTMLStart = renderUpTo.indexOf("tr.innerHTML='");
const innerHTMLEnd = renderUpTo.indexOf("';", innerHTMLStart);

// Extract the exact template string
let template = renderUpTo.substring(innerHTMLStart + 14, innerHTMLEnd + 1);
console.log("Raw template:");
console.log(template);

// Simulate with a test path
function escAttr(s) { return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;"); }
var f = {path: "任务管理/今日任务.html", name: "今日任务.html", isDir: false};
var result = eval("'" + template.replace(/\n/g, "\\n") + "'");
console.log("\nRendered HTML:");
console.log(result);