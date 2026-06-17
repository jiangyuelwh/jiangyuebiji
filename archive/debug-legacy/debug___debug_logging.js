const fs = require("fs");
let html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Replace the toggleFileSelect to add console.log debugging
const oldFunc = "function toggleFileSelect(path, checked) {\n  if (checked) { if (selectedFiles.indexOf(path) < 0) selectedFiles.push(path); }\n  else { var idx = selectedFiles.indexOf(path); if (idx >= 0) selectedFiles.splice(idx, 1); }\n  document.getElementById(\"batchBar\").classList.toggle(\"show\", selectedFiles.length > 0);\n  document.getElementById(\"batchCount\").textContent = selectedFiles.length + \" 项\";\n}";

const newFunc = "function toggleFileSelect(path, checked) {\n  console.log(\"toggleFileSelect called: path=\", path, \" checked=\", checked);\n  if (checked) { if (selectedFiles.indexOf(path) < 0) selectedFiles.push(path); }\n  else { var idx = selectedFiles.indexOf(path); if (idx >= 0) selectedFiles.splice(idx, 1); }\n  console.log(\"selectedFiles now:\", selectedFiles.length, selectedFiles);\n  document.getElementById(\"batchBar\").classList.toggle(\"show\", selectedFiles.length > 0);\n  document.getElementById(\"batchCount\").textContent = selectedFiles.length + \" 项\";\n}";

if (html.includes(oldFunc)) {
  html = html.replace(oldFunc, newFunc);
  fs.writeFileSync("D:/liruibiji/templates/index.html", html, "utf-8");
  console.log("Debug logging added to toggleFileSelect");
} else {
  console.log("OLD FUNC NOT FOUND!");
  console.log("Looking for it...");
  // Show what actually exists
  const idx = html.indexOf("function toggleFileSelect");
  const end = html.indexOf("\n\n", idx);
  console.log(html.substring(idx, end));
}