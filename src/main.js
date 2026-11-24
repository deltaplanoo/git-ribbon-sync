import { Plugin, Notice, ItemView, PluginSettingTab, Setting } from "obsidian";
import { exec } from "child_process";
import os from "os";

const GIT_HISTORY_VIEW_TYPE = "git-history-view";

// DEFAULT SETTINGS STRUCTURE
const DEFAULT_SETTINGS = {
  deviceName: os.platform() === "darwin" ? "mac" : os.hostname().split(".")[0].toLowerCase(),
  commitPrefix: "Vault sync:",
};

class GitHistoryView extends ItemView {
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

    container.createEl("h2", { text: "📜 Git Commit History" });

    const loadingEl = container.createEl("p", { text: "Caricamento cronologia..." });
    const gitLogCommand = 'git log -n 25 --pretty=format:"%h|%an|%ar|%s"';

    exec(gitLogCommand, { cwd: this.vaultPath }, (error, stdout, stderr) => {
      loadingEl.remove();

      if (error) {
        container.createEl("div", {
          text: `Errore durante il recupero dei commit: ${stderr || error.message}`,
          cls: "notice",
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

  async onClose() {}
}

export default class GitRibbonSyncPlugin extends Plugin {
  async onload() {
    const vaultPath = this.app.vault.adapter.getBasePath();

    // Load Settings
    await this.loadSettings();

    // Register custom history view
    this.registerView(
      GIT_HISTORY_VIEW_TYPE,
      (leaf) => new GitHistoryView(leaf, vaultPath)
    );

    // =========================================================
    // 1. REGISTER ACTIONS & RIBBON ICONS
    // =========================================================

    const pullAction = () => {
      new Notice("Pulling changes from GitHub...");
      this.runGitCommand(vaultPath, "git pull", "Pull successful!", "Pull failed.");
    };

    const pushAction = () => {
      new Notice("Committing and pushing changes...");
      const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
      const commitMessage = `${this.settings.commitPrefix} ${this.settings.deviceName} ${timestamp}`;
      const command = `git add --all -- :^.obsidian/plugins/*/.git && git commit -m "${commitMessage}" && git push`;

      this.runGitCommand(vaultPath, command, "Push successful!", "Push failed.");
    };

    const historyAction = () => {
      this.activateHistoryView();
    };

    // Add Ribbon Icons
    this.addRibbonIcon("arrow-down-to-line", "Git Pull", pullAction);
    this.addRibbonIcon("arrow-up-from-line", "Git Commit & Push", pushAction);
    this.addRibbonIcon("history", "Show Git History", historyAction);

    // =========================================================
    // 2. ADD COMMANDS (Enables the Hotkeys (+) Button!)
    // =========================================================

    this.addCommand({
      id: "git-pull",
      name: "Git Pull",
      callback: pullAction,
    });

    this.addCommand({
      id: "git-commit-push",
      name: "Git Commit & Push",
      callback: pushAction,
    });

    this.addCommand({
      id: "git-show-history",
      name: "Show Git Commit History",
      callback: historyAction,
    });

    // =========================================================
    // 3. ADD SETTINGS TAB (Enables the Gear Settings Button!)
    // =========================================================

    this.addSettingTab(new GitSyncSettingTab(this.app, this));
  }

  async activateHistoryView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(GIT_HISTORY_VIEW_TYPE)[0];

    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({
        type: GIT_HISTORY_VIEW_TYPE,
        active: true,
      });
    }

    workspace.revealLeaf(leaf);
  }

  runGitCommand(vaultPath, command, successMsg, errorMsg) {
    exec(command, { cwd: vaultPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Git Error: ${stderr || error.message}`);
        new Notice(`${errorMsg} Check developer console for details.`);
        return;
      }
      console.log(`Git Output: ${stdout}`);
      new Notice(successMsg);
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// =========================================================
// SETTINGS TAB CLASS
// =========================================================

class GitSyncSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Git Ribbon Sync Settings" });

    new Setting(containerEl)
      .setName("Device Name")
      .setDesc("The device name included in automated commit messages.")
      .addText((text) =>
        text
          .setPlaceholder("e.g. mac, desktop, laptop")
          .setValue(this.plugin.settings.deviceName)
          .onChange(async (value) => {
            this.plugin.settings.deviceName = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Commit Message Prefix")
      .setDesc("Prefix used before device name and timestamp.")
      .addText((text) =>
        text
          .setPlaceholder("Vault sync:")
          .setValue(this.plugin.settings.commitPrefix)
          .onChange(async (value) => {
            this.plugin.settings.commitPrefix = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
