const fs = require("fs");
let html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Find the exact toggleFileSelect function and add debug logging
const tfsIdx = html.indexOf("function toggleFileSelect");
const tfsEnd = html.indexOf("function", tfsIdx + 30);
const oldFunc = html.substring(tfsIdx, tfsEnd);

const newFunc = "function toggleFileSelect(path, checked) {\n" +
"  console.log(\"tFS called:\", path, checked);\n" +
"  if (checked) { if (selectedFiles.indexOf(path) < 0) selectedFiles.push(path); }\n" +
"  else { var idx = selectedFiles.indexOf(path); if (idx >= 0) selectedFiles.splice(idx, 1); }\n" +
"  console.log(\"selFiles:\", selectedFiles.length);\n" +
"  document.getElementById(\"batchBar\").classList.toggle(\"show\", selectedFiles.length > 0);\n" +
"  document.getElementById(\"batchCount\").textContent = selectedFiles.length + \" 项\";\n" +
"}\n";

html = html.replace(oldFunc, newFunc);
fs.writeFileSync("D:/liruibiji/templates/index.html", html, "utf-8");
console.log("Debug logging added!");

// Verify syntax
const h = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");
let pos = 0, num = 0, ok = 0;
while (true) {
  const s = h.indexOf("<script", pos);
  if (s < 0) break;
  const se = h.indexOf(">", s);
  const e = h.indexOf("</script>", s);
  if (e < 0) break;
  const sc = h.substring(se + 1, e).trim();
  if (sc.length > 0) {
    try { new Function(sc); ok++; }
    catch (err) { console.log("ERROR Script " + num + ": " + err.message); }
    num++;
  }
  pos = e + 9;
}
console.log(ok + "/" + num + " scripts OK");