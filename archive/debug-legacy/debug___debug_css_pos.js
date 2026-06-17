const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");
const cssStart = html.indexOf("<style>");
const cssEnd = html.indexOf("</style>");
const css = html.substring(cssStart + 7, cssEnd);

// Show CSS around position 10000
console.log("CSS around batch-bar.show:");
console.log(css.substring(10000, 10150));