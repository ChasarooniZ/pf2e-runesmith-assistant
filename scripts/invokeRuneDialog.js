import { EMPTY_RUNE_ART } from "./const.js";
import { handleSpecificRunes } from "./handleSpecificRunes.js";
import { runeInvokedMessage, targetDescription } from "./messageHelpers.js";
import {
  canOnlyEtch,
  getMaxEtchedRunes,
  getTraitsHTML,
  getYourToken,
  localize,
} from "./misc.js";
import { MODULE_ID } from "./module.js";

export async function invokeRuneDialog() {
  const token = getYourToken();
  const res = await pickRuneDialog({ token });
  //console.log({ res });

  if (res?.action === "dispel") {
    for (let sel of res.selected) {
      await dispelRune({ token, runeID: sel.id, type: sel.type });
    }
  } else if (res?.action === "invoke") {
    for (let sel of res.selected) {
      await invokeRune({ token, runeID: sel.id, type: sel.type });
    }
  }
}

export async function pickRuneDialog({
  token,
  type = "invoke",
  title = localize("ui.buttons.invoke-menu"),
}) {
  const actor = token?.actor ?? game.user.character;
  if (!actor) {
    console.warn(
      "[PF2e Runesmith Assistant] No Actor selected to open Invoke Dialog",
    );
    return;
  }
  // Get rune flags
  const flags = actor?.getFlag(MODULE_ID, "runes");
  const etched = (flags?.etched ?? []).filter(
    (r) =>
      type !== "select" ||
      (!r.diacritic && !r.rune.traits.includes("diacritic")),
  );
  const traced = (flags?.traced ?? []).filter(
    (r) =>
      type !== "select" ||
      (!r.diacritic && !r.rune.traits.includes("diacritic")),
  );
  if (etched.length === 0 && traced.length === 0) {
    ui.notifications.error(localize("notifications.no-runes-applied"));
    return;
  }

  const MAX_ETCHED = getMaxEtchedRunes(actor);

  const unique_rune_ids = Array.from(
    new Set([etched, traced].flat().map((i) => i?.rune?.id)),
  );

  const enrichedPromises = unique_rune_ids.map(async (id) => {
    const r = actor.items.get(id);
    if (!r) return [id, "Rune no longer exists on this character"];
    const rollData = r.getRollData();
    const enriched =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        r.description,
        {
          rollData,
          async: true,
        },
      );
    return [id, enriched.replaceAll('"', "&quot;")];
  });
  const enrichedPairs = await Promise.all(enrichedPromises);
  const enrichedDescriptions = Object.fromEntries(enrichedPairs);

  // Helper to render etched runes as selectable, with names below
  function renderEtchedRunes(runes, max, label) {
    let html = `<div class="rune-section"><div class="rune-label">${label}</div><div class="form-group">`;

    // Separate runes
    let regularRunes = [];
    let emptySlots = [];
    let freeRunes = [];

    for (let i = 0; i < max; i++) {
      let runeData = runes[i];
      if (runeData?.rune) {
        if (runeData.free) {
          freeRunes.push(runeData);
        } else {
          regularRunes.push(runeData);
        }
      } else {
        emptySlots.push(null); // Just a placeholder for empty slot
      }
    }

    // Render regular runes
    for (let runeData of regularRunes) {
      let rune = runeData.rune;
      html += `<label class="rune-label rune-item${
        runeData?.id ? "" : " placeholder"
      }"
        data-tooltip="<i>${localize("dialog.invoke.applied-to", {
          target: targetDescription(runeData.target).replaceAll('"', "&quot;"),
        })}</i><hr>${getTraitsHTML(rune.traits)}${
          enrichedDescriptions[rune.id].replaceAll('"', "&quot;") ?? rune.name
        }"
        data-tooltip-direction="UP"
        data-rune-target="${JSON.stringify(runeData.target).replaceAll('"', "&quot;")}"
        >
          <input type="checkbox" name="etched" value="${runeData?.id}">
          <img src="${rune.img}" class="${rune?.diacritic ? "diacritic" : ""}">
          <span class="rune-name">${rune.name}</span>
      </label>`;
    }

    // Render empty slots
    for (let _ of emptySlots) {
      html += `<span class="rune-icon temp" data-tooltip="${localize(
        "ui.tooltip.empty-rune-slot",
      )}" data-tooltip-direction="UP">
          <img src="${EMPTY_RUNE_ART}">
          <span class="rune-name">${localize(
            "dialog.empty-rune-slot-filler-name",
          )}</span>
        </span>`;
    }

    // Render free runes at the end
    for (let runeData of freeRunes) {
      let rune = runeData.rune;
      html += `<label class="rune-label rune-item${
        runeData?.id ? "" : " placeholder"
      }"
        data-tooltip="<i>${localize("dialog.invoke.applied-to", {
          target: targetDescription(runeData.target).replaceAll('"', "&quot;"),
        })}</i><hr>${
          enrichedDescriptions[rune.id].replaceAll('"', "&quot;") ?? rune.name
        }"
        data-tooltip-direction="UP"
        data-rune-target="${JSON.stringify(runeData.target).replaceAll('"', "&quot;")}"
        >
          <input type="checkbox" name="etched" value="${runeData?.id}">
          <img src="${rune.img}">
          <span class="rune-name">${rune.name}</span>
      </label>`;
    }

    html += `</div></div>`;
    return html;
  }

  // Helper to render traced runes in a grid/list
  function renderTracedRunes(runes, label) {
    let html = `<div class="rune-section"><div class="rune-label">${label}</div><div class="form-group">`;
    for (let runeData of runes) {
      let rune = runeData?.rune;
      html += `<label class="radio-label rune-item" data-tooltip="<i>${localize(
        "dialog.invoke.applied-to",
        {
          target: targetDescription(runeData.target).replaceAll('"', "&quot;"),
        },
      )}</i><hr><fieldset>${enrichedDescriptions[rune.id].replaceAll(
        '"',
        "'",
      )}</fieldset>"
        data-tooltip-direction="UP"
        data-rune-target="${JSON.stringify(runeData.target).replaceAll('"', "&quot;")}"
        >
            <input type="checkbox" name="traced" value="${runeData?.id}">
            <img src="${rune.img}" ${
              runeData.free ? 'class="rune-purple-shadow"' : ""
            }>
            <span class="rune-name">${rune.name}</span>
        </label>`;
    }
    html += `</div></div>`;
    return html;
  }

  // Compose dialog content
  let content = `
    <form class="runepicker">
        ${renderEtchedRunes(etched, MAX_ETCHED, localize("ui.sections.etched"))}
        <hr>
        ${canOnlyEtch(actor) ? "" : renderTracedRunes(traced, localize("ui.sections.traced"))}
    </form>
    `;

  const buttons = [];

  // Show dialog
  return new Promise((resolve) => {
    if (type === "invoke") {
      buttons.push(
        {
          action: "invoke",
          label: `${localize("keywords.invoke")}`,
          callback: async (event, button, dialog) => {
            const html = dialog.element ? dialog.element : dialog;
            const selected = resolveInvokeHelper(html);
            if (selected.length) resolve({ selected, action: "invoke" });
          },
          icon: "fa-solid fa-hand-holding-magic",
        },
        {
          action: "dispel",
          label: localize("keywords.dispel"),
          callback: async (event, button, dialog) => {
            const html = dialog.element ? dialog.element : dialog;
            const selected = resolveInvokeHelper(html);
            if (selected.length) resolve({ selected, action: "dispel" });
          },
          icon: "fa-solid fa-trash",
        },
      );
    } else if (type === "select") {
      buttons.push({
        action: "select",
        label: localize("keywords.select"),
        callback: async (event, button, dialog) => {
          const html = dialog.element ? dialog.element : dialog;
          const selected = resolveInvokeHelper(html);
          if (selected.length) resolve({ selected, action: "select" });
        },
        icon: "fa-solid fa-circle-check",
      });
    }
    foundry.applications.api.DialogV2.wait({
      window: {
        title,
        controls: [
          {
            action: "kofi",
            label: "Support Dev",
            icon: "fa-solid fa-mug-hot fa-beat-fade",
            onClick: () =>
              window.open("https://ko-fi.com/chasarooni", "_blank"),
          },
        ],
        icon: "far fa-chart-network",
      },
      content,
      position: {
        width: 500,
      },
      buttons,
      render: (_event, app) => {
        const html = app.element ? app.element : app;
        html
          .querySelectorAll(".rune-item:not(.placeholder)")
          .forEach((element) => {
            element.addEventListener("mouseenter", addHighlight);
            element.addEventListener("mouseleave", removeHighlight);
          });
      },
    });
  });
}

