import { runeEtchTraceDialog } from "./etchTraceRuneDialog.js";
import { invokeRuneDialog } from "./invokeRuneDialog.js";

export function setupAPI() {
	game.pf2eRunesmithAssistant = Object.assign(
		game?.pf2eRunesmithAssistant ?? {},
		{
			dialog: {
				openEtchTrace: runeEtchTraceDialog,
				openInvoke: invokeRuneDialog,
			},
		},
	);
}
