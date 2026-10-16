export function callGraphicsAnimation(
	trigger,
	token,
	context, // Like the message that called it basically
	item = null,
	targets = [],
	triggerContext = { outcome: undefined },
) {
	if (!window.pf2eGraphics) return;
	const actor = token.actor;

	window.pf2eGraphics.AnimCore.animate({
		trigger,
		context,
		rollOptions: actor.rollOptions,
		item,
		actor,
		targets,
		sources: [token],
		triggerContext,
		user: game.user.id,
	});
}
