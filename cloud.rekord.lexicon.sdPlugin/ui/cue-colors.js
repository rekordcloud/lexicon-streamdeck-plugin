/* exported CUE_COLORS, CUE_MARKER_RATIO, cueColorLabel */

// Keep in sync with COLOR_HEX_MAP in lexicon-shared/src/interfaces/color.ts
var CUE_COLORS = {
  red_dark: '#9e1006',
  red: '#e60e0e',
  red_light: '#f2665c',
  red_orange: '#ef590f',
  orange: '#e88915',
  beige: '#ffe194',
  yellow_dark: '#f5d000',
  yellow: '#f5f50c',
  lime: '#bae815',
  green_light: '#adf55f',
  green: '#7fe80e',
  green_dark: '#4b8c06',
  teal: '#12de78',
  aqua: '#12deca',
  aqua_dark: '#099486',
  blue_light: '#2fa8ed',
  blue: '#1058de',
  blue_dark: '#0028ab',
  blue_violet: '#8400ff',
  violet: '#aa3bff',
  violet_light: '#c68cf3',
  magenta: '#e60ede',
  magenta_dark: '#aa00bd',
  magenta_red: '#de105c',
  grey_light: '#adadad',
  grey_dark: '#5c5c5c',
  black: '#303030',
  white: '#ffffff'
}

// Marker size relative to the key, so 48px on a 144px key
var CUE_MARKER_RATIO = 1 / 3

function cueColorLabel (name) {
  return name.split('_').map(function (part) {
    return part.charAt(0).toUpperCase() + part.slice(1)
  }).join(' ')
}

if (typeof module !== 'undefined') {
  module.exports = { CUE_COLORS: CUE_COLORS, CUE_MARKER_RATIO: CUE_MARKER_RATIO, cueColorLabel: cueColorLabel }
}
