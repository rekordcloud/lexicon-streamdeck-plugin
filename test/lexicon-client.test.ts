import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { APP_NAME, buildControlBody, DEFAULT_PORT, isValidPort, LexiconClient } from '../src/lexicon-client.ts'
import type { ILexiconSettings } from '../src/lexicon-client.ts'

function memoryStore (initial: ILexiconSettings = {}) {
  let settings: ILexiconSettings = { ...initial }
  const writes: ILexiconSettings[] = []

  return {
    writes,
    get settings () { return settings },
    get: async () => ({ ...settings }),
    update: async (change: ILexiconSettings) => {
      writes.push(change)
      settings = { ...settings, ...change }
    }
  }
}

type Call = { url: string, init: RequestInit }

function fakeLexicon (status: number, body: object = {}, headers: Record<string, string> = {}) {
  const calls: Call[] = []

  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })

    return new Response(JSON.stringify(body), { status, headers })
  }) as unknown as typeof fetch

  return { calls, fetchFn }
}

const BODY = { action: 'MusicPlayer_TogglePlay', parameters: {} }

describe('buildControlBody', () => {
  test('gives nothing for a key without an action', () => {
    assert.equal(buildControlBody({}), null)
  })

  test('counts from 0 like Lexicon, where the settings page counts from 1', () => {
    assert.deepEqual(buildControlBody({ action: 'MusicPlayer_Hotcue', index: 3 }).parameters, {
      index: 2, amount: undefined, beats: undefined, seconds: undefined, deckNumber: undefined, color: undefined, pluginName: undefined, pluginActionName: undefined
    })
  })

  test('passes every parameter on', () => {
    const body = buildControlBody({ action: 'MusicPlayer_Seek', seconds: 90, beats: 16, amount: 2, deckNumber: 3, color: 'red', pluginName: 'P', pluginActionName: 'A' })

    assert.equal(body.action, 'MusicPlayer_Seek')
    assert.deepEqual(body.parameters, { index: -1, amount: 2, beats: 16, seconds: 90, deckNumber: 3, color: 'red', pluginName: 'P', pluginActionName: 'A' })
  })

  test('sends keys saved with a Direct2Cdj action as the DeckConnect action', () => {
    assert.equal(buildControlBody({ action: 'Direct2Cdj_LoadDeck', deckNumber: 2 }).action, 'DeckConnect_LoadDeck')
    assert.equal(buildControlBody({ action: 'Direct2Cdj_LoadEmptyDeck' }).action, 'DeckConnect_LoadEmptyDeck')
  })
})

describe('isValidPort', () => {
  for (const [port, valid] of [[48624, true], [1024, true], [65535, true], [1023, false], [65536, false], [1.5, false], ['48624', false], [null, false]] as const) {
    test(`${JSON.stringify(port)} is ${valid ? '' : 'not '}a port`, () => assert.equal(isValidPort(port), valid))
  }
})

describe('LexiconClient', () => {
  test('asks for access by name the first time, and keeps the token Lexicon sends back', async () => {
    const store = memoryStore()
    const lexicon = fakeLexicon(200, {}, { 'X-Lexicon-Token': 'one-more-time' })

    const result = await new LexiconClient(store, lexicon.fetchFn).runAction(BODY)

    assert.equal(result.ok, true)
    assert.equal(lexicon.calls[0].url, `http://127.0.0.1:${DEFAULT_PORT}/v1/control`)

    const headers = lexicon.calls[0].init.headers as Record<string, string>

    assert.equal(headers['X-Lexicon-App'], APP_NAME)
    assert.equal(headers.Authorization, undefined)
    assert.equal(lexicon.calls[0].init.body, JSON.stringify(BODY))
    assert.equal(store.settings.token, 'one-more-time')
    assert.equal(store.settings.status, `Connected to Lexicon on port ${DEFAULT_PORT}.`)
  })

  test('sends its token, to the port from the settings', async () => {
    const store = memoryStore({ token: 'aerodynamic', port: 31338 })
    const lexicon = fakeLexicon(200)

    await new LexiconClient(store, lexicon.fetchFn).runAction(BODY)

    assert.equal(lexicon.calls[0].url, 'http://127.0.0.1:31338/v1/control')
    assert.equal((lexicon.calls[0].init.headers as Record<string, string>).Authorization, 'Bearer aerodynamic')
    assert.equal(store.settings.token, 'aerodynamic')
  })

  test('uses the default port for a port that is not one', async () => {
    const lexicon = fakeLexicon(200)

    await new LexiconClient(memoryStore({ port: 80 }), lexicon.fetchFn).runAction(BODY)

    assert.equal(lexicon.calls[0].url, `http://127.0.0.1:${DEFAULT_PORT}/v1/control`)
  })

  test('replaces its token when Lexicon gives it a new one (removed in Lexicon and allowed again)', async () => {
    const store = memoryStore({ token: 'old' })

    await new LexiconClient(store, fakeLexicon(200, {}, { 'X-Lexicon-Token': 'new' }).fetchFn).runAction(BODY)

    assert.equal(store.settings.token, 'new')
  })

  const refusals: [string, number, object, RegExp][] = [
    ['the popup is not answered yet', 401, { errorCode: 10, message: 'x' }, /^Allow Stream Deck in the Lexicon popup/],
    ['Stream Deck is blocked', 403, { errorCode: 6 }, /blocked in Lexicon/],
    ['Lexicon allowed it before but the plugin lost its token', 409, { errorCode: 11 }, /Remove Stream Deck under Settings > Local API/],
    ['another refusal', 401, { errorCode: 9, message: 'Missing token' }, /^Lexicon refused Stream Deck: Missing token$/],
    ['the action fails', 400, { errorCode: 5, message: 'Invalid action' }, /^Lexicon could not run this action: Invalid action$/]
  ]

  for (const [name, status, body, expected] of refusals) {
    test(`says so when ${name}`, async () => {
      const store = memoryStore({ token: 'kept' })
      const result = await new LexiconClient(store, fakeLexicon(status, body).fetchFn).runAction(BODY)

      assert.equal(result.ok, false)
      assert.match(result.status, expected)
      assert.equal(store.settings.status, result.status)
      assert.equal(store.settings.token, 'kept') // Never thrown away: Lexicon would then refuse a new one with 409
    })
  }

  test('says when Lexicon cannot be reached', async () => {
    const store = memoryStore({ port: 31399 })
    const fetchFn = (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch

    const result = await new LexiconClient(store, fetchFn).runAction(BODY)

    assert.equal(result.ok, false)
    assert.match(result.status, /Can't reach Lexicon on port 31399/)
  })

  test('copes with an answer that is not JSON', async () => {
    const fetchFn = (async () => new Response('<html>', { status: 502 })) as unknown as typeof fetch

    const result = await new LexiconClient(memoryStore(), fetchFn).runAction(BODY)

    assert.equal(result.status, 'Lexicon could not run this action: 502')
  })

  test('writes the status only when it changes', async () => {
    const store = memoryStore({ token: 't' })
    const client = new LexiconClient(store, fakeLexicon(200).fetchFn)

    await client.runAction(BODY)
    await client.runAction(BODY)

    assert.equal(store.writes.filter(x => 'status' in x).length, 1)
  })
})
