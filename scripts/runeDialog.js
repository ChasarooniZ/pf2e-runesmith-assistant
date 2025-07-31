import { runeAppliedMessage } from "./messageHelpers.js";
import {
  getEffects,
  getMaxEtchedRunes,
  getYourToken,
  localize,
} from "./misc.js";
import { MODULE_ID } from "./module.js";
import { showDynamicTargetForm } from "./targetDialog.js";

export async function runeEtchTraceDialog(options = {}) {
  const token = getYourToken();
  const actor = token.actor;
  const runesList = actor.items.contents.filter((it) =>
    it.system?.traits?.value?.includes("rune")
  );
  if (runesList.length === 0) {
    ui.notifications.error("You have no Runes");
    return;
  }

  let runes = actor.getFlag(MODULE_ID, "runes");

  //console.log({ runesList, runes });

  if (!runes || Object.keys(runes).length === 0) {
    actor.setFlag(MODULE_ID, "runes", {
      traced: [],
      etched: [],
    });
  }

  const rollData = actor.getRollData();
  let runeData = (
    await Promise.all(
      runesList.map(async (r) => {
        return {
          name: r.name,
          id: r.id,
          uuid: r.uuid,
          img: r.img,
          link: r.link,
          traits: r.system.traits.value,
          effects: getEffects(r.description),
          enriched_desc: (
            await TextEditor.enrichHTML(r.description, { rollData })
          ).replaceAll("'", '"'),
        };
      })
    )
  ).sort((a, b) => a.name.localeCompare(b.name));
  //console.log({ runeData });

  let res = await pickDialog({ runes: runeData, actor, token, options });
  //console.log({ res });
}

async function pickDialog({ runes, actor, token, options }) {
  let rune_content = ``;

  //Filter for songs
  for (let rune of runes) {
    rune_content += `<label class="radio-label" data-tooltip='${rune.enriched_desc}' data-tooltip-direction="UP">
      <input type="radio" name="song" value="${rune.id}">
      <img src="${rune.img}" style="border:0px; width: 50px; height:50px;">
      ${rune.name}
  </label>`;
  }
  let content = `
  <form class="songpicker">
    <div class="form-group" id="songs">
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
          let itemId = $("input[type='radio'][name='song']:checked").val();
          addRune(
            runes.find((s) => s.id === itemId),
            { actor, token, type: "etched" }
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
            let itemId = $("input[type='radio'][name='song']:checked").val();
            addRune(
              runes.find((s) => s.id === itemId),
              { actor, token, type: "traced", action: "1" }
            );
            resolve(itemId);
          },
          icon: "fa-solid fa-pencil",
        },
        {
          label: `${localize("keywords.trace")} (30 ft)`,
          action: "trace2",
          callback: async () => {
            let itemId = $("input[type='radio'][name='song']:checked").val();
            addRune(
              runes.find((s) => s.id === itemId),
              { actor, token, type: "traced", action: "2" }
            );
            resolve(itemId);
          },
          icon: "fa-solid fa-pencil",
        }
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
            onClick: () => window.open("https://ko-fi.com/chasarooni", "_blank"),
          },
        ],
        icon: "fas fa-stamp",
      },
      content,
      buttons,
      render: (_event, app) => {
        const html = app.element ? app.element : app;
        // Attach right-click listener to rune images
        $(html)
          .find(".radio-label img")
          .on("contextmenu", async function (event) {
            const runeId = $(this)
              .closest("label")
              .find("input[type=radio]")
              .val();
            const runeObj = runes.find((s) => s.id === runeId);
            // Call addRune with free: true
            await addRune(runeObj, {
              actor,
              token,
              type: "etched",
              free: true,
            });
            resolve(runeId); // Optionally resolve the promise
          });
      },
      position: { width: 700 },
    });
  });
  return image;
}

/**
 * 
 * @param {*} rune Rune to be added
 * @param {{actor, token, type, action, free}} param1 
 * @returns 
 */
async function addRune(
  rune,
  { actor, token, type = "etched", action = 0, free }
) {
  let targets = [];
  if (rune.name?.toLowerCase()?.includes(localize("code.diacritic"))) {

  } else {
    
    targets = await showDynamicTargetForm();
  }

  if (!targets || !targets?.length || targets === 'cancel') return;
  for (const target of targets) {
    let runes = actor.getFlag(MODULE_ID, "runes");
    const id = foundry.utils.randomID();

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

    game.pf2eRunesmithAssistant.socket.executeAsGM("createTraceEffect", {
      rune,
      target,
      tokenID: token.id,
      id,
      type,
    });
    await actor.setFlag(MODULE_ID, "runes", runes);
    await runeAppliedMessage({ actor, token, rune, target, type, action });
  }
}
