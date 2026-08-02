import { ALLIANCES, ITEMS, RUNES } from "./const.js";
import { localize } from "./misc.js";
import { getAllowedTokenName } from "./targetDialog.js";

/**
 * Creates a rune Apply Message
 * @param {Object} param Config data
 * @param {Actor} param.actor Actor
 * @param {Token} param.token Token
 * @param {Item} param.rune Rune Item
 * @param {any} param.target Target rune is applied to
 * @param {"etched" | "traced"} param.type Etched or Traced
 * @param {'' | '0' | '1' | '2' | '3' | 'r'} param.action Action cost
 */
export async function runeAppliedMessage({
  actor,
  token,
  rune,
  target,
  type,
  action,
}) {
  const traceDistance =
    action === "2"
      ? ` (${localize("message.apply.traced.ft", { distance: 30 })})`
      : "";
  await ChatMessage.create({
    author: game.user.id,
    content: applyMessageHelper({ rune, target, type }),
    speaker: ChatMessage.getSpeaker({
      actor: actor,
      token: token?.document ?? token,
    }),
    flavor: await getMessageFlavor({
      traits:
        type === "etched"
          ? ["exploration"]
          : ["concentrate", "magical", "manipulate", "runesmith"],
      name: localize(`message.apply.${type}.rune`, { distance: traceDistance }),
      glyph: type === "etched" ? "" : action,
    }),
    flags: {
      pf2e: {
        origin: {
          actor: actor.uuid,
          sourceId: actor.id,
          uuid: ITEMS.TRACE_RUNE,
          type: "action",
        },
        context: {
          target: {
            token: canvas.tokens.get(target?.token)?.uuid,
          },
        },
      },
    },
  });
}

function applyMessageHelper({ rune, target, type }) {
  //const action = type === "etched" ? "Etched" : "Traced";
  let targetText = "";

  if (target.type === "object") {
    targetText = ` ${localize("message.apply.onto")} <b><u>${
      target.object
    }</u></b>`;
  } else if (target.type === "person") {
    const tokenName = getAllowedTokenName(canvas.tokens.get(target?.token));
    if (target?.location === "actor") {
      targetText = ` ${localize(
        "message.apply.onto",
      )} <b><u>${tokenName}</u></b>`;
    } else if (target?.location === "item") {
      targetText = ` ${localize(
        "message.apply.onto",
      )} <u><b>${tokenName}</b>${localize("message.apply.'s")} <b>${
        target.item
      }</b></u>`;
    }
  }

  return `${rune.link}${targetText}`;
}

export async function runeInvokedMessage({
  actor,
  token,
  rune,
  target,
  traits,
  invocation,
}) {
  const rollData = rune.getRollData();
  const enrichedDescription =
    await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      invocation,
      {
        rollData,
      },
    );

  const flags = {
    pf2e: {
      origin: {
        actor: actor.uuid,
        sourceId: actor.id,
        uuid: rune.uuid,
        type: "action",
      },
      context: {
        target: {
          token: canvas.tokens.get(target?.token)?.uuid,
        },
      },
    },
  };

  if (game.modules.get("pf2e-toolbelt")?.active) {
    const flagInfo = handleToolbelt({
      description: enrichedDescription,
      sourceUUID: actor?.uuid,
      target,
      runeUUID: rune?.uuid,
      traits: rune?.system?.traits?.value,
      runeSourceID: rune.sourceId,
      sourceAlliance: actor?.alliance,
    });
    if (flagInfo) {
      flags["pf2e-toolbelt"] = flagInfo;
    }
  }

  await ChatMessage.create({
    author: game.user.id,
    content: `<b>${rune?.link}</b> <i>on ${targetDescription(
      target,
    )}</i><hr><fieldset>${enrichedDescription}</fieldset>`,
    speaker: ChatMessage.getSpeaker({
      actor: actor,
      token: token?.document ?? token,
    }),
    flavor: await getMessageFlavor({
      traits: traits,
      name: localize("message.invoke.rune"),
      glyph: "1",
    }),
    flags,
  });
}

