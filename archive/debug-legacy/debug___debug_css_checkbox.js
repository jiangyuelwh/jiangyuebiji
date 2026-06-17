const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

const cssStart = html.indexOf("<style>");
const cssEnd = html.indexOf("</style>");
const css = html.substring(cssStart + 7, cssEnd);

// Check for any CSS that might hide checkboxes
const patterns = [".chk-col", ".num-col", "checkbox", "display:none", "visibility", "opacity"];
for (const p of patterns) {
  const idx = css.indexOf(p);
  if (idx >= 0) {
    const endBlock = css.indexOf("}", idx);
    console.log(p + ": " + css.substring(idx, endBlock + 1));
  }
}