function resolveInvokeHelper(html) {
  const etchedIds = Array.from(
    $(html).find("input[type='checkbox'][name='etched']:checked"),
  ).map((e) => e.value);
  const tracedIds = Array.from(
    $(html).find("input[type='checkbox'][name='traced']:checked"),
  ).map((e) => e.value);
  return [
    etchedIds.map((id) => ({ id, type: "etched" })),
    tracedIds.map((id) => ({ id, type: "traced" })),
  ].flat();
}

function addHighlight() {
  const target = this.dataset.runeTarget
    ? JSON.parse(this.dataset.runeTarget)
    : null;
  if (target?.type === "person" && target?.token && canvas?.tokens) {
    const token =
      canvas.tokens.get(target.token) ||
      canvas.tokens.placeables.find((t) => t.actor?.id === target.actor);
    if (token) {
      token.emit("hoverToken", true); // highlight token
    }
  }
}

function removeHighlight() {
  const target = this.dataset.runeTarget
    ? JSON.parse(this.dataset.runeTarget)
    : null;
  if (target?.type === "person" && target?.token && canvas?.tokens) {
    const token =
      canvas.tokens.get(target.token) ||
      canvas.tokens.placeables.find((t) => t.actor?.id === target.actor);
    if (token) {
      token.emit("hoverToken", false); // remove highlight
    }
  }
}

