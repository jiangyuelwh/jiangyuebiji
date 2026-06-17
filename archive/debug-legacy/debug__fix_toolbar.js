const fs = require("fs");
let html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");
const lines = html.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("insertMd") && lines[i].includes('")"')) {
    lines[i] = lines[i].replace('")"', "')\"");
    console.log("Fixed line " + (i+1));
  }
}
html = lines.join("\n");
fs.writeFileSync("D:/liruibiji/templates/index.html", html, "utf-8");
console.log("Done");
