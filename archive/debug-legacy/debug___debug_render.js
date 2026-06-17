const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Find the checkbox in the renderFileList function
const renderStart = html.indexOf("function renderFileList(files)");
const afterRender = html.substring(renderStart, renderStart + 2000);

// Find the line with innerHTML and checkbox
const lines = afterRender.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("file-item-checkbox") || lines[i].includes("tr.innerHTML")) {
    console.log("Line " + i + ": " + lines[i].trim());
  }
}