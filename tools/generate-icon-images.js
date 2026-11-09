/*
 * Generates the beatgrid icon key images in cloud.rekord.lexicon.sdPlugin/imgs/icons/, from the same MDI
 * icons the beatgrid controls use in Lexicon (see mdi-icons.js).
 *
 * Run with: node tools/generate-icon-images.js
 */

const fs = require('fs')
const path = require('path')

const { MDI_ICONS, MDI_VIEWBOX, ICON_RATIO } = require('../cloud.rekord.lexicon.sdPlugin/ui/mdi-icons')
const { encodePng, flattenPath, transform, rasterize, hexToRgb } = require('./png')

const SIZES = [{ size: 144, suffix: '' }, { size: 288, suffix: '@2x' }]
const COLOR = '#ffffff'

const OUTPUT_DIR = path.join(__dirname, '..', 'cloud.rekord.lexicon.sdPlugin', 'imgs', 'icons')

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const rgb = hexToRgb(COLOR)

let written = 0

for (const [name, icon] of Object.entries(MDI_ICONS)) {
  const subpaths = flattenPath(icon.path)

  for (const { size, suffix } of SIZES) {
    const scale = (size * ICON_RATIO) / MDI_VIEWBOX
    const offset = (size - MDI_VIEWBOX * scale) / 2

    const placed = transform(subpaths, scale, offset, offset)
    const file = path.join(OUTPUT_DIR, `${name}${suffix}.png`)

    fs.writeFileSync(file, encodePng(size, rasterize(size, placed, rgb)))
    written++
  }
}

console.log(`wrote ${written} images to ${OUTPUT_DIR}`)
