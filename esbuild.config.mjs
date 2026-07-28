import esbuild from "esbuild";
import process from "process";
import fs from "fs";
import path from "path";

const prod = process.argv[2] === "production";

// Path to your Obsidian Vault's plugin directory
const targetDir = path.join(
  process.env.HOME || process.env.USERPROFILE,
  "Builds/ObsidianVault/.obsidian/plugins/git-ribbon-sync"
);

// Plugin to automatically copy built files to your vault
const copyToVaultPlugin = {
  name: "copy-to-vault",
  setup(build) {
    build.onEnd(() => {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy manifest.json
      if (fs.existsSync("manifest.json")) {
        fs.copyFileSync("manifest.json", path.join(targetDir, "manifest.json"));
      }

      // Copy styles.css (if you create one later)
      if (fs.existsSync("styles.css")) {
        fs.copyFileSync("styles.css", path.join(targetDir, "styles.css"));
      }

      console.log(`\x1b[32m[${new Date().toLocaleTimeString()}] Copied build files to vault plugin folder!\x1b[0m`);
    });
  },
};

const context = await esbuild.context({
  entryPoints: ["main.js"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "child_process",
    "fs",
    "path",
    "os"
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  outfile: path.join(targetDir, "main.js"),
  plugins: [copyToVaultPlugin],
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
  console.log("Watching for changes...");
}
