## 0.7.1

- `Updated`
  - Fixed formatting on `Dispel` and `Invoke`

## 0.7.0

- Added special handling for Trolistri

## 0.6.1

- Fix toolbelt integration for v13

## 0.6.0

- Add Support for multiple targets in one trace
- Updated target dialog to AppV2
- Added better support for Pf2e Toolbelt when invoking runes with saves
  - Now will either
    - **Have Targets** - Add the Rolls for all targetted tokens
    - **Not Targets** - Add Roll for the original target

## 0.5.1

- Actually included the changes from `0.5.0`

## 0.5.0

- `Fixed`
  - `Dispel` & `Invoke` now remove the rune effects
  - Removing a rune effect now removes it from the `runesmith's` runes
  - Fixed areas with weird styling for text etc.

## 0.4.0

- `Updated`
  - V13 Support
  - Fvtt appV2 `Dialog`
  - Fixed new fvtt styling issues
  - Fixed instances where `chain of words` macro was called on every roll with it in it

## 0.3.3

- `Fixed`
  - Fixed duration issue where rune effects would expire at the end of the target's turn not of the runesmith's

## 0.3.2

- `Added`
  - Added specific handling for invoking the `Zohk` rune and `Chain of Words`
- `Updates`
  - Fixed effect slugs to be more compatible with `Pf2e Graphics`
  - Fixed hover bug on `Invoke Runes` dialog

## 0.3.1

- `Updates`
  - Speed up `Target Menu` automatically select either first target if you have targets, or self if there are no targets
  - Filters out duplicates from `Target Menu`
  - Always includes your User's Character in the `targetMenu`

## 0.3.0

- `Features`
  - `Specific Rune Handling`
    - Added specific handling for invoking the `Holtrick` rune
  - `Free Etched Runes`
    - When etching you can now right click the rune to etch it for free, it shows up at the end of the rune list and is highlighted in purple
    - This is mostly the start of the workflow to handle `Runic Tattoo` feat
- `Fixes`
  - A rune expiring no longer clears out your runes
  - Commented out most of the console logs

## 0.2.3

- Allow Invoking / Dispelling multiple runes at once
- Set default of targetting UI to start on `token selection`
- Targetting Dialog color for selection fixed a bit

## 0.2.2

- Start of localization
- Fixed error with applying and deleting effects when not testing as GM
- Make effect icons appear on tokens
- Handled case where as a rune is removed from a character's repertoire (inventory) while they still have it etched

## 0.2.1

- Updated manifest to not ask for the `css` file

## 0.2.0 - Beta

- `Features`
  - `Character Sheet, Rune Management`
    - Allows you to see applied runes in your character sheet on the `Actions -> Encounter` tab
    - Allows for easy management of runes
      - Left Click - Invoke
      - Right Click - Dispel
    - Adds easy access to the `Invoke Runes` Menu and the `Etch & Trace Menu` as buttons
  - `Hover Highlighting`
    - Adds token Highlighting when hovering applied `Etched` or `Traced` runes
    - This works both in the character sheet rune management, but also in the `Invoke Runes` menu

## 0.1.0 - Alpha

- Alpha release cause I figured it is in a usable enough state atm
- `Features`
  - `Etch & Trace Runes`
    - Use the `Etch and Trace Runes` macro to etch and trace runes
    - You must have runesmith runes in your character's inventory
    - Options for applying them to characters are based on who you have targeted
    - The text boxes for `object` and `item` are entirely flavor to just keep track of things
    - Note this will apply a dynamically generated effect to the appropriate actor as well as apply an interior effects of this item to that actor using `grantedItem` rule elements
    - Doing either action sends the appropriate action to chat
  - `Invoke Runes`
    - Use the `Invoke Runes` runes macro to invoke and dispel runes
    - You must have runes that have been `etched` or `traced`
    - `Dispel` - Just an option in the settings to get rid of a rune without invoking it for debug purposes
      - Removes any relevant rune effects
    - `Invoke`
      - Will send a message to chat marking invocation (it grabs the part of the text after Invocation an grabs any relevant traits)
      - Removes any relevant rune effects
  - `Rune Effect Removal`
    - Removing any rune effects will also remove them from the applied runes list (IE the Etched and Traced runes)
  - `Rune Repertoire`
    - Added a container called `Rune Repertoire` to compendium, it only exists just so it's easier to sort runes out of the way
  - `Known Broken`
    - Some of the styling for the dialog affects chat messsages
    - The `Character Sheet` action UI section is just placeholders borrowed from `PF2e Exploit Vulnerability`
