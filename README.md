# Lexicon Stream Deck plugin

Controls Lexicon from a Stream Deck through the Lexicon Local API (`POST /v1/control`): any action that can have a
hotkey in Lexicon. Version 2 needs Lexicon 1.12 or newer and Stream Deck 7.1 or newer.

## How it connects

Since Lexicon 1.12 every app needs the user's approval. The plugin sends `X-Lexicon-App: Stream Deck`; the first key
press without a token brings up a popup in Lexicon and waits for the answer. Once the user clicks Allow, Lexicon runs
the action and sends the plugin's token back in the `X-Lexicon-Token` header. The plugin keeps it in its global
settings and sends it with every press from then on. The port (default 48624) is a global setting too, changed in the
`Lexicon port` field of any key's settings. Only the plugin writes the global settings: the settings page sends a
port change to the plugin instead, so it can never write back a token the plugin has replaced in the meantime.

Version 1 ran in Stream Deck's browser engine without a token. Lexicon 1.12 refuses it like a web page and tells the
user once per session to update.

## Layout

- `src/`: the plugin (Node.js, `@elgato/streamdeck`). `lexicon-client.ts` talks to Lexicon and has no Stream Deck
  imports, so it is tested on its own; `key-image.ts` draws the cue marker and beatgrid icon key images as SVG.
- `cloud.rekord.lexicon.sdPlugin/`: the plugin folder Stream Deck loads. `ui/settings.html` is the key's settings
  page. `ui/cue-colors.js` and `ui/mdi-icons.js` are shared: the settings page loads them as scripts, the plugin
  bundles them.
- `tools/`: generate the PNG key images in `imgs/` (`node tools/generate-cue-images.js`), and `preview.html` shows them.

The plugin and action UUIDs (`cloud.rekord.lexicon`, `cloud.rekord.lexicon.action`) are the same as in version 1, so
installing version 2 over it keeps the keys' actions.

## Building

```sh
npm install
npm test           # node --test, the Lexicon client and the key images
npm run build      # bundles src/ into cloud.rekord.lexicon.sdPlugin/bin/plugin.js
npm run validate   # Elgato's manifest and layout checks
npm run pack       # build, then Release/cloud.rekord.lexicon.streamDeckPlugin
```

`npm run watch` rebuilds on every change and restarts the plugin in Stream Deck. Link the plugin folder into Stream
Deck once with `npx streamdeck link cloud.rekord.lexicon.sdPlugin`.

When Lexicon adds a hotkey action that a key can trigger, add it to the action list in `ui/settings.html`, and to the
row lists in `renderOptions()` if it takes a number, beats, seconds, a deck or a colour.
