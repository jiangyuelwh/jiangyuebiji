// build-codemirror.js - Bundles CodeMirror 6 for browser use
const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["cm-editor.js"],
  bundle: true,
  format: "iife",
  globalName: "CodeMirrorEditor",
  outfile: "static/codemirror-bundle.js",
  external: [],
}).then(() => console.log("Built!")).catch(e => { console.error(e); process.exit(1); });
