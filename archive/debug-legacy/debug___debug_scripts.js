const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

let pos = 0, num = 0;
while (true) {
  const s = html.indexOf("<script", pos);
  if (s < 0) break;
  const se = html.indexOf(">", s);
  const e = html.indexOf("</script>", s);
  if (e < 0) break;
  const sc = html.substring(se + 1, e).trim();
  if (sc.length > 0) {
    console.log("\nScript " + num + " at " + s + " (" + sc.length + " bytes)");
    console.log("  First 80: " + sc.substring(0, 80));
    console.log("  Has toggleFileSelect: " + sc.includes("toggleFileSelect"));
    console.log("  Has selectedFiles: " + sc.includes("selectedFiles"));
    num++;
  }
  pos = e + 9;
}