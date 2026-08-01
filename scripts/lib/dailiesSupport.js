import { MODULE_ID } from "../module.js";

export const CUSTOM_DAILIES = [
  {
    key: "runic-tattoo",
    items: [
      {
        slug: "item",
        uuid: "Compendium.pf2e.feats-srd.Item.r3fOPLERrcog5X6J",
        required: true,
      },
    ],
    label: (actor, items) => items.item.name,
    rows: (actor, items, custom) => {
      //TODO if no runic tattoo value is set allow you to set it
      const runicTattoo = actor.getFlag(MODULE_ID, "runic-tattoo");
      //Check if this id is in the items, if not then unset flag
      const options = [
        { value: "no", label: "" },
        { value: "yes", label: items.item.name },
      ];

      return [
        {
          type: "select",
          slug: "selection",
          label: custom.uselessVariable,
          options: options,
        },
      ];
    },
    process: ({ actor, rows, messages, addItem }) => {
      //This is where I trigger the "target Rune dialog" to apply it to yourself
    },
  },
];

const documentation = {
  /**
   * REQUIRED
   * The unique key for your custom daily, those are isolated from the
   * built-in daily keys.
   */
  key: "my-custom-daily",
  /**
   * CONDITIONALLY REQUIRED
   * This will completely remove the daily from the actor if it returns false.
   * NOTE: required if no 'items' are provided.
   */
  condition: (actor) => true,
  /**
   * CONDITIONALLY REQUIRED
   * An array of slug + uuid to identify which embedded items need to be
   * retrieved from the character, the 'required' flag makes an item mandatory
   * for the functionment of the daily.
   * An 'items' object parameter is forwarded in all the functions of the daily.
   * NOTE: required if no 'condition' is provided.
   */
  items: [
    {
      slug: "item",
      uuid: "Compendium.xxx.Item.xxx",
      required: true,
    },
  ],
  /**
   * OPTIONAL
   * Can be a string or a function that returns a string.
   * NOTE: because the item was 'required', we are sure that it exists on the
   * character and can be accessed without doing extra check.
   */
  label: (actor, items) => items.item.name,
  /**
   * OPTIONAL
   * Called in the first stage of the daily and returns an object of arbitrary
   * data that will be forwarded to the 'rows' and 'process' functions
   * as 'custom' argument.
   * This is useful if want to avoid recomputing the same data twice.
   */
  prepare: (actor, items) => {
    return {
      uselessVariable: "plop",
    };
  },
  /**
   * REQUIRED
   * This is where you define the different rows that appears in the interface.
   * It returns an array of 'DailyRow' of the different available types.
   * A 'rows' object parameter is forwarded to the 'process' function, its
   * content depends on the row type.
   * NOTE: 'select' and 'random' rows with an empty 'options' array will be
   * removed.
   * NOTE: if only one row is provided, it will appear at the top of the daily
   * interface with the other single row dailies and its label will be the
   * daily label instead of the row label.
   */
  rows: (actor, items, custom) => {
    const options = [
      { value: "no", label: "" },
      { value: "yes", label: items.item.name },
    ];

    return [
      {
        type: "select",
        slug: "selection",
        label: custom.uselessVariable,
        options: options,
      },
    ];
  },
  /**
   * REQUIRED
   * This is the part that actually modify the character, helper functions are
   * provided to both avoid making dozens of updates on the character and
   * to let the module handle redundant and important mechanics of the daily,
   * these paired with the 'utils' functions should cover most of what a
   * custom daily needs.
   */
  process: ({ actor, rows, messages, addItem }) => {},
  /**
   * OPTIONAL
   * Called during 'Rest for the Night' to cleanup things that the module
   * can't handle itself.
   * This function should rarely be needed if you use the provided
   * helpers in the 'process', since the module will automatically revert
   * anything it did when using those.
   * NOTE: to give some perspective, the only built-in daily that needs to use
   * this is the 'familiar' one because it needs to remove the abilities on
   * the familiar actor.
   */
  rest: ({ actor, removeItem }) => {},
  /**
   * OPTIONAL
   * Use to register daily specifig configs.
   * Those will appear in the `Config` menu of the daily preparation interface.
   * Returns an array of input related configs
   */
  config: (actor) => {
    return [
      {
        type: "checkbox",
        /**
         * input element name attribute
         */
        name: "my-config",
        /**
         * OPTIONAL
         */
        value: true,
        label: "My Module Config",
      },
    ];
  },
  /**
   * OPTIONAL
   * Called during the daily preparation process right after all the items
   * from all the dailies were added to the character and before the items update/delete happen.
   * You can use the same helpers than in the `process` function except the ones that add items
   * or rules to the character.
   */
  afterItemAdded: ({ addedItems, setExtraFlags }) => {
    const myFlag = addedItems.filter((item) => item.id);
    setExtraFlags({ myFlag });
  },
};
