import streamDeck, { action, KeyDownEvent, SendToPluginEvent, SingletonAction, WillAppearEvent } from '@elgato/streamdeck'
import { renderKeyImage } from './key-image'
import { buildControlBody, IKeySettings, isValidPort, LexiconClient } from './lexicon-client'

type Settings = IKeySettings & { [key: string]: any }

/** Sent by the settings page when the user changes the port. Everything else it sends is a key's settings */
type PortChange = { lexiconPort: number | null }

@action({ UUID: 'cloud.rekord.lexicon.action' })
export class LexiconAction extends SingletonAction<Settings> {
  constructor (private readonly lexicon: LexiconClient, private readonly setPort: (port: number | undefined) => Promise<void>) {
    super()
  }

  override async onWillAppear (ev: WillAppearEvent<Settings>): Promise<void> {
    if (ev.action.isKey()) await ev.action.setImage(renderKeyImage(ev.payload.settings.markerColor))
  }

  override async onKeyDown (ev: KeyDownEvent<Settings>): Promise<void> {
    const body = buildControlBody(ev.payload.settings)

    if (!body) {
      streamDeck.logger.info('no action set for this key')

      return
    }

    const result = await this.lexicon.runAction(body)

    if (!result.ok) {
      streamDeck.logger.warn(result.status)

      await ev.action.showAlert()
    }
  }

  override async onSendToPlugin (ev: SendToPluginEvent<any, Settings>): Promise<void> {
    const payload = ev.payload

    if (payload && typeof payload === 'object' && 'lexiconPort' in payload) {
      const port = (payload as PortChange).lexiconPort

      await this.setPort(isValidPort(port) ? port : undefined)

      return
    }

    await ev.action.setSettings(payload as Settings)

    if (ev.action.isKey()) await ev.action.setImage(renderKeyImage((payload as Settings).markerColor))
  }
}
