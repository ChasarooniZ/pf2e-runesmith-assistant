import { EMPTY_RUNE_ART } from "./const.js";
import { handleSpecificRunes } from "./handleSpecificRunes.js";
import { runeInvokedMessage, targetDescription } from "./messageHelpers.js";
import { getMaxEtchedRunes, getYourToken, localize } from "./misc.js";
import { MODULE_ID } from "./module.js";

export async function invokeRuneDialog() {
  const token = getYourToken();
  const res = await pickDialog({ token });
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

export async function pickDialog({
  token,
  type = "invoke",
  title = localize("ui.buttons.invoke-menu"),
}) {
  const actor = token?.actor ?? game.user.character;
  if (!actor) {
    console.warning(
      "[PF2e Runesmith Assistant] No Actor selected to open Invoke Dialog",
    );
    return;
  }
  // Get rune flags
  const flags = actor?.getFlag(MODULE_ID, "runes");
  const etched = flags?.etched ?? [];
  const traced = flags?.traced ?? [];
  if (etched.length === 0 && traced.length === 0) {
    ui.notifications.error(localize("notifications.no-runes-applied"));
    return;
  }

  const MAX_ETCHED = getMaxEtchedRunes(actor);

  const unique_rune_ids = [
    ...new Set([
      ...etched.map((e) => e.rune.id),
      ...traced.map((t) => t.rune.id),
    ]),
  ];

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
    return [id, enriched.replaceAll('"', "'")];
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
          target: targetDescription(runeData.target).replaceAll('"', "'"),
        })}</i><hr>${
          enrichedDescriptions[rune.id].replaceAll('"', "'") ?? rune.name
        }"
        data-tooltip-direction="UP"
        data-rune-target='${JSON.stringify(runeData.target)}'
        >
          <input type="checkbox" name="etched" value="${runeData?.id}">
          <img src="${rune.img}">
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
          target: targetDescription(runeData.target).replaceAll('"', "'"),
        })}</i><hr>${
          enrichedDescriptions[rune.id].replaceAll('"', "'") ?? rune.name
        }"
        data-tooltip-direction="UP"
        data-rune-target='${JSON.stringify(runeData.target)}'
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
        { target: targetDescription(runeData.target).replaceAll('"', "'") },
      )}</i><hr><fieldset>${enrichedDescriptions[rune.id].replaceAll(
        '"',
        "'",
      )}</fieldset>"
        data-tooltip-direction="UP"
        data-rune-target='${JSON.stringify(runeData.target)}'
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
        ${renderTracedRunes(traced, localize("ui.sections.traced"))}
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
            // Collect all checked checkboxes for both types
            let etchedIds = Array.from(
              $(html).find("input[type='checkbox'][name='etched']:checked"),
            ).map((e) => e.value);
            let tracedIds = Array.from(
              $(html).find("input[type='checkbox'][name='traced']:checked"),
            ).map((e) => e.value);

            // Compose result: array of {id, type}
            let selected = [
              ...etchedIds.map((id) => ({ id, type: "etched" })),
              ...tracedIds.map((id) => ({ id, type: "traced" })),
            ];
            if (selected.length) resolve({ selected, action: "invoke" });
          },
          icon: "fa-solid fa-hand-holding-magic",
        },
        {
          action: "dispel",
          label: localize("keywords.dispel"),
          callback: async (event, button, dialog) => {
            const html = dialog.element ? dialog.element : dialog;
            let etchedIds = Array.from(
              $(html).find("input[type='checkbox'][name='etched']:checked"),
            ).map((e) => e.value);
            let tracedIds = Array.from(
              $(html).find("input[type='checkbox'][name='traced']:checked"),
            ).map((e) => e.value);
            let selected = [
              ...etchedIds.map((id) => ({ id, type: "etched" })),
              ...tracedIds.map((id) => ({ id, type: "traced" })),
            ];
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
          let etchedIds = Array.from(
            $(html).find("input[type='checkbox'][name='etched']:checked"),
          ).map((e) => e.value);
          let tracedIds = Array.from(
            $(html).find("input[type='checkbox'][name='traced']:checked"),
          ).map((e) => e.value);
          let selected = [
            ...etchedIds.map((id) => ({ id, type: "etched" })),
            ...tracedIds.map((id) => ({ id, type: "traced" })),
          ];
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
  const { target } = flag[type].find((r) => r.id === runeID);
  flag[type] = flag?.[type]?.filter((r) => r.id !== runeID);
  await actor.setFlag(MODULE_ID, "runes", flag);
  game.pf2eRunesmithAssistant.socket.executeAsGM("deleteEffect", {
    id: runeID,
    target,
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
  //console.log({ flagData });
  const rune = await fromUuid(flagData.rune.uuid);
  const invocation = getInvocation(
    rune?.description ??
      game.i18n.localize(
        "pf2e-runesmith-assistant.ui.tooltip.no-rune-description",
      ),
  );

  const traits = [
    ...new Set([
      "invocation",
      "magical",
      "runesmith",
      ...(rune?.traits ? rune.traits.toObject() : []),
      ...invocation.traits,
    ]),
  ];

  flag[type] = flag?.[type]?.filter((r) => r.id !== runeID);

  await runeInvokedMessage({
    token: tok,
    actor,
    rune,
    target,
    traits,
    invocation: invocation.desc,
  });

  handleSpecificRunes({
    rune,
    target,
    srcToken: tok.id,
    invocation: invocation.desc,
  });
  game.pf2eRunesmithAssistant.socket.executeAsGM("deleteEffect", {
    id: runeID,
    target,
    srcTokenID: tok.id,
  });
  await actor.setFlag(MODULE_ID, "runes", flag);
}

const STRICT_INVOCATION_REGEX =
  /<strong>Invocation<\/strong>(?:\s*\([^)]+\))?\s*([\s\S]*)/;
const INVOCATION_TRAITS_REGEX = /<strong>Invocation<\/strong>\s*\(([^)]*)\)/;
function getInvocation(description) {
  //console.log({ test: description.match(STRICT_INVOCATION_REGEX) });
  const desc = description.match(STRICT_INVOCATION_REGEX)?.[1];
  const traits =
    description
      .match(INVOCATION_TRAITS_REGEX)?.[1]
      ?.split(",")
      ?.map((t) => t.trim()) ?? [];
  return { desc: desc ? `<p>${desc}` : description, traits };
}
