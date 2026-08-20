import { ITEMS, REGEX, RUNES } from "./const.js";
import {
  convertItemUUIDFromSF2eToPF2e,
  convertSpecificItemsToSF2e,
  getActorOwnerOnline,
  getActorToGiveRuneEffect,
  localize,
} from "./misc.js";
import { MODULE_ID } from "./module.js";

const RUNE_CHECK_LIST = Object.values(RUNES);

/**
 *
 * Handles Specific Runes detailed above
 * @export
 * @param {{rune: Item, target: {
 *      type: string, item?: string, token?: string, actor?: string, location?: string
 * }, srcToken: string, invocation: string, diacritic: Item}}} { rune, target, srcToken, invocation }
 * @return {}
 */
export async function handleSpecificRunes({
  rune,
  target,
  srcToken,
  invocation,
  diacritic,
}) {
  if (
    !RUNE_CHECK_LIST.includes(rune?.sourceId) &&
    !RUNE_CHECK_LIST.includes(diacritic?.sourceId)
  )
    return;
  const tokenSource = canvas.tokens.get(srcToken);
  const tokenTarget = canvas.tokens.get(target.token);
  const effectData = {
    type: "effect",
    name: `[Invoked] ${rune.name}`,
    img: rune.img,
    system: {
      tokenIcon: { show: true },
      duration: {
        value: 1,
        unit: "rounds",
        sustained: false,
        expiry: "turn-end",
      },
      unidentified: false,
      traits: {
        custom: "",
        rarity: "common",
        value: Array.from(rune?.traits) ?? [],
      },
      description: {
        value: `<p>Granted by @UUID[${rune?.sourceId}]</p>${invocation}`,
      },
      level: {
        value: tokenSource?.actor?.level ?? 1,
      },
      source: {
        value: "created by PF2e Runesmith Assistant",
      },
      slug: game.pf2e.system.sluggify(
        `[${localize("effect.types.invoked")}] ${rune.name}`,
      ),
    },
  };

  const userID = getActorOwnerOnline(
    getActorToGiveRuneEffect(target, srcToken),
  );

  switch (convertItemUUIDFromSF2eToPF2e(rune?.sourceId)) {
    case RUNES["holtrik-rune-of-dwarven-ramparts"]:
      effectData.system.rules = getGrantItemRules(
        convertSpecificItemsToSF2e([
          ITEMS.EFFECT_HOLTRICK_RUNE_OF_DWARVEN_RAMPARTS,
          ITEMS.EFFECT_RAISE_A_SHIELD,
        ]),
      );
      effectData.system.duration.expiry = "turn-start";
      game.pf2eRunesmithAssistant.socket.executeAsUser("createEffect", userID, {
        tokenID: target.token,
        effectData,
      });
      break;
    case RUNES["zohk-rune-of-homecoming"]:
      Dialog.confirm({
        title: `${localize("message.invoke.rune")} ${rune.name}`,
        content: localize("dialog.invoke.failed-or-willing"),
        yes: (html) => {
          new Sequence({
            moduleName: game.modules.get(MODULE_ID).title,
            softFail: true,
          })
            //TP 1
            .crosshair("mvmnt")
            .gridHighlight()
            .location(tokenSource, {
              showRange: true,
              displayRangePoly: true,
              limitMaxRange: 5,
              wallBehavior:
                Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.LINE_OF_SIGHT,
            })
            .distance(Math.max(tokenTarget.document.width - 1, 0) * 5)
            .snapPosition(
              CONST.GRID_SNAPPING_MODES.CENTER |
                CONST.GRID_SNAPPING_MODES.VERTEX,
            )
            .icon(tokenTarget.document.texture.src)
            //invisible
            .animation()
            .on(tokenTarget)
            .opacity(0)
            .fadeOut(200)
            .waitUntilFinished(-150)
            // Sound
            .sound()
            .file("graphics-sfx.scifi.teleport.01")
            .volume(0.5)
            //TP Effect
            .effect()
            .file("jb2a.teleport.01.yellow")
            .atLocation(tokenTarget, { cacheLocation: true })
            .scaleToObject(4)
            .waitUntilFinished(-500)
            // Movement Effect
            .effect()
            .file("jb2a.ranged.03.instant.01.yellow")
            .atLocation(tokenTarget, { cacheLocation: true })
            .stretchTo("mvmnt")
            .scale({ x: 1, y: 0.5 })
            .waitUntilFinished(-1000)
            //Movement Animation
            .animation()
            .on(tokenTarget)
            .teleportTo("mvmnt") //, { relativeToCenter: true })
            .snapToGrid()
            .waitUntilFinished(10)
            // Movement Result
            .effect()
            .file("jb2a.teleport.01.yellow")
            .atLocation("mvmnt")
            .scaleToObject(4)
            .waitUntilFinished(-200)
            .animation()
            .on(tokenTarget)
            .opacity(1)
            .fadeIn(200)
            .play({ preload: true });
        },
        no: (html) => {
          /* do something or return value */
        },
      });
      break;
  }

  switch (convertItemUUIDFromSF2eToPF2e(diacritic?.sourceId)) {
    case RUNES["ti-diacritic-rune-of-fundaments"]:
      // Rune Dialog here to ask damage type
      const type = await foundry.applications.api.DialogV2.input({
        window: {
          title: "PF2E.Item.Condition.PersistentDamage.Dialog.DamageType",
          icon: "",
        },
        content: await foundry.applications.ux.TextEditor.implementation
          .enrichHTML(`
          @UUID[${RUNES["ti-diacritic-rune-of-fundaments"]}]
          <label><input type="radio" name="choice" value="acid" checked> ${game.i18n.format("PF2E.TraitAcid")}</label>
          <label><input type="radio" name="choice" value="cold" checked> ${game.i18n.format("PF2E.TraitCold")}</label>
          <label><input type="radio" name="choice" value="electricity" checked> ${game.i18n.format("PF2E.TraitElectricity")}</label>
          <label><input type="radio" name="choice" value="fire" checked> ${game.i18n.format("PF2E.TraitFire")}</label>
            `),
        ok: {
          label: "PF2E.SelectLabel",
          icon: "fa-solid fa-check",
        },
      });
      return {
        invocation: {
          desc: invocation.replaceAll(
            REGEX.DAMAGE_ROLL.TI_RUNE,
            `$1${type?.choice}$3`,
          ),
        },
      };
    case RUNES["eck-diacritic-rune-of-phantasma"]:
      const dice = tokenSource?.actor?.level >= 17 ? 2 : 1;

      const DamageRoll = CONFIG.Dice.rolls.find((r) => r.name === "DamageRoll");
      const roll = new DamageRoll(`${dice}d8[spirit,persistent]`);
      roll.toMessage({
        flavor: `Eck: Diacritic Rune of Phantasma`,
        speaker: ChatMessage.getSpeaker({ token: tokenSource?.document }),
        flags: {
          "pf2e-toolbelt": {
            targetHelper: {
              type: "action",
              author: tokenSource?.uuid,
              traits: diacritic?.system?.traits?.value ?? [],
              item: diacritic?.uuid,
              options: ["damaging-effect"],
              targets: canvas.tokens.placeables
                .filter(
                  (t) =>
                    tokenSource?.document?.disposition !==
                      t?.document?.disposition &&
                    tokenTarget.distanceTo(t) <= 5 &&
                    tokenTarget?.id !== t?.id,
                )
                .map((t) => t?.document?.uuid),
            },
          },
        },
      });
      return {
        invocation: {
          desc: invocation.replaceAll(
            REGEX.DAMAGE_ROLL.ALL_TYPES,
            `$1spirit$3`,
          ),
        },
      };
  }
}

function getGrantItemRules(itemUUIDs) {
  return itemUUIDs.map((UUID) => ({
    key: "GrantItem",
    onDeleteActions: {
      grantee: "restrict",
    },
    allowDuplicate: true,
    uuid: UUID,
  }));
}
