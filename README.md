![](https://img.shields.io/badge/Foundry-v14-informational)
![All Downloads](https://img.shields.io/github/downloads/ChasarooniZ/pf2e-runesmith-assistant/total?color=5e0000&label=All%20Downloads)
![Latest Release Download Count](https://img.shields.io/github/downloads/ChasarooniZ/pf2e-runesmith-assistant/latest/module.zip)

![module_banner](https://github.com/ChasarooniZ/pf2e-usage-updater/assets/79132112/3b2a4f8c-7ba1-4647-b073-d8ecac9d93a6)

[![Kofi](https://img.shields.io/badge/Kofi-F16061.svg?logo=ko-fi&logoColor=white)](https://ko-fi.com/Chasarooni)

<!--- Forge Bazaar Install % Badge -->
<!--- replace <your-module-name> with the `name` in your manifest -->
<!--- ![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2F<your-module-name>&colorB=4aa94a) -->

# PF2e Runesmith Assistant

Some automation for the Runesmith. NOTE THIS IS VERY POC, Use at your own peril. Designed so my runesmith interested players can do a bit less work. Will most likely be supplanted by the system when the real runesmith is released

This does handle the basic cases of Etching, Invoking, and Scribing runes. This can be done via using the actions, a macro included, or via the character sheet action tab with new sections that are added. It also has some specific handling for specific cases below.

## Table of Contents

- [PF2e Runesmith Assistant](#pf2e-runesmith-assistant)
  - [Table of Contents](#table-of-contents)
  - [Specific Handling](#specific-handling)
  - [Changelog](#changelog)
  - [Contributors](#contributors)

## Specific Handling

**Runes**

- `Holtrik, Rune of Dwarven Ramparts`
  - **Invoke** Adds raise a shield + Effect for limited time
- `Zohk, Rune of Homecoming`
  - **Invoke** Adds a dialog option when a time is invoked to teleport the target to you
    **Actions**
- Chain of Words
  - Adds the cool AoE Effect

**Trigger Engine Implementation**

- `Camonica` - Taaking damage when concentrating
- `Germantria` - When the Runebearer takes damage, heal themselves for half and damage the runesmith for half
- `Lyskel` - Apply Clumsy 1 if a move action is taken
- `Ranshu` - End of Turn damage if no move action taken

## Changelog

You can access the changelog [here](/CHANGELOG.md).

## Contributors

You can see everyone else who contributed to the module [here](CONTRIBUTORS.md)
