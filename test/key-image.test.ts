import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { renderCueMarker, renderIcon, renderKeyImage } from '../src/key-image.ts'

function decode (dataUrl: string): string {
  assert.match(dataUrl, /^data:image\/svg\+xml;base64,/)

  return Buffer.from(dataUrl.split(',')[1], 'base64').toString('utf8')
}

describe('key images', () => {
  test('draws a cue marker in the cue colour, flat edge on top, apex down', () => {
    const svg = decode(renderCueMarker('red_dark'))

    assert.match(svg, /fill="#9e1006"/)
    assert.match(svg, /points="72,48 96,0 48,0"/)
    assert.match(svg, /width="144" height="144"/)
  })

  test('draws a beatgrid icon in white, scaled to the key and centred', () => {
    const svg = decode(renderIcon('arrow-down'))

    assert.match(svg, /d="M11,4H13V16/)
    assert.match(svg, /fill="#ffffff"/)
    assert.match(svg, /translate\(31.5 31.5\) scale\(3.375\)/)
  })

  test('picks a cue marker or an icon from the setting', () => {
    assert.equal(renderKeyImage('icon:arrow-down'), renderIcon('arrow-down'))
    assert.equal(renderKeyImage('blue'), renderCueMarker('blue'))
  })

  test('gives an empty image, the manifest default, for nothing or something unknown', () => {
    for (const value of [undefined, '', 'not-a-colour', 'icon:not-an-icon']) assert.equal(renderKeyImage(value), '')
  })
})
