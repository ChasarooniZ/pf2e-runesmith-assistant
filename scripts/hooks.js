import { EMPTY_RUNE_ART, MSG_ITEMS } from "./const.js";
import { chainOfWords } from "./handleSpecificActions.js";
import {
  dispelRune,
  invokeRune,
  invokeRuneDialog,
} from "./invokeRuneDialog.js";
import { getDCInfo, targetDescription } from "./messageHelpers.js";
import {
  canOnlyEtch,
  getMaxEtchedRunes,
  getRuneClasses,
  getTraitsHTML,
  hasFeat,
  isRunesmith,
  localize,
} from "./misc.js";
import { MODULE_ID } from "./module.js";
import { runeEtchTraceDialog } from "./etchTraceRuneDialog.js";

export function setupHooks() {
  Hooks.on("preDeleteItem", async (effect, _misc, _userID) => {
    if (!game.user.isGM) return;
    if (effect.type !== "effect") return;

    const srcFlag = effect?.flags?.[MODULE_ID]?.source;
    if (!srcFlag?.id) return;

    const { id, actorUUID, type } = srcFlag;
    const actor = await fromUuid(actorUUID);
    const flags = actor.getFlag(MODULE_ID, "runes");
    const rune = flags?.[type]?.find((r) => r.id === id);
    flags[type] = flags?.[type]?.filter((r) => r.id !== id);
    if (rune) {
      await actor.setFlag(MODULE_ID, "runes", flags);
    }
  });

  Hooks.on("renderCharacterSheetPF2e", async (_sheet, html, character) => {
    const actor = _sheet.actor;
    if (
      character.owner &&
      (isRunesmith(actor) || hasFeat(actor, "runesmith-dedication"))
    ) {
      //console.log({ _sheet, html, character });

      const actor = _sheet.actor;

      const runes = actor.getFlag(MODULE_ID, "runes");
      const etched = runes?.etched ?? [];
      const traced = runes?.traced ?? [];

      const unique_rune_ids = [
        ...new Set([
          ...etched.map((e) => e.rune.id),
          ...traced.map((t) => t.rune.id),
        ]),
      ];
      const rollData = actor.getRollData();

      const enrichedPromises = unique_rune_ids.map(async (id) => {
        const r = actor.items.get(id);
        if (!r) return [id, "Rune no longer exists on this character"];
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

      //console.log(runes);

      const MAX_ETCHED = getMaxEtchedRunes(actor);

      // Build Etched Runes section (with placeholders)
      // Split runes
      const regularEtched = etched.filter((r) => !r.free);
      const freeEtched = etched.filter((r) => r.free);

      // Calculate empty slots (based on regularEtched only)
      const emptyCount = Math.max(0, MAX_ETCHED - regularEtched.length);

      let etchedHtml = `
  <div class="runesmith-assistant runes-section etched-runes">
    <label><strong>${localize("ui.sections.etched")}</strong></label>
    <div class="runes-row">
      ${regularEtched
        .map(
          (r) => `<img
                      src="${r.rune.img}" 
                      data-tooltip="${runeTooltip(
                        r,
                        enrichedDescriptions[r.rune.id],
                      )}" 
                      data-tooltip-direction="UP" 
                      class="rune-img ${getRuneClasses(r)}"
                      data-rune-id="${r.id}"
                      data-rune-type="etched">`,
        )
        .join("")}
      ${Array.from({ length: emptyCount })
        .map(
          () => `<img
                    src="${EMPTY_RUNE_ART}"
                    data-tooltip="Empty Rune Slot"
                    class="rune-img placeholder"
                  >`,
        )
        .join("")}
      ${freeEtched
        .map(
          (r) => `<img
                      src="${r.rune.img}" 
                      data-tooltip="${runeTooltip(
                        r,
                        enrichedDescriptions[r.rune.id],
                      )}" 
                      data-tooltip-direction="UP" 
                      class="rune-img free-etched ${getRuneClasses(r)}"
                      data-rune-id="${r.id}"
                      data-rune-type="etched">`,
        )
        .join("")}
    </div>
  </div>
`;

      // Build Traced Runes section (no placeholders, wraps)
      let tracedHtml = canOnlyEtch(actor)
        ? ""
        : `
  <div class="runesmith-assistant runes-section traced-runes">
    <label><strong>${localize("ui.sections.traced")}</strong></label>
    <div class="runes-row">
      ${traced
        .map(
          (r) => `
        <img src="${r.rune.img}" 
          data-tooltip="${runeTooltip(r, enrichedDescriptions[r.rune.id])}" 
          data-tooltip-direction="UP" 
          class="rune-img ${getRuneClasses(r)}"
          data-rune-id="${r.id}"
          data-rune-type="traced">
      `,
        )
        .join("")}
    </div>
  </div>
`;

      let buttonsHtml = `
  <div class="runes-buttons">
    <button type="button" class="invoke-runes-btn"><i class='fa-solid fa-hand-holding-magic'></i> ${localize(
      "ui.buttons.invoke-menu",
    )}</button>
    <button type="button" class="etch-trace-btn"><i class='fa-solid fa-pencil'></i> ${localize(
      canOnlyEtch(actor)
        ? "ui.buttons.etch-menu"
        : "ui.buttons.etch-trace-menu",
    )}</button>
  </div>
`;

      // Combine sections with a horizontal line
      let fieldsetHtml = `
  <fieldset class="runes-fieldset">
  <h4>${localize("ui.header")}</h4>
    ${etchedHtml}
    <hr>
    ${tracedHtml}
    ${buttonsHtml}
  </fieldset>
`;

      const strikesList = html.find(".sheet-body .strikes-list");
      strikesList.after(fieldsetHtml);

      const runesFieldset = html.find(".runes-fieldset");

      // Rune image click: open dialog to invoke
      runesFieldset
        .find(".rune-img:not(.placeholder)")
        .on("click", async function (event) {
          const runeID = event.target.dataset.runeId;
          const runeType = event.target.dataset.runeType;
          const runeData = runes[runeType].find((r) => r.id === runeID);
          const content =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(
              `<p>${localize("ui.quick-action.invoke.want-to-invoke")} <strong>${
                runeData.rune.name
              }</strong> ${localize("ui.quick-action.on-target", {
                target: `<i>${targetDescription(runeData.target).replaceAll(
                  '"',
                  "'",
                )}</i>`,
              })}?</p><hr><fieldset>${
                enrichedDescriptions[runeData.rune.id]
              }</fieldset>`,
              {
                rollData,
                async: true,
              },
            );

          foundry.applications.api.DialogV2.wait({
            window: {
              title: localize("dialog.invoke.title"),
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
            position: {
              width: 500,
            },
            content,
            buttons: [
              {
                action: "invoke",
                label: `${localize("keywords.invoke")}`,
                callback: () => {
                  invokeRune({ act: actor, runeID, type: runeType });
                },
                icon: "fa-solid fa-hand-holding-magic",
              },
              {
                action: "cancel",
                icon: "fa-solid fa-xmark",
                label: "Cancel",
              },
            ],
          });
        });

      // Rune image right click: open dialog to dispel
      runesFieldset
        .find(".rune-img:not(.placeholder)")
        .on("contextmenu", async function (event) {
          const runeID = event.target.dataset.runeId;
          const runeType = event.target.dataset.runeType;
          const runeData = runes[runeType].find((r) => r.id === runeID);
          const content =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(
              `<p>${localize("ui.quick-action.dispel")} <strong>${
                runeData.rune.link
              }</strong> ${localize("ui.quick-action.on-target", {
                target: `<i>${targetDescription(runeData.target).replaceAll(
                  '"',
                  "'",
                )}</i>`,
              })}?</p><hr>
            <fieldset>${enrichedDescriptions[runeData.rune.id]}</fieldset>`,
              {
                rollData,
                async: true,
              },
            );

          foundry.applications.api.DialogV2.wait({
            window: {
              title: localize("dialog.dispel.title"),
              controls: [
                {
                  action: "kofi",
                  label: "Support Dev",
                  icon: "fa-solid fa-mug-hot fa-beat-fade",
                  onClick: () =>
                    window.open("https://ko-fi.com/chasarooni", "_blank"),
                },
              ],
              icon: "fa-solid fa-trash",
            },
            position: {
              width: 500,
            },
            content,
            buttons: [
              {
                label: localize("keywords.dispel"),
                callback: () => {
                  dispelRune({ act: actor, runeID, type: runeType });
                  ui.notifications.info(
                    localize("notifications.dispelled-rune", {
                      rune: runeData.rune.name,
                    }),
                  );
                },
                icon: '<i class="fa-solid fa-trash"></i>',
              },
              {
                action: "cancel",
                icon: "fa-solid fa-xmark",
                label: "Cancel",
              },
            ],
          });
        });

      // Rune image hover: highlight token
      runesFieldset.find(".rune-img:not(.placeholder)").hover(
        function (event) {
          const runeID = event.target.dataset.runeId;
          const runeType = event.target.dataset.runeType;
          const runeData = runes[runeType].find((r) => r.id === runeID);
          const target = runeData.target;
          if (target.type === "person" && target.token) {
            const token =
              canvas.tokens.get(target.token) ||
              canvas.tokens.placeables.find((t) => t.actor.id === target.actor);
            if (token) {
              token._onHoverIn(event); // highlight token
            }
          }
        },
        function (event) {
          // Remove highlight when mouse leaves
          const runeID = event.target.dataset.runeId;
          const runeType = event.target.dataset.runeType;
          const runeData = runes[runeType].find((r) => r.id === runeID);
          const target = runeData.target;
          if (target.type === "person" && target.token) {
            const token =
              canvas.tokens.get(target.token) ||
              canvas.tokens.placeables.find((t) => t.actor.id === target.actor);
            if (token) {
              token._onHoverOut(event); // remove highlight
            }
          }
        },
      );

      runesFieldset?.[0]
        .querySelector(".invoke-runes-btn")
        .addEventListener("click", (event) => {
          game.pf2eRunesmithAssistant.dialog.openInvoke({
            token: actor?.getActiveTokens()?.[0],
          });
        });
      runesFieldset?.[0]
        .querySelector(".etch-trace-btn")
        .addEventListener("click", (event) => {
          game.pf2eRunesmithAssistant.dialog.openEtchTrace({
            etchOnly: canOnlyEtch(actor),
            token: actor?.getActiveTokens()?.[0],
          });
        });

      function runeTooltip(runeFlag, enrichedDesc) {
        return `<b>${runeFlag.rune.name}</b><p><i>on ${targetDescription(
          runeFlag.target,
        ).replaceAll(
          '"',
          "'",
        )}</i></p><hr>${getTraitsHTML(runeFlag.rune.traits)}${enrichedDesc}<hr>
        <p><b>${localize(
          "dialog.invoke.title",
        )}: </b><span class='reference'>${game.i18n.localize(
          "CONTROLS.LeftClick",
        )}</span></p>
        <p><b>${localize(
          "dialog.dispel.title",
        )}: </b><span class='reference'>${game.i18n.localize(
          "CONTROLS.RightClick",
        )}</span></p>
        <p><b>${localize("ui.tooltip.highlight-affected-token")}: </b><span class='reference'>${localize("ui.tooltip.hover")}</span></p>`;
      }
    }
  });

  // if (game.modules.get("pf2e-dailies")?.active) {
  //   game.modules
  //     .get("pf2e-dailies")
  //     ?.api?.registerCustomDailies(CUSTOM_DAILIES);
  // } else {
  //   Hooks.on("pf2e.restForTheNight", async (actor) => {
  //     // Handle "Daily Prep" stuff here if no Pf2e Dailies Module
  //   });
  // }

  Hooks.on("createChatMessage", async function (msg, _status, userid) {
    if (game.user.id !== userid) return;
    switch (msg?.item?.sourceId) {
      case MSG_ITEMS["Chain of Words"]:
        if (!msg?.flags?.pf2e?.context?.type) await chainOfWords();
        break;
      case MSG_ITEMS["Etch Rune"]:
        runeEtchTraceDialog({ etchOnly: true });
        break;
      case MSG_ITEMS["Trace Rune"]:
      case MSG_ITEMS["Fortifying Knock"]:
        runeEtchTraceDialog({ traceOnly: true });
        break;
      case MSG_ITEMS["Invoke Rune"]:
        invokeRuneDialog();
        break;
    }
    const traits = msg?.item?.system?.traits?.value;
    if (!traits?.includes("rune") || !msg.isDamageRoll) {
      return;
    }
    const rollData = msg.item.getRollData();
    const enriched =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        msg.item.description,
        {
          rollData,
          async: true,
        },
      );
    const dcInfo = getDCInfo(enriched);
    const flag = {
      saveVariants: {
        null: {
          dc: dcInfo.dc,
          basic: dcInfo?.isBasic,
          statistic: dcInfo.statistic,
        },
      },
    };

    await msg.update({
      msg: {
        flags: {
          "pf2e-toolbelt": foundry.utils.mergeObject(
            msg?.flags["pf2e-toolbelt"] ?? {},
            { targetHelper: flag },
          ),
        },
      },
    });
  });
}
