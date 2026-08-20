export const EMPTY_RUNE_ART = "icons/svg/d6-grey.svg";

export const RUNES = {
  "atryl-rune-of-fire":
    "Compendium.pf2e-runesmith-assistant.pf2e-runesmith-assistant-items.Item.r5BcAdtq2NjzpCII",
  "eck-diacritic-rune-of-phantasma":
    "Compendium.pf2e-runesmith-assistant.pf2e-runesmith-assistant-items.Item.Kdu5WVEPh3VvgAuL",
  "trolistri-rune-of-forlorn-sorrow":
    "Compendium.pf2e-runesmith-assistant.pf2e-runesmith-assistant-items.Item.AgFVRI7aGK12H8wv",
  "holtrik-rune-of-dwarven-ramparts":
    "Compendium.pf2e-runesmith-assistant.pf2e-runesmith-assistant-items.Item.c01ZyJem8D0qvuvN",
  "zohk-rune-of-homecoming":
    "Compendium.pf2e-runesmith-assistant.pf2e-runesmith-assistant-items.Item.VwIDVNd5mPeTqXl9",
  "ti-diacritic-rune-of-fundaments":
    "Compendium.pf2e-runesmith-assistant.pf2e-runesmith-assistant-items.Item.vTXMCCQopJeutKos",
};

export const ALLIANCES = ["opposition", "neutral", "party"];

export const ITEMS = {
  TRACE_RUNE: "Compendium.pf2e.actionspf2e.Item.WcpJPssJB98lsdI5",
  INVOKE_RUNE: "Compendium.pf2e.actionspf2e.Item.gP5oTU1Mh6GkuseX",
  EFFECT_RAISE_A_SHIELD:
    "Compendium.pf2e.equipment-effects.Item.2YgXoHvJfrDHucMr",
  EFFECT_HOLTRICK_RUNE_OF_DWARVEN_RAMPARTS:
    "Compendium.pf2e-runesmith-assistant.pf2e-runesmith-assistant-items.Item.gBwMb0QqrBJVzyYc",
};

export const MSG_ITEMS = {
  "Chain of Words": "Compendium.pf2e.feats-srd.Item.AhrwKAPb1LyRxpG4",
  "Etch Rune":
    "Compendium.pf2e-runesmith-assistant.pf2e-runesmith-assistant-items.Item.pK4dYJlztm6U1Izf",
  "Trace Rune": ITEMS.TRACE_RUNE,
  "Invoke Rune": ITEMS.INVOKE_RUNE,
  "Fortifying Knock": "Compendium.pf2e.feats-srd.Item.ybMeVTC8TG3rcgoU",
};

export const REGEX = {
  DAMAGE_ROLL: {
    TI_RUNE: /(@Damage\[[^\[]+\[)(acid|cold|electricity|fire)([A-z, ]*]])/gm,
    ALL_TYPES:
      /(@Damage\[[^\[]+\[)(bludgeoning|piercing|slashing|acid|cold|electricity|fire|sonic|vitality|void|mental|bleed|poison|spirit|precision)([A-z, ]*]])/gm,
  },
};
