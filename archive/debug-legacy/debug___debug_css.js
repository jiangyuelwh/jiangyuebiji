const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");
const cssStart = html.indexOf("<style>");
const cssEnd = html.indexOf("</style>");
const css = html.substring(cssStart + 7, cssEnd);

// Check file-item-checkbox CSS
const idx = css.indexOf("file-item-checkbox");
if (idx >= 0) {
  const end = css.indexOf("}", idx);
  console.log("CSS:");
  console.log(css.substring(idx, end + 1));
} else {
  console.log("No CSS for file-item-checkbox");
}

// Check num-col
console.log("\nnum-col CSS:");
const numIdx = css.indexOf(".num-col");
if (numIdx >= 0) {
  const end = css.indexOf("}", numIdx);
  console.log(css.substring(numIdx, end + 1));
}