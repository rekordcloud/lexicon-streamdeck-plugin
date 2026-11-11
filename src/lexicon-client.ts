/**
 * Talks to the Lexicon Local API. No Stream Deck imports, so it runs under `node --test` as well.
 *
 * Since Lexicon 1.12 every app needs the user's approval. The first key press without a token brings up a popup in
 * Lexicon, and the request waits for the answer; once allowed, the answer carries the plugin's own token in the
 * X-Lexicon-Token header, which is sent with every press from then on. Removing Stream Deck in Lexicon makes the token
 * unknown, so the next press asks again the same way.
 */

export const DEFAULT_PORT = 48624
export const APP_NAME = 'Stream Deck'

/** Lexicon waits up to a minute for the user to answer the popup */
const REQUEST_TIMEOUT_MS = 75 * 1000

/** The plugin's global settings, written only by the plugin (the settings page asks the plugin to change the port) */
export type ILexiconSettings = {
  port?: number
  token?: string
  /** The last outcome, shown on the settings page */
  status?: string
}

export interface ILexiconStore {
  get(): Promise<ILexiconSettings>
  /** Merges the change into what is stored */
  update(change: ILexiconSettings): Promise<void>
}

/** The settings of one key, as the settings page saves them */
export type IKeySettings = {
  action?: string
  index?: number
  amount?: number
  beats?: number
  seconds?: number
  deckNumber?: number
  color?: string
  markerColor?: string
  pluginName?: string
  pluginActionName?: string
}

export interface ILexiconResult {
  ok: boolean
  status: string
}

// LOCALAPI_ERROR_CODES in Lexicon (src/system/api/interface.ts)
const ERROR_APP_BLOCKED = 6
const ERROR_APPROVAL_REQUIRED = 10
const ERROR_APP_ALREADY_ALLOWED = 11

export function isValidPort (port: unknown): port is number {
  return typeof port === 'number' && Number.isInteger(port) && port >= 1024 && port <= 65535
}

/** The POST /v1/control body for a key. Lexicon counts cues and templates from 0, the settings page from 1 */
export function buildControlBody (settings: IKeySettings): { action: string, parameters: object } | null {
  if (!settings.action) return null

  return {
    // Direct2CDJ is called DeckConnect from Lexicon 1.12, which only knows the new action names
    action: settings.action.replace(/^Direct2Cdj_/, 'DeckConnect_'),
    parameters: {
      index: (settings.index || 0) - 1,
      amount: settings.amount,
      beats: settings.beats,
      seconds: settings.seconds,
      deckNumber: settings.deckNumber,
      color: settings.color,
      pluginName: settings.pluginName,
      pluginActionName: settings.pluginActionName
    }
  }
}

export class LexiconClient {
  // Written out rather than as constructor parameter properties, which `node --test` cannot strip
  private readonly store: ILexiconStore
  private readonly fetchFn: typeof fetch
  private readonly log: (message: string) => void

  constructor (store: ILexiconStore, fetchFn: typeof fetch = fetch, log: (message: string) => void = () => {}) {
    this.store = store
    this.fetchFn = fetchFn
    this.log = log
  }

  async runAction (body: object): Promise<ILexiconResult> {
    const settings = await this.store.get()
    const port = isValidPort(settings.port) ? settings.port : DEFAULT_PORT

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Lexicon-App': APP_NAME
    }

    if (settings.token) headers.Authorization = `Bearer ${settings.token}`

    let response: Response

    try {
      response = await this.fetchFn(`http://127.0.0.1:${port}/v1/control`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      this.log(`could not reach Lexicon on port ${port}: ${(error as Error)?.message}`)

      return this.finish(settings, false, `Can't reach Lexicon on port ${port}. Is Lexicon running, with the Local API on?`)
    }

    // Sent when the user just allowed the plugin
    const issuedToken = response.headers.get('x-lexicon-token')

    if (issuedToken && issuedToken !== settings.token) {
      await this.store.update({ token: issuedToken })
      settings.token = issuedToken
    }

    if (response.ok) return this.finish(settings, true, `Connected to Lexicon on port ${port}.`)

    const { errorCode, message } = await response.json().catch(() => ({})) as { errorCode?: number, message?: string }

    this.log(`Lexicon answered ${response.status} (${errorCode}): ${message}`)

    if (errorCode === ERROR_APPROVAL_REQUIRED) {
      return this.finish(settings, false, 'Allow Stream Deck in the Lexicon popup, then press the key again.')
    }

    if (errorCode === ERROR_APP_BLOCKED) {
      return this.finish(settings, false, 'Stream Deck is blocked in Lexicon. Unblock it under Settings > Local API.')
    }

    if (errorCode === ERROR_APP_ALREADY_ALLOWED) {
      return this.finish(settings, false, 'Lexicon allowed Stream Deck before, but this plugin lost its key. Remove Stream Deck under Settings > Local API in Lexicon, then press the key again.')
    }

    if (response.status === 401) return this.finish(settings, false, `Lexicon refused Stream Deck: ${message ?? response.status}`)

    // Let in, but the action itself failed (an unknown action, a missing selection): the connection is fine
    return this.finish(settings, false, `Lexicon could not run this action: ${message ?? response.status}`)
  }

  private async finish (settings: ILexiconSettings, ok: boolean, status: string): Promise<ILexiconResult> {
    if (settings.status !== status) await this.store.update({ status })

    return { ok, status }
  }
}
