import { invokeRune, pickDialog } from "./invokeRuneDialog.js";
import { getYourToken } from "./misc.js";
import { MODULE_ID } from "./module.js";

export async function chainOfWords() {
  return;
  const token = getYourToken();
  const runes = await pickDialog({
    token,
    type: "select",
    title: "Chain of Words",
  });

  if (runes.selected.length !== 2) {
    ui.notifications.error("Please target the 2 tokens you wish to chain");
    return;
  }
  const points = [];
  const flag = token?.actor?.getFlag(MODULE_ID, "runes");
  for (let rune of runes.selected) {
    const flagData = flag?.[rune.type]?.find((r) => r.id === rune.id);
    const targ =
      canvas.tokens.get(flagData?.target?.token) ||
      canvas.tokens.placeables.find(
        (t) => t.actor.id === flagData?.target?.actor
      );
    if (targ) points.push(targ);
    await invokeRune({ token, runeID: rune.id, type: rune.type });
  }
  //Cancel out if one of the targets is missing
  if (points.length !== 2) return;
  const [tokenA, tokenB] = points;
  const r = new Ray(tokenA.center, tokenB.center);
  const template = await MeasuredTemplateDocument.create(
    {
      x: tokenA.center.x,
      y: tokenA.center.y,
      distance: tokenA.distanceTo(tokenB),
      t: "ray",
      direction: (r.angle * 180) / Math.PI,
      width: 5,
    },
    { parent: canvas.scene }
  );

  new Sequence({
    moduleName: game.modules.get(MODULE_ID).title,
    softFail: true,
  })
    .effect()
    .atLocation(tokenA)
    .file("jb2a.energy_beam.normal.bluepink.03")
    .stretchTo(tokenB)
    .sound()
    .file("graphics-sfx.magic.arcane.channel.01.01")
    // .effect()
    // .atLocation(tokenA)
    // .file("jb2a.icon.runes.blue")
    // .scale(0.25)
    // .stretchTo(target, { tiling: true })
    // .spriteRotation(90)
    .play({ softFail: true, preload: true });
}
