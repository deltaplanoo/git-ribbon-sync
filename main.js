import { Plugin, Notice, ItemView } from "obsidian";
import { exec } from "child_process";
import os from "os";

const GIT_HISTORY_VIEW_TYPE = "git-history-view";

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
          cls: "notice"
        });
        return;
      }

      const commits = stdout.split("\n").filter(line => line.trim() !== "");

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

    // Registra la vista della cronologia
    this.registerView(
      GIT_HISTORY_VIEW_TYPE,
      (leaf) => new GitHistoryView(leaf, vaultPath)
    );

    // =========================================================
    // REGISTRAZIONE PULSANTI RIBBON (Tutti insieme nello stesso blocco)
    // =========================================================

    // 1. Tasto PULL
    this.addRibbonIcon("arrow-down-to-line", "Git Pull", () => {
      new Notice("Pulling changes from GitHub...");
      this.runGitCommand(vaultPath, "git pull", "Pull successful!", "Pull failed.");
    });

    // 2. Tasto COMMIT & PUSH
    this.addRibbonIcon("arrow-up-from-line", "Git Commit & Push", () => {
      new Notice("Committing and pushing changes...");
      const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
      const deviceName = os.platform() === "darwin" ? "mac" : os.hostname().split(".")[0].toLowerCase();
      
      const commitMessage = `Vault sync: ${deviceName} ${timestamp}`;
      const command = `git add --all -- :^.obsidian/plugins/*/.git && git commit -m "${commitMessage}" && git push`;

      this.runGitCommand(vaultPath, command, "Push successful!", "Push failed.");
    });

    // 3. Tasto HISTORY (subito di seguito agli altri due)
    this.addRibbonIcon("history", "Show Git History", () => {
      this.activateHistoryView();
    });
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
}
