import { localize } from "./misc.js";

const SKILL_TRADITIONS = [
  { skill: "arcana", tradition: "arcane" },
  { skill: "religion", tradition: "divine" },
  { skill: "nature", tradition: "primal" },
  { skill: "occultism", tradition: "occult" },
];

export const MAGICAL_TRADITIONS = new Set([
  "arcane",
  "divine",
  "primal",
  "occult",
  "magical",
]);

/**
 *
 * @param {*} actor
 * @returns Promise<string>
 */
export async function askTraditionChange(actor, rune) {
  const availableTraditions = SKILL_TRADITIONS.filter(
    ({ skill }) => actor.system.skills?.[skill]?.rank > 0,
  ).map(({ tradition }) => tradition);

  const traditionsHTML = availableTraditions.map((tradition) => {
    const traitLocalized = game.i18n.format(
      `PF2E.Trait${tradition.charAt(0).toUpperCase()}${tradition.slice(1)}`,
    );
    return `<label><input type="radio" name="tradition" value="${tradition}"> ${traitLocalized}</label>`;
  }).join("");

  const res = await foundry.applications.api.DialogV2.input({
    window: {
      title: localize("dialog.tradition-menu.title"),
      icon: "",
    },
    content: await foundry.applications.ux.TextEditor.implementation
      .enrichHTML(`
              @UUID[${rune.uuid}]
    <label><input type="radio" name="tradition" value="magical" checked> ${game.i18n.format("PF2E.TraitMagical")}</label>
           ${traditionsHTML}`),
    ok: {
      label: "PF2E.SelectLabel",
      icon: "fa-solid fa-check",
    },
  });

  return res?.tradition;
}