/**
 * Removes an applied rune
 * @param {Object} param Config data
 * @param {String} param.token Runesmith Token
 * @param {Actor} param.act Runesmith Actor (optional)
 * @param {string} param.runeID Flag id of the applied rune
 * @param {'etched' | 'traced'} param.type Whether the rune is etched or traced
 */
export async function dispelRune({ token, act, runeID, type }) {
  const actor = token?.actor ?? act;
  const tok =
    token ?? canvas.tokens.placeables.find((t) => t.actor.id === actor.id);
  const flag = actor?.getFlag(MODULE_ID, "runes");

  const runeFlagData = flag[type].find((r) => r.id === runeID);
  const target = runeFlagData.target;
  if (runeFlagData?.diacritic) {
    const diacritic = runeFlagData?.diacritic;
    await dispelRuneHelper(
      flag,
      diacritic.type,
      diacritic.id,
      actor,
      target,
      tok,
    );
  }

  await dispelRuneHelper(flag, type, runeID, actor, target, tok);
}

async function dispelRuneHelper(flag, type, runeID, actor, target, tok) {
  flag[type] = flag?.[type]?.filter((r) => r.id !== runeID);
  await actor.setFlag(MODULE_ID, "runes", flag);
  game.pf2eRunesmithAssistant.socket.executeAsGM("deleteEffect", {
    id: runeID,
    target: target,
    srcTokenID: tok.id,
  });
}

/**
 * Invokes an Applied Rune
 * @param {Object} param Config data
 * @param {String} param.token Runesmith Token
 * @param {Actor} param.act Runesmith Actor (optional)
 * @param {string} param.runeID Flag id of the applied rune
 * @param {'etched' | 'traced'} param.type Whether the rune is etched or traced
 */
