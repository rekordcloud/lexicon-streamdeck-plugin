// @ts-ignore: a plain script shared with the settings page, which loads it with a <script> tag
import cueColorsModule from '../cloud.rekord.lexicon.sdPlugin/ui/cue-colors.js'
// @ts-ignore: as above
import mdiIconsModule from '../cloud.rekord.lexicon.sdPlugin/ui/mdi-icons.js'

const { CUE_COLORS, CUE_MARKER_RATIO } = cueColorsModule as { CUE_COLORS: Record<string, string>, CUE_MARKER_RATIO: number }
const { MDI_ICONS, MDI_VIEWBOX, ICON_RATIO } = mdiIconsModule as { MDI_ICONS: Record<string, { path: string }>, MDI_VIEWBOX: number, ICON_RATIO: number }

const KEY_SIZE = 144

function toDataUrl (svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}

function svg (content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${KEY_SIZE}" height="${KEY_SIZE}" viewBox="0 0 ${KEY_SIZE} ${KEY_SIZE}">${content}</svg>`
}

/**
 * The same cue marker Lexicon paints on the waveform: an isosceles triangle with its flat edge on the top of the key
 * and the apex pointing down.
 */
export function renderCueMarker (color: string): string {
  const hex = CUE_COLORS[color]

  if (!hex) return ''

  const marker = KEY_SIZE * CUE_MARKER_RATIO
  const points = [[KEY_SIZE / 2, marker], [(KEY_SIZE + marker) / 2, 0], [(KEY_SIZE - marker) / 2, 0]]

  return toDataUrl(svg(`<polygon points="${points.map(x => x.join(',')).join(' ')}" fill="${hex}"/>`))
}

/** A beatgrid control's MDI icon in white, centred */
export function renderIcon (name: string): string {
  const icon = MDI_ICONS[name]

  if (!icon) return ''

  const scale = (KEY_SIZE * ICON_RATIO) / MDI_VIEWBOX
  const offset = (KEY_SIZE - MDI_VIEWBOX * scale) / 2

  return toDataUrl(svg(`<path transform="translate(${offset} ${offset}) scale(${scale})" d="${icon.path}" fill="#ffffff"/>`))
}

/**
 * The key image for the chosen setting, a cue marker or a beatgrid icon (`icon:<name>`). Anything else gives an empty
 * image, which makes Stream Deck fall back to the default from the manifest.
 */
export function renderKeyImage (value: string | undefined): string {
  if (!value) return ''

  if (value.startsWith('icon:')) return renderIcon(value.slice(5))

  return renderCueMarker(value)
}
