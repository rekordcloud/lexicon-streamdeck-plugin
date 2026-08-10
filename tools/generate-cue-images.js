/*
 * Generates the cue marker key images in images/cues/.
 *
 * The marker matches the cuepoint drawn in the overview waveform
 * (lexicon-shared/src/classes/Waveform/OverviewWaveform.ts drawCuepoints):
 * an isoceles triangle with its flat edge on the top of the image and the
 * apex pointing down, sized 1:1 just like CUEPOINT_WIDTH / CUEPOINT_HEIGHT.
 *
 * Run with: node tools/generate-cue-images.js
 */

const fs = require('fs')
const path = require('path')

const { CUE_COLORS, CUE_MARKER_RATIO } = require('../cue-colors')
const { encodePng, rasterize, hexToRgb } = require('./png')

const SIZES = [{ size: 144, suffix: '' }, { size: 288, suffix: '@2x' }]

const OUTPUT_DIR = path.join(__dirname, '..', 'images', 'cues')

function marker (size) {
  const width = size * CUE_MARKER_RATIO

  return [[
    { x: size / 2, y: width }, // Apex, pointing down into the key
    { x: (size + width) / 2, y: 0 },
    { x: (size - width) / 2, y: 0 }
  ]]
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

let written = 0

for (const [name, hex] of Object.entries(CUE_COLORS)) {
  const rgb = hexToRgb(hex)

  for (const { size, suffix } of SIZES) {
    const file = path.join(OUTPUT_DIR, `${name}${suffix}.png`)

    fs.writeFileSync(file, encodePng(size, rasterize(size, marker(size), rgb)))
    written++
  }
}

console.log(`wrote ${written} images to ${OUTPUT_DIR}`)