export async function invokeRune({ token, act, runeID, type }) {
  const actor = token?.actor ?? act;
  const tok =
    token ?? canvas.tokens.placeables.find((t) => t.actor.id === actor.id);
  const flag = actor?.getFlag(MODULE_ID, "runes");
  //console.log({ flag, token: tok, runeID, type });
  const flagData = flag?.[type]?.find((r) => r.id === runeID);
  const target = flagData.target;
  const diacriticData = await getDiacriticRuneData(flagData?.diacritic, flag);
  //console.log({ flagData });
  const rune = await fromUuid(flagData.rune.uuid);
  const invocation = getInvocation(
    rune?.description ??
      game.i18n.localize(
        "pf2e-runesmith-assistant.ui.tooltip.no-rune-description",
      ),
  );

  const traits = Array.from(
    new Set(
      [
        "invocation",
        "magical",
        "runesmith",
        rune?.traits ? Array.from(rune.traits) : [],
        Array.from(invocation.traits),
      ].flat(),
    ),
  );

  flag[type] = flag?.[type]?.filter((r) => r.id !== runeID);

  if (diacriticData) {
    flag[diacriticData.type] = flag?.[diacriticData.type]?.filter(
      (r) => r.id !== diacriticData.id,
    );
  }

  await runeInvokedMessage({
    token: tok,
    actor,
    rune,
    runeLink: diacriticData
      ? getDiacriticCombinedRuneLink(rune.link, flagData.rune.name)
      : rune.link,
    target,
    traits,
    invocation: diacriticData
      ? invocation.desc + getDiacriticDescription(diacriticData.rune)
      : invocation.desc,
  });

  handleSpecificRunes({
    rune,
    target,
    srcToken: tok.id,
    invocation: invocation.desc,
    diacritic: diacriticData?.rune,
  });
  game.pf2eRunesmithAssistant.socket.executeAsGM("deleteEffect", {
    id: runeID,
    target,
    srcTokenID: tok.id,
  });

  if (diacriticData) {
    game.pf2eRunesmithAssistant.socket.executeAsGM("deleteEffect", {
      id: diacriticData?.id,
      target,
      srcTokenID: tok.id,
    });
  }
  await actor.setFlag(MODULE_ID, "runes", flag);
}

const STRICT_INVOCATION_REGEX =
  /<strong>Invocation<\/strong>(?:\s*\([^)]+\))?\s*([\s\S]*)/;
const INVOCATION_TRAITS_REGEX = /<strong>Invocation<\/strong>\s*\(([^)]*)\)/;

/**
 *
 *
 * @param {*} diacriticFlag
 * @param {*} flag
 * @return {{flagData: any, type: string, id: string, rune: Item} | null}
 */
async function getDiacriticRuneData(diacriticFlag, flag) {
  if (diacriticFlag) {
    const diacriticFlagData = flag?.[diacriticFlag?.type]?.find(
      (r) => r.id === diacriticFlag?.id,
    );
    const diacriticRune = await fromUuid(diacriticFlagData.rune.uuid);
    return {
      flagData: diacriticRune,
      type: diacriticFlag.type,
      id: diacriticFlag.id,
      rune: diacriticRune,
    };
  } else {
    return null;
  }
}

function getDiacriticDescription(rune) {
  return `<hr><hr>${rune.link}<hr>${rune.description}`;
}

function getDiacriticCombinedRuneLink(link, combinedName) {
  return `${link.substring(0, link.indexOf("{") + 1)}${combinedName}}`;
}

function getInvocation(description) {
  const desc = description.match(STRICT_INVOCATION_REGEX)?.[1];
  const traits =
    description
      .match(INVOCATION_TRAITS_REGEX)?.[1]
      ?.split(",")
      ?.map((t) => t.trim()) ?? [];
  return { desc: desc ? `<p>${desc}` : description, traits };
}
