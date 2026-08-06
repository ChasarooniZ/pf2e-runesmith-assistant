import { MODULE_ID } from "./module.js";

export function getEffectsStrings(description) {
  const regex = /@UUID\[([^\]]+)\](?=\{(?:Spell )?Effect: )/g;
  return description.match(regex)?.map((str) => str?.slice(6, -1)) ?? [];
}

export function getYourToken() {
  return (
    canvas.tokens.controlled?.[0] ||
    canvas.tokens.placeables.find(
      (t) => t?.actor?.id === game?.user?.character?.id,
    )
  );
}

export function getMaxEtchedRunes(actor) {
  return 2 + Math.floor((actor.level - 1) / 4);
}

export function hasFeat(actor, slug) {
  return actor.itemTypes.feat.some((feat) => feat.slug === slug);
}

export function localize(str, options = {}) {
  return game.i18n.format(`${MODULE_ID}.${str}`, options);
}

export function isRunesmith(actor) {
  return (
    actor &&
    (actor.class?.slug === "runesmith" ||
      actor.rollOptions.all["class:runesmith"])
  );
}

export function getTokenImage(token) {
  return token?.ring?.enabled
    ? (token?.ring?.subject?.texture ?? token?.texture?.src)
    : token?.texture?.src || "icons/svg/cowled.svg";
}

export function getActorToGiveRuneEffect(targetData, runesmithID) {
  const targetToken = canvas.tokens.get(targetData?.token);
  const tokenSource = canvas.tokens.get(runesmithID);
  return targetData?.object ? tokenSource?.actor : targetToken?.actor;
}

/**
 *
 * @param {*} actor Actor to get owner of
 * @returns ID of token owner or the GM
 */
export function getActorOwnerOnline(actor) {
  const entry = Object.entries(actor.ownership).find(
    ([userID, permission]) =>
      permission === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER &&
      !game.users.get(userID)?.isGM &&
      game.users.get(userID)?.active,
  );
  return entry?.[0] ? entry?.[0] : game.users.activeGM?.id;
}

export function convertItemUUIDFromSF2eToPF2e(uuid) {
  if (!uuid) return null;
  let finalUUID = uuid;
  if (game.system.id === "sf2e") {
    finalUUID = finalUUID
      .replace(".sf2e.", ".pf2e.")
      .replace(".pf2e-anachronism.", ".pf2e.")
      .replace(
        ".starfinder-field-test-for-pf2e.actions.",
        ".starfinder-field-test-for-pf2e.sf2e-actions.",
      )
      .replace(
        ".starfinder-field-test-for-pf2e.feats.",
        ".starfinder-field-test-for-pf2e.sf2e-feats.",
      )
      .replace(".actions.", ".actionspf2e.")
      .replace(".class-features.", ".classfeatures.")
      .replace(".conditions.", ".conditionitems.")
      .replace(".equipment.", ".equipment-srd.")
      .replace(".feats.", ".feats-srd.")
      .replace(".macros.", ".pf2e-macros.")
      .replace(".spells.", ".spells-srd.")
      .replace(
        ".pf2e-runesmith-assistant-items.",
        ".sf2e-runesmith-assistant-items.",
      );
  }

  return finalUUID;
}

export function convertSpecificItemsToSF2e(uuids) {
  if (!uuids) return null;
  if (game.system.id === "sf2e") {
    return uuids.map((uuid) =>
      uuid
        .replace(".sf2e.", ".pf2e.")
        .replace(".pf2e.", ".pf2e-anachronism.")
        .replace(".actionspf2e.", ".actions.")
        .replace(".classfeatures.", ".class-features.")
        .replace(".conditionitems.", ".conditions.")
        .replace(".equipment-srd.", ".equipment.")
        .replace(".feats-srd.", ".feats.")
        .replace(".pf2e-macros.", ".macros.")
        .replace(".spells-srd.", ".spells.")
        .replace(
          ".sf2e-runesmith-assistant-items.",
          ".pf2e-runesmith-assistant-items.",
        ),
    );
  } else {
    return uuids;
  }
}
