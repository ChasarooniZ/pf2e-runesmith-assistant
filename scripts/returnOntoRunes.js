function setupReturnUntoRunes() {
  libWrapper.register(
    "pf2e-runesmith-assistant",
    "foundry.applications.sidebar.tabs.ChatLog.prototype._getEntryContextOptions",
    _getEntryContextOptions_Wrapper,
    "WRAPPER",
  );
}

const _getEntryContextOptions_Wrapper = (wrapped) => {
  const buttons = wrapped.bind(this)();

  // Add a button
  buttons.unshift(
    {
      name: localize(".contextMenuExtemporeEffect"),
      icon: '<i class="fas fa-star"></i>',
      condition: (li) => {
        const message = game.messages.get(li.dataset["messageId"]);
        const actors = canvas.tokens.controlled.map(tok => tok.actor);
        if (game.user.character) {
            actors.push(game.user.character);
        }
        const hasFeat = actors?.find(act => actorHasReturnUntoRunes(act))

        if (!hasFeat) {
            return false;
        }

        if (
          isEffectOrCondition(message.item) ||
          isEffectOrCondition(message.getFlag(game.system.id, "origin"))
        ) {
          return false;
        }
        if (isRechargeRoll(message)) {
          return true;
        }
        if (isNormalTextMessage(message)) {
          return true;
        }
        return !!message.item || !!messageGetOriginUuid(message);
      },
      callback: async (li) => {
        const tokens = canvas.tokens.controlled;
        if (tokens.length === 0)
          return ui.notifications.error(localize(".errorNoTokensSelected"));
        const message = game.messages.get(li.dataset["messageId"]);
        const messageOriginUuid = messageGetOriginUuid(message);
        let item = message.item ?? null;
        if (messageOriginUuid) item = await fromUuid(messageOriginUuid);

        // simple enemy attack with "additional attack effects" and no description, e.g. Stinger.
        // we will create an Effect from the additional thing rather than from the attack item itself.
        if (
          item &&
          //(item.type === "melee" || item.type === "ranged") &&
          //message.flags.pf2e.context.notes.length > 0 &&
          item.description === "" &&
          item.system.attackEffects?.value?.length > 0
        ) {
          // we'll go with the first attackEffect but filter some boring ones out
          let selectedSlug = item.system.attackEffects.value.filter(
            (aes) =>
              !["grab", "knockdown", "pull", "push", "rend"].includes(aes),
          )[0];
          if (selectedSlug) {
            item =
              item.actor.items.find((it) => it.slug === selectedSlug) ?? item;
          }
        }

        // similar thing for special item notes on PCs... usually they matter more than the weapon description.
        // (this seems very rarely useful, so if it goes buggy, just remove it)
        if (
          item &&
          item.actor &&
          message.flags?.[game.system.id]?.context?.notes?.length > 0
        ) {
          // we'll go with the first note that works
          for (const note of message.flags[game.system.id].context.notes) {
            const { selector, text } = note;
            const itemInNote = item.actor?.synthetics?.rollNotes?.[
              selector
            ]?.find((x) => x.text === text)?.rule.item;
            if (itemInNote) {
              item = itemInNote;
              break;
            }
          }
        }

        let effect;
        if (item !== null && item !== undefined) {
          effect = await createEffect(item);
        } else if (isRechargeRoll(message)) {
          effect = createEffectFromRechargeRoll(message);
        } else if (isNormalTextMessage(message)) {
          effect = createEffectFromPureTextMessage(message);
        } else {
          if (message.flags?.[game.system.id]?.origin?.type === "consumable") {
            // consumable was used, so fromUuid returned null (item has been removed from its actor)
            // but we can try to use the compendium item instead!
            // e.g. "Actor.o4zcDbHha6glH9IP.Item.hDLbR56Id2OtU318"
            // let's convert to e.g. "Compendium.pf2e.equipment-srd.Item.hDLbR56Id2OtU318"
            const uuidSplit = message
              .getFlag(game.system.id, "origin")
              .uuid.replace(
                message.getFlag(game.system.id, "origin").actor + ".",
                "",
              )
              .split(".");
            if (uuidSplit.length === 2 && uuidSplit[0] === "Item") {
              const itemUuidInEquipmentSrd =
                game.system.id === "pf2e"
                  ? `Compendium.pf2e.equipment-srd.Item.${uuidSplit[1]}`
                  : `Compendium.sf2e.equipment.Item.${uuidSplit[1]}`;
              item = await fromUuid(itemUuidInEquipmentSrd);
            }
            if (item === null) {
              console.log(
                `${MODULE_NAME} | creating effect from used consumable, so item automation isn't so good`,
              );
              effect = createEffectFromItemlessMessage(message);
            } else {
              // nice, we're back in business
              effect = await createEffect(item);
            }
          } else if (
            message.flags?.[game.system.id]?.origin?.type === "spell"
          ) {
            // similar situation, but spell scroll consumed, and uuid is useless
            console.log(
              `${MODULE_NAME} | creating effect from consumed spell, so item automation isn't so good`,
            );
            effect = createEffectFromItemlessMessage(message);
          } else {
            ui.notifications.warn(localize(".errorItemNotFound"));
            effect = createEffectFromItemlessMessage(message);
          }
        }
        const openEffectSheetShortcut = game.settings.get(
          MODULE_ID,
          "open-effect-sheet-shortcut",
        );
        let isModifierKeyPressed;
        switch (openEffectSheetShortcut) {
          case "shift_left_click":
            isModifierKeyPressed = isShiftHeld();
            break;
          case "ctrl_left_click":
            isModifierKeyPressed = isCtrlHeld();
            break;
          case "disabled":
            isModifierKeyPressed = false;
            break;
        }
        for (const token of tokens) {
          if (!token.actor) {
            ui.notifications.error(
              `Token "${token.name}" has no actor, and so cannot have an effect.`,
            );
            continue;
          }
          const effectItems = await token.actor.createEmbeddedDocuments(
            "Item",
            [effect],
          );
          if (isModifierKeyPressed) {
            effectItems[0].sheet.render(true);
          }
        }
      },
    },
    // Special case for "Effect" item messages;  though it's very unlikely they'll actually be put in chat
    // (this option and the previous option will never both be available)
    {
      name: localize(".contextMenuApplyEffect"),
      icon: '<i class="fas fa-star"></i>',
      condition: (li) => {
        const message = game.messages.get(li.dataset["messageId"]);
        if (isEffectOrCondition(message.item)) return true;
        if (isEffectOrCondition(message.getFlag(game.system.id, "origin"))) {
          const item = fromUuidNonAsync(messageGetOriginUuid(message));
          return !!item;
        }
        return false;
      },
      callback: async (li) => {
        const tokens = canvas.tokens.controlled;
        if (tokens.length === 0)
          return ui.notifications.error(localize(".errorNoTokensSelected"));
        const message = game.messages.get(li.dataset["messageId"]);
        const messageOriginUuid = messageGetOriginUuid(message);
        const item =
          message.item ||
          (messageOriginUuid && (await fromUuid(messageOriginUuid))) ||
          null;
        if (item === null) {
          return ui.notifications.error(localize(".errorItemNotFound"));
        }
        for (const token of tokens) {
          if (!token.actor) {
            ui.notifications.error(
              `Token "${token.name}" has no actor, and so cannot have an effect.`,
            );
            continue;
          }
          await token.actor.createEmbeddedDocuments("Item", [item.toObject()]);
        }
      },
    },
  );
  return buttons;
};

function actorHasReturnUntoRunes(actor) {
  return actor?.rollOptions?.all?.["feat:return-unto-runes"];
}
