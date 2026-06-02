import { MODULE_ID } from "./module.js";

export function showDynamicTargetForm(options) {
  const form = new RuneTargetForm(options);
  form.render(true);
  return form.wait();
}

export function getTokenImage(token) {
  return token.document.ring.enabled
    ? token.document.ring.subject.texture.src || token.document.texture.src
    : token.document.texture.src;
}

export function getAllowedTokenName(token) {
  const isOwner = token?.isOwner;
  const displayMode = token?.document?.displayName;
  const nameVisible =
    (isOwner &&
      [
        CONST.TOKEN_DISPLAY_MODES.CONTROL,
        CONST.TOKEN_DISPLAY_MODES.OWNER,
        CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      ].includes(displayMode)) ||
    [
      CONST.TOKEN_DISPLAY_MODES.ALWAYS,
      CONST.TOKEN_DISPLAY_MODES.HOVER,
    ].includes(displayMode);
  return nameVisible ? token.name : "Unidentified Creature";
}

export class RuneTargetForm extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(options = {}) {
    super(options);
    this._processType = options?.processType || "etched";
    this._rune = options?.rune
    this._resolve = null;
    this._reject = null;
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
  static DEFAULT_OPTIONS = {
    id: "pf2e-runesmith-assistant-target-form",
    form: {
      handler: RuneTargetForm.onSubmit,
      closeOnSubmit: true,
    },
    popOut: true,
    position: {
      width: 600,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fas fa-bullseye-pointer",
      title: "pf2e-runesmith-assistant.dialog.target-menu.title",
      contentClasses: ["standard-form", "flexcol"],
      controls: [
        {
          action: "kofi",
          label: "Support Dev",
          icon: "fa-solid fa-mug-hot fa-beat-fade",
          onClick: () => window.open("https://ko-fi.com/chasarooni", "_blank"),
        },
      ],
    },
    tabs: [
      { navSelector: ".tabs", contentSelector: ".content", initial: "tab1" },
    ],
    actions: {
      save: RuneTargetForm.save,
      cancel: RuneTargetForm.cancel,
    },
  };
  static async save() {
    const formData = this._formData;
    if (formData.type === "object") {
      this._resolve([
        {
          type: formData.type,
          item: formData.itemName || null,
          token: null,
          actor: null,
          location: formData.location,
          personName: null,
          img: null,
          objectName: formData.objectName || null,
        },
      ]);
    } else {
      this._resolve(
        formData.tokens
          .filter((tok) => tok.selected)
          .map((tok) => ({
            type: formData.type,
            item: formData.itemName || null,
            token: tok.id,
            actor: tok.token.actor.id,
            location: formData.location,
            personName: tok.name,
            img: tok.img,
            objectName: null,
          })),
      );
    }
    this.close();
  }

  static async cancel() {
    this._resolve(null);
    4;
    this.close();
  }

  wait() {
    return this._promise;
  }

  async close(options = {}) {
    this._resolve?.(null);
    return super.close(options);
  }

  static PARTS = {
    tabs: {
      // Foundry-provided generic template
      template: "templates/generic/tab-navigation.hbs",
    },
    main: {
      template: `modules/pf2e-runesmith-assistant/templates/target-dialog.hbs`,
      // scrollable: [".tab.critical", ".tab.token"],
      classes: ["runesmith-target-dialog", "form"],
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  _onRender(context, options) {
    this.element
      .querySelectorAll("#type-section .option-button")
      .forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          const newType = event.currentTarget.dataset.type;
          this._formData.type = newType;
          if (newType === "object") {
            this._formData.tokens.forEach((t) => (t.selected = false));
            this._formData.location = "actor";
          } else {
            this._formData.objectName = "";
          }
          this.render();
        });
      });

    this.element.querySelectorAll(".token-card").forEach((card) => {
      card.addEventListener("click", (event) => {
        const tokenId = event.currentTarget.dataset.tokenId;
        const token = this._formData.tokens.find((t) => t.id === tokenId);
        if (!token) return;
        token.selected = !token.selected;
        this.render();
      });
    });

    this.element
      .querySelectorAll("#location-section .option-button")
      .forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          this._formData.location = event.currentTarget.dataset.location;
          this.render();
        });
      });

    this.element
      .querySelector("#objectName")
      ?.addEventListener(
        "input",
        (e) => (this._formData.objectName = e.target.value),
      );

    this.element
      .querySelector("#itemNameInput")
      ?.addEventListener(
        "input",
        (e) => (this._formData.itemName = e.target.value),
      );
  }
  _prepareContext(options) {
    if (!this._formData) {
      const targets = game.user.targets.toObject();
      this._formData = {
        type: "person", // Default to person
        objectName: "",
        tokens: [
          ...new Set([
            ...game.canvas.tokens.placeables.filter(
              (t) => t?.actor?.id === game?.user?.character?.id,
            ),
            ...game.canvas.tokens.controlled,
            ...game.user.targets.toObject(),
          ]),
        ].map((token) => ({
          id: token.id,
          name: getAllowedTokenName(token),
          img: getTokenImage(token),
          token: token,
          selected: targets.some((t) => t.id === token.id),
        })),
        selectedCount: targets.length,
        location: "actor", // Default location
        itemName: "",
        // Final output data - will contain arrays for multiple tokens
        actors: [],
        personNames: [],
        imgs: [],
        item: null,
        rune: this._rune
      };
    }
    return {
      ...this._formData,
      selectedCount: this._formData.tokens.filter((t) => t.selected).length,
      buttons: [
        {
          type: "save",
          action: "save",
          icon:
            this._processType === "etched"
              ? "fa-solid fa-pencil"
              : "fa-solid fa-hammer-crash",
          label:
            this._processType === "etched"
              ? "pf2e-runesmith-assistant.keywords.etch"
              : "pf2e-runesmith-assistant.keywords.trace",
        },
        {
          type: "cancel",
          action: "cancel",
          icon: "fa-solid fa-xmark",
          label: "Cancel",
        },
      ],
    };
  }
  static async onSubmit(event, form, formData) {
    const settings = foundry.utils.expandObject(formData.object);
    console.log({ settings });
    // await this.saveSettings(settings);
  }
}
