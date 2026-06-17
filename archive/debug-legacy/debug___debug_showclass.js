const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Check the batch-bar CSS more carefully
const cssStart = html.indexOf("<style>");
const cssEnd = html.indexOf("</style>");
const css = html.substring(cssStart + 7, cssEnd);

// Find all batch-bar related CSS
let pos = 0;
while (true) {
  const idx = css.indexOf("batch-bar", pos);
  if (idx < 0) break;
  const end = css.indexOf("}", idx);
  console.log("CSS rule at " + idx + ": " + css.substring(idx, end + 1));
  pos = end + 1;
}

// Check for .show class definition
console.log("\n.show class:");
const showIdx = css.indexOf(".show");
if (showIdx >= 0) {
  const showEnd = css.indexOf("}", showIdx);
  console.log(css.substring(showIdx, showEnd + 1));
} else {
  // Check toggle method - it adds/removes "show" class
  console.log("No .show CSS class found!");
  // The batchBar uses: classList.toggle("show", selectedFiles.length > 0)
  // But there's no CSS for .batch-bar.show or just .show that sets display:flex
  // This is the bug! We need .batch-bar.show { display: flex; }
  
  // Check if there's inline style or other mechanism
  const toggleIdx = html.indexOf("batchBar\").classList.toggle(\"show\"");
  if (toggleIdx >= 0) console.log("Toggle show found");
  const toggleIdx2 = html.indexOf("batchBar\").classList.toggle(\"show\",");
  if (toggleIdx2 >= 0) console.log("Toggle show with condition found");
}