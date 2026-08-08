import { pickRuneDialog } from "./invokeRuneDialog.js";
import { runeAppliedMessage } from "./messageHelpers.js";
import {
  getActorOwnerOnline,
  getActorToGiveRuneEffect,
  getDiacriticCombinedName,
  getEffectsStrings,
  getMaxEtchedRunes,
  getYourToken,
  localize,
} from "./misc.js";
import { MODULE_ID } from "./module.js";
import { showDynamicTargetForm } from "./targetDialog.js";

export async function runeEtchTraceDialog(options = {}) {
  const token = getYourToken();
  const actor = token?.actor ?? game.user.character;
  if (!actor) {
    console.warning(
      "[PF2e Runesmith Assistant] No Actor selected to open Etch/Trace Dialog",
    );
    return;
  }
  const runesList = actor.items.contents.filter((it) =>
    it.system?.traits?.value?.includes("rune"),
  );
  if (runesList.length === 0) {
    ui.notifications.error(localize("notifications.own-no-runes"));
    return;
  }

  let runes = actor.getFlag(MODULE_ID, "runes");

  if (!runes || Object.keys(runes).length === 0) {
    actor.setFlag(MODULE_ID, "runes", {
      traced: [],
      etched: [],
    });
  }

  let runeData = (
    await Promise.all(
      runesList.map(async (r) => {
        return {
          name: r.name,
          id: r.id,
          uuid: r.uuid,
          img: r.img,
          link: r.link,
          slug: r.slug,
          traits: r.system.traits.value,
          effects: getEffectsStrings(
            r.description?.split("<strong>Invocation")?.[0] ?? r.description,
          ),
          enriched_desc: (
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(
              r.description,
              { rollData: r.getRollData() },
            )
          ).replaceAll("'", '"'),
        };
      }),
    )
  ).sort((a, b) => a.name.localeCompare(b.name));

  let res = await pickDialog({ runes: runeData, actor, token, options });
}

async function pickDialog({ runes, actor, token, options }) {
  let rune_content = ``;

  //Filter for runes
  for (let rune of runes) {
    rune_content += `<label class="radio-label" data-tooltip='${rune.enriched_desc}'
    data-tooltip-direction="UP">
      <input type="radio" name="rune" value="${rune.id}">
      <img src="${rune.img}" ">
      ${rune.name}
  </label>`;
  }
  let content = `
  <form class="runepicker">
    <div class="form-group runepicker" id="runes">
        ${rune_content}
    </div>
  </form>
  `;

  let image = new Promise((resolve) => {
    const buttons = [];

    if (!options?.traceOnly) {
      buttons.push({
        action: "etch",
        label: localize("keywords.etch"),
        callback: async () => {
          let itemId = $("input[type='radio'][name='rune']:checked").val();
          addRune(
            runes.find((s) => s.id === itemId),
            { actor, token, type: "etched" },
          );
          resolve(itemId);
        },
        icon: "fa-solid fa-hammer-crash",
      });
    }

    if (!options?.etchOnly) {
      buttons.push(
        {
          label: `${localize("keywords.trace")}`,
          action: "trace",
          callback: async () => {
            let itemId = $("input[type='radio'][name='rune']:checked").val();
            addRune(
              runes.find((s) => s.id === itemId),
              { actor, token, type: "traced", action: "1" },
            );
            resolve(itemId);
          },
          icon: "fa-solid fa-pencil",
        },
        {
          label: `${localize("keywords.trace")} (30 ft)`,
          action: "trace2",
          callback: async () => {
            let itemId = $("input[type='radio'][name='rune']:checked").val();
            addRune(
              runes.find((s) => s.id === itemId),
              { actor, token, type: "traced", action: "2" },
            );
            resolve(itemId);
          },
          icon: "fa-solid fa-pencil",
        },
      );
    }
    foundry.applications.api.DialogV2.wait({
      window: {
        title: localize("dialog.etch-trace.title"),
        controls: [
          {
            action: "kofi",
            label: "Support Dev",
            icon: "fa-solid fa-mug-hot fa-beat-fade",
            onClick: () =>
              window.open("https://ko-fi.com/chasarooni", "_blank"),
          },
        ],
        classes: ["runepicker"],
        icon: "fas fa-stamp",
      },
      content,
      buttons,
      render: onRender,
      position: { width: 700 },
    });
  });
  return image;
}

function onRender(_event, app) {
  const html = app.element ? app.element : app;
  $(html)
    .find(".radio-label img")
    .on("contextmenu", async function (event) {
      const runeId = $(this).closest("label").find("input[type=radio]").val();
      const runeObj = runes.find((s) => s.id === runeId);
      await addRune(runeObj, {
        actor,
        token,
        type: "etched",
        free: true,
      });
      resolve(runeId);
    });
}

async function addRune(
  rune,
  { actor, token, type = "etched", action = 0, free },
) {
  let runes = actor.getFlag(MODULE_ID, "runes");
  if (rune.traits.includes("diacritic")) {
    const runesSelected = await pickRuneDialog({
      token,
      type: "select",
      title: localize("ui.buttons.diacritic-menu"),
    });

    for (const runeInfo of runesSelected?.selected) {
      const baseRuneNumber = runes[runeInfo.type].findIndex(
        (r) => r.id === runeInfo.id,
      );
      if (baseRuneNumber !== -1) {
        const id = foundry.utils.randomID();

        const baseRuneInfo = runes[runeInfo.type][baseRuneNumber];
        const baseRuneName = baseRuneInfo?.rune?.name;
        runes[runeInfo.type][baseRuneNumber] = foundry.utils.mergeObject(
          baseRuneInfo,
          {
            diacritic: {
              type,
              id,
            },
            rune: {
              name: getDiacriticCombinedName(rune.name, baseRuneName),
              enriched_desc:
                rune.enriched_desc + "<hr />" + baseRuneInfo.rune.enriched_desc,
            },
          },
        );
        await applyRuneHelper(
          actor,
          type,
          token,
          rune,
          foundry.utils.mergeObject(
            foundry.utils.deepClone(baseRuneInfo.target),
            {
              location: "item",
              item: baseRuneName ?? "",
            },
          ),
          free,
          action,
          id,
          runes,
        );
      }
    }
  } else {
    const targets = await showDynamicTargetForm({
      processType: type,
      rune: rune,
    });
    if (!targets?.length || targets === "cancel" || !rune) return;
    for (const target of targets) {
      await applyRuneHelper(
        actor,
        type,
        token,
        rune,
        target,
        free,
        action,
        foundry.utils.randomID(),
        runes,
      );
    }
  }

  await actor.setFlag(MODULE_ID, "runes", runes);
}
async function applyRuneHelper(
  actor,
  type,
  token,
  rune,
  target,
  free,
  action,
  id,
  runes,
) {
  if (type === "etched") {
    const maxEtchedRunes = getMaxEtchedRunes(token.actor);
    if (runes.etched.filter((r) => !r.free).length >= maxEtchedRunes) {
      runes.etched.pop();
    }
  }

  runes[type].push({
    rune,
    target,
    id,
    ...(free && { free }),
  });

  const userID = getActorOwnerOnline(
    getActorToGiveRuneEffect(target, token.id),
  );

  game.pf2eRunesmithAssistant.socket.executeAsUser(
    "createTraceEffect",
    userID,
    {
      rune,
      target,
      tokenID: token.id,
      id,
      type,
    },
  );
  runeAppliedMessage({ actor, token, rune, target, type, action });
}
