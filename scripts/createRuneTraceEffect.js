import { getActorToGiveRuneEffect, localize } from "./misc.js";

export async function createRuneTraceEffect({
  rune,
  target,
  tokenID,
  id,
  type,
}) {
  const { name, img, enriched_desc, slug } = rune;

  const act = getActorToGiveRuneEffect(target, tokenID);
  const targetToken = canvas.tokens.get(target?.token);
  const tokenSource = canvas.tokens.get(tokenID);

  const runesmith = tokenSource?.actor;

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

  const rules = rune.effects.map((effectUUID) => ({
    key: "GrantItem",
    onDeleteActions: {
      grantee: "restrict",
    },
    allowDuplicate: true,
    uuid: effectUUID,
  }));

  switch (slug) {
    case "atryl-rune-of-fire": {
      const fireRes = act?.system?.attributes?.resistances?.find(
        (res) => res.type === "fire",
      );
      if (fireRes) {
        rules.push(
          {
            key: "Resistance",
            doubleVs: fireRes.doubleVs,
            definition: fireRes.definition,
            type: fireRes.type,
            value: fireRes.value,
            source: fireRes.source,
            mode: "remove",
            priority: 101,
          },
          {
            key: "Resistance",
            doubleVs: fireRes.doubleVs,
            exceptions: fireRes.exceptions,
            definition: fireRes.definition,
            type: fireRes.type,
            value: Math.max(
              fireRes?.value - (Math.floor((runesmith?.level ?? 0) / 2) + 5),
              0,
            ),
            source: fireRes.source,
            priority: 102,
          },
        );
      }
      break;
    }
    case "thullax-rune-of-corrosion": {
      const resistances = act?.system?.attributes?.resistances?.filter((res) =>
        ["physical", "bludgeoning", "piercing", "slashing"].includes(res.type),
      );
      if (resistances?.length > 0) {
        resistances.forEach((res) => {
          rules.push(
            {
              key: "Resistance",
              doubleVs: res.doubleVs,
              definition: res.definition,
              type: res.type,
              value: res.value,
              source: res.source,
              mode: "remove",
              priority: 101,
            },
            {
              key: "Resistance",
              doubleVs: res.doubleVs,
              exceptions: res.exceptions,
              definition: res.definition,
              type: res.type,
              value: Math.max(
                res?.value - (Math.floor((runesmith?.level ?? 0) / 2) + 1),
                0,
              ),
              source: res.source,
              priority: 102,
            },
          );
        });
      }
      break;
      break;
    }
    default:
      break;
  }

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
      rules: object ? [] : rules,
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
