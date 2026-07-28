const { Plugin, Notice } = require("obsidian");
const { exec } = require("child_process");

module.exports = class GitRibbonSyncPlugin extends Plugin {
  async onload() {
    // Get the absolute file path of your Obsidian Vault
    const vaultPath = this.app.vault.adapter.getBasePath();

    // 1. ADD PULL BUTTON TO LEFT RIBBON
    this.addRibbonIcon("arrow-down-to-line", "Git Pull", () => {
      new Notice("Pulling changes from GitHub...");
      this.runGitCommand(vaultPath, "git pull", "Pull successful!", "Pull failed.");
    });

    // 2. ADD COMMIT & PUSH BUTTON TO LEFT RIBBON
    this.addRibbonIcon("arrow-up-from-line", "Git Commit & Push", () => {
      new Notice("Committing and pushing changes...");
      const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
      const command = `git add . && git commit -m "Vault sync: ${timestamp}" && git push`;

      this.runGitCommand(vaultPath, command, "Push successful!", "Push failed.");
    });
  }

  // Helper method to execute shell commands in the vault root
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
};
