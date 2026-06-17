const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Check Script 2 (features) - look at beginning and end
const s = 46934;
const se = html.indexOf(">", s);
const e = html.indexOf("</script>", s);
const sc = html.substring(se + 1, e).trim();

console.log("Script 2 (" + sc.length + " bytes)");
console.log("First 200:");
console.log(sc.substring(0, 200));
console.log("\n...");
console.log("\nLast 200:");
console.log(sc.substring(sc.length - 200));