var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.js
var main_exports = {};
__export(main_exports, {
  default: () => GitRibbonSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_child_process = require("child_process");
var import_os = __toESM(require("os"), 1);
var GIT_HISTORY_VIEW_TYPE = "git-history-view";
var DEFAULT_SETTINGS = {
  deviceName: import_os.default.platform() === "darwin" ? "mac" : import_os.default.hostname().split(".")[0].toLowerCase(),
  commitPrefix: "Vault sync:"
};
var GitHistoryView = class extends import_obsidian.ItemView {
  constructor(leaf, vaultPath) {
    super(leaf);
    this.vaultPath = vaultPath;
  }
  getViewType() {
    return GIT_HISTORY_VIEW_TYPE;
  }
  getDisplayText() {
    return "Git Commit History";
  }
  getIcon() {
    return "history";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("git-history-container");
    container.createEl("h2", { text: "\u{1F4DC} Git Commit History" });
    const loadingEl = container.createEl("p", { text: "Caricamento cronologia..." });
    const gitLogCommand = 'git log -n 25 --pretty=format:"%h|%an|%ar|%s"';
    (0, import_child_process.exec)(gitLogCommand, { cwd: this.vaultPath }, (error, stdout, stderr) => {
      loadingEl.remove();
      if (error) {
        container.createEl("div", {
          text: `Errore durante il recupero dei commit: ${stderr || error.message}`,
          cls: "notice"
        });
        return;
      }
      const commits = stdout.split("\n").filter((line) => line.trim() !== "");
      if (commits.length === 0) {
        container.createEl("p", { text: "Nessun commit trovato nel repository." });
        return;
      }
      const table = container.createEl("table", { cls: "git-history-table" });
      const headerRow = table.createEl("tr");
      headerRow.createEl("th", { text: "Hash" });
      headerRow.createEl("th", { text: "Messaggio" });
      headerRow.createEl("th", { text: "Autore" });
      headerRow.createEl("th", { text: "Data" });
      commits.forEach((line) => {
        const [hash, author, date, message] = line.split("|");
        const row = table.createEl("tr");
        row.createEl("td", { text: hash, cls: "git-hash" });
        row.createEl("td", { text: message, cls: "git-message" });
        row.createEl("td", { text: author, cls: "git-author" });
        row.createEl("td", { text: date, cls: "git-date" });
      });
    });
  }
  async onClose() {
  }
};
var GitRibbonSyncPlugin = class extends import_obsidian.Plugin {
  async onload() {
    const vaultPath = this.app.vault.adapter.getBasePath();
    await this.loadSettings();
    this.registerView(
      GIT_HISTORY_VIEW_TYPE,
      (leaf) => new GitHistoryView(leaf, vaultPath)
    );
    const pullAction = () => {
      new import_obsidian.Notice("Pulling changes from GitHub...");
      this.runGitCommand(vaultPath, "git pull", "Pull successful!", "Pull failed.");
    };
    const pushAction = () => {
      new import_obsidian.Notice("Committing and pushing changes...");
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const commitMessage = `${this.settings.commitPrefix} ${this.settings.deviceName} ${timestamp}`;
      const command = `git add --all -- :^.obsidian/plugins/*/.git && git commit -m "${commitMessage}" && git push`;
      this.runGitCommand(vaultPath, command, "Push successful!", "Push failed.");
    };
    const historyAction = () => {
      this.activateHistoryView();
    };
    this.addRibbonIcon("arrow-down-to-line", "Git Pull", pullAction);
    this.addRibbonIcon("arrow-up-from-line", "Git Commit & Push", pushAction);
    this.addRibbonIcon("history", "Show Git History", historyAction);
    this.addCommand({
      id: "git-pull",
      name: "Git Pull",
      callback: pullAction
    });
    this.addCommand({
      id: "git-commit-push",
      name: "Git Commit & Push",
      callback: pushAction
    });
    this.addCommand({
      id: "git-show-history",
      name: "Show Git Commit History",
      callback: historyAction
    });
    this.addSettingTab(new GitSyncSettingTab(this.app, this));
  }
  async activateHistoryView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(GIT_HISTORY_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({
        type: GIT_HISTORY_VIEW_TYPE,
        active: true
      });
    }
    workspace.revealLeaf(leaf);
  }
  runGitCommand(vaultPath, command, successMsg, errorMsg) {
    (0, import_child_process.exec)(command, { cwd: vaultPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Git Error: ${stderr || error.message}`);
        new import_obsidian.Notice(`${errorMsg} Check developer console for details.`);
        return;
      }
      console.log(`Git Output: ${stdout}`);
      new import_obsidian.Notice(successMsg);
    });
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var GitSyncSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Git Ribbon Sync Settings" });
    new import_obsidian.Setting(containerEl).setName("Device Name").setDesc("The device name included in automated commit messages.").addText(
      (text) => text.setPlaceholder("e.g. mac, desktop, laptop").setValue(this.plugin.settings.deviceName).onChange(async (value) => {
        this.plugin.settings.deviceName = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Commit Message Prefix").setDesc("Prefix used before device name and timestamp.").addText(
      (text) => text.setPlaceholder("Vault sync:").setValue(this.plugin.settings.commitPrefix).onChange(async (value) => {
        this.plugin.settings.commitPrefix = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
