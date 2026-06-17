const fs = require("fs");
const html = fs.readFileSync("D:/liruibiji/templates/index.html", "utf-8");

// Find escAttr function
const eaIdx = html.indexOf("function escAttr");
if (eaIdx >= 0) {
  console.log(html.substring(eaIdx, html.indexOf("}", eaIdx) + 1));
} else {
  const eaIdx2 = html.indexOf("escAttr");
  console.log("escAttr found at " + eaIdx2);
  console.log(html.substring(eaIdx2 - 10, eaIdx2 + 20));
  
  // It might be a var assignment, not a function
  const varIdx = html.indexOf("escAttr=");
  if (varIdx >= 0) {
    console.log("\nvar escAttr assignment:");
    console.log(html.substring(varIdx - 10, varIdx + 200));
  }
}