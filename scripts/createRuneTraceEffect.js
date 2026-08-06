import { getActorToGiveRuneEffect, localize } from "./misc.js";

export async function createRuneTraceEffect({
  rune,
  target,
  tokenID,
  id,
  type,
}) {
  const { name, img, enriched_desc } = rune;

  const act = getActorToGiveRuneEffect(target, tokenID);
  const targetToken = canvas.tokens.get(target?.token);
  const tokenSource = canvas.tokens.get(tokenID);

  const person = target?.token ? targetToken?.name : null;
  const object = target?.object;
  const item = target?.item;

  const effectName = localize(
    `effect.names.${object || item ? "on-object" : "on-person"}`,
    {
      etchOrTrace:
        type === "etched"
          ? localize("effect.types.etched")
          : localize("effect.types.traced"),
      name,
      object: object || item || "",
    },
  );

  const effectData = {
    type: "effect",
    name: effectName,
    img: img,
    flags: {
      "pf2e-runesmith-assistant": {
        source: {
          id,
          actorUUID: tokenSource.actor.uuid,
          type,
        },
      },
    },
    system: {
      tokenIcon: { show: true },
      duration: {
        value: 1,
        unit: type === "etched" ? "unlimited" : "rounds",
        sustained: false,
        expiry: "turn-end",
      },
      description: {
        value: enriched_desc,
      },
      unidentified: false,
      traits: {
        custom: "",
        rarity: "common",
        value: rune.traits,
      },
      rules: object
        ? []
        : rune.effects.map((effectUUID) => ({
            key: "GrantItem",
            onDeleteActions: {
              grantee: "restrict",
            },
            allowDuplicate: true,
            uuid: effectUUID,
          })),
      level: {
        value: tokenSource?.actor?.level ?? 1,
      },
      context: {
        origin: {
          actor: tokenSource.actor.uuid,
          token: tokenSource.uuid,
        },
        target: targetToken?.uuid,
      },
      source: {
        value: "created by PF2e Runesmith Assistant",
      },
      slug: game.pf2e.system.sluggify(name),
    },
  };
  const effects = await act.createEmbeddedDocuments("Item", [effectData], {
    parent: tokenSource.actor,
  });
  return effects;
}

export async function createEffect({ targetID, effectData }) {
  const targetToken = canvas.tokens.get(targetID);
  const act = targetToken?.actor;

  const effects = await act.createEmbeddedDocuments(
    "Item",
    [
      {
        ...effectData,
      },
    ],
    {
      parent: tokenSource.actor,
    },
  );
  return effects;
}
