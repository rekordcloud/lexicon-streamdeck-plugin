import streamDeck from '@elgato/streamdeck'
import { LexiconAction } from './lexicon-action'
import { ILexiconSettings, LexiconClient } from './lexicon-client'

streamDeck.logger.setLevel('info')

// Global settings: the port, the token Lexicon gave the plugin and the last status. Only the plugin writes them, so the
// settings page cannot put back a token that was replaced in the meantime
const store = {
  get: () => streamDeck.settings.getGlobalSettings<ILexiconSettings>(),
  update: async (change: ILexiconSettings) => {
    const current = await streamDeck.settings.getGlobalSettings<ILexiconSettings>()

    await streamDeck.settings.setGlobalSettings<ILexiconSettings>({ ...current, ...change })
  }
}

const lexicon = new LexiconClient(store, fetch, (message) => streamDeck.logger.info(`[lexicon] ${message}`))

streamDeck.actions.registerAction(new LexiconAction(lexicon, async (port) => {
  // A different Lexicon port, so the old status no longer says anything
  await store.update({ port, status: undefined })
}))

streamDeck.connect()
