import { createEffect, createRuneTraceEffect } from "./createRuneTraceEffect.js";
import { deleteRuneEffect } from "./deleteEffect.js";
import { MODULE_ID } from "./module.js";

async function createTraceEffect(data) {
	await createRuneTraceEffect(data);
}
async function deleteEffect(data) {
	await deleteRuneEffect(data);
}

export function setupSocket() {
	if (socketlib) {
		game.pf2eRunesmithAssistant = Object.assign(
			game?.pf2eRunesmithAssistant ?? {},
			{
				socket: socketlib.registerModule(MODULE_ID),
			},
		);
		game.pf2eRunesmithAssistant.socket.register("createTraceEffect", createTraceEffect);
		game.pf2eRunesmithAssistant.socket.register("createEffect", createEffect);
		game.pf2eRunesmithAssistant.socket.register("deleteEffect", deleteEffect);
	}
	return !!socketlib;
}
