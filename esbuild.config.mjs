import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "cjs",
  platform: "node",
  external: [
    "obsidian",
    "electron",
    "child_process",
    "fs",
    "path",
    "os",
  ],
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  outfile: "dist/main.js",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
  console.log("Watching for changes...");
}