function handleToolbelt({
  description,
  sourceUUID,
  target,
  runeUUID,
  traits,
  runeSourceID,
  sourceAlliance = "party",
}) {
  const dcInfo = getDCInfo(description);
  if (!dcInfo) return null;

  const targetToken =
    target?.type === "object" ? null : getToken(target.token, target.actor);

  let targets;
  if (game.user.targets.size > 1 || !targetToken) {
    targets = [...game.user.targets].map((t) => t.document.uuid);
  } else {
    targets = targetToken ? [targetToken?.document?.uuid] : [];
  }

  if (runeSourceID === RUNES["trolistri-forlorn-sorrow"] && targetToken) {
    const enemyAlliances = new Set(
      ALLIANCES.filter((a) => a !== sourceAlliance),
    );
    targets = canvas.tokens.placeables
      .filter(
        (t) =>
          enemyAlliances.has(t?.actor?.alliance) &&
          targetToken.distanceTo(t) <= 20,
      )
      .map((t) => t?.document?.uuid);
  }

  return {
    targetHelper: {
      type: "action",
      author: sourceUUID,
      item: runeUUID,
      itemUUID: runeUUID,
      traits: traits ?? [],
      options: dcInfo.basic ? ["damaging-effect"] : [],
      saveVariants: {
        null: {
          basic: dcInfo.basic,
          dc: dcInfo.dc,
          statistic: dcInfo.statistic,
        },
      },
      targets: targets,
    },
  };
}

export function getDCInfo(description) {
  const DC_REGEXES = [
    /(data-pf2-dc=")(\d+)(")/g,
    /(@Check\[.*?type:.*?|dc:)(\d+)(.*?])/g,
  ];

  // Look for data-pf2-check attribute to get the statistic
  const checkMatch = description.match(/data-pf2-check="([^"]+)"/);
  const statistic = checkMatch ? checkMatch[1] : null;

  // Look for DC value in spans and check if "Basic" is present
  const spanMatch = description.match(
    /<span[^>]*>DC\s+(\d+)<\/span>\s*([^<]*)</i,
  );
  let dcValue = null;
  let isBasic = false;

  if (spanMatch) {
    dcValue = Number.parseInt(spanMatch[1]);
    isBasic = spanMatch[2].toLowerCase().includes("basic");
  } else {
    for (const regex of DC_REGEXES) {
      regex.lastIndex = 0;
      const match = regex.exec(description);
      if (match !== null) {
        dcValue = Number.parseInt(match[2]);
        break;
      }
    }
  }

  if (dcValue !== null) {
    return {
      dc: dcValue,
      statistic: statistic,
      isBasic: isBasic,
    };
  }

  return null;
}

async function getMessageFlavor({
  traits = [],
  name = "",
  effect = undefined,
  glyph = "",
}) {
  return await renderTemplate(
    "systems/pf2e/templates/actors/actions/simple/chat-message-flavor.hbs",
    {
      effect: effect,
      glyph: glyph,
      name: name,
      traits: traits.map((trait) => ({
        description: CONFIG.PF2E.traitsDescriptions[trait],
        label: CONFIG.PF2E.actionTraits[trait] ?? trait,
        slug: trait,
      })),
    },
  );
}

export function targetDescription(target) {
  if (!target) {
    return "";
  } else if (target?.type === "object") {
    return target?.object || localize("message.target.an-object");
  } else {
    const token = getToken(target.token, target.actor);
    const name = token?.name ?? target.personName;
    const item = target?.item;
    return `${name}${item ? "'s " : ""}${item || ""}`;
  }
}

function getToken(tokenID, actorID) {
  return (
    canvas.tokens.get(tokenID) ||
    canvas.tokens.placeables.find((t) => t.actor.id === actorID)
  );
}
