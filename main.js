aimport { Plugin, Notice } from "obsidian";
import { exec } from "child_process";
import os from "os"; // 1. Importa il modulo os

export default class GitRibbonSyncPlugin extends Plugin {
  async onload() {
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
      
      // Recupera il nome del dispositivo (es. "mac" o l'hostname del sistema)
      const deviceName = os.hostname().split(".")[0].toLowerCase(); 
      
      // Formatta il messaggio di commit
      const commitMessage = `Vault sync: ${deviceName} ${timestamp}`;
      const command = `git add --all -- :^.obsidian/plugins/*/.git && git commit -m "${commitMessage}" && git push`;

      this.runGitCommand(vaultPath, command, "Push successful!", "Push failed.");
    });
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
