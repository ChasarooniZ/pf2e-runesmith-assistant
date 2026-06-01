import { setupAPI } from "./api.js";
import { setupHooks } from "./hooks.js";
import { setupSocket } from "./socket.js";

export const MODULE_ID = "pf2e-runesmith-assistant";

Hooks.once("init", async function () {
  loadTemplates([
    `modules/pf2e-runesmith-assistant/templates/target-dialog.hbs`,
  ])
});

Hooks.once("socketlib.ready", () => {
  if (!setupSocket())
    console.error(
      "Error: Unable to set up socket lib for PF2e Runesmith Assistant"
    );
});

Hooks.once("ready", async function () {
  setupAPI();
  setupHooks();
});
