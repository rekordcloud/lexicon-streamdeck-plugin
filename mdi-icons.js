/* exported MDI_ICONS, MDI_VIEWBOX, ICON_RATIO */

/*
 * The Material Design Icons used by the beatgrid controls in Lexicon
 * (src/views/MusicPlayer/Edits/Beatgrid/index.vue), so a key can show the same
 * icon as the button it triggers. Paths are from @mdi/svg 7.4.47, matching the
 * webfont version Lexicon bundles. Icons are Apache-2.0 licensed.
 */
var MDI_ICONS = {
  'arrow-down': {
    label: 'Move marker to current position',
    action: 'MusicPlayer_TempomarkerSet',
    path: 'M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z'
  },
  magnify: {
    label: 'Jump to next marker',
    action: 'MusicPlayer_TempomarkerFind',
    path: 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z'
  },
  'chevron-double-left': {
    label: 'Move beatgrid left',
    action: 'MusicPlayer_TempomarkerMoveGridLeft',
    path: 'M18.41,7.41L17,6L11,12L17,18L18.41,16.59L13.83,12L18.41,7.41M12.41,7.41L11,6L5,12L11,18L12.41,16.59L7.83,12L12.41,7.41Z'
  },
  'chevron-double-right': {
    label: 'Move beatgrid right',
    action: 'MusicPlayer_TempomarkerMoveGridRight',
    path: 'M5.59,7.41L7,6L13,12L7,18L5.59,16.59L10.17,12L5.59,7.41M11.59,7.41L13,6L19,12L13,18L11.59,16.59L16.17,12L11.59,7.41Z'
  },
  'arrow-collapse-horizontal': {
    label: 'Increase BPM',
    action: 'MusicPlayer_TempomarkerIncreaseBpm',
    path: 'M13,20V4H15.03V20H13M10,20V4H12.03V20H10M5,8L9.03,12L5,16V13H2V11H5V8M20,16L16,12L20,8V11H23V13H20V16Z'
  },
  'arrow-expand-horizontal': {
    label: 'Decrease BPM',
    action: 'MusicPlayer_TempomarkerDecreaseBpm',
    path: 'M9,11H15V8L19,12L15,16V13H9V16L5,12L9,8V11M2,20V4H4V20H2M20,20V4H22V20H20Z'
  },
  close: {
    label: 'Double BPM',
    action: 'MusicPlayer_TempomarkerDoubleBpm',
    path: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'
  },
  'slash-forward': {
    label: 'Halve BPM',
    action: 'MusicPlayer_TempomarkerHalveBpm',
    path: 'M7 21L14.9 3H17L9.1 21H7Z'
  },
  plus: {
    label: 'Add marker',
    action: 'MusicPlayer_TempomarkerAdd',
    path: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'
  },
  delete: {
    label: 'Delete marker',
    action: 'MusicPlayer_TempomarkerRemove',
    path: 'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'
  },
  metronome: {
    label: 'Toggle metronome',
    action: 'MusicPlayer_ToggleMetronome',
    path: 'M12,1.75L8.57,2.67L4.06,19.53C4.03,19.68 4,19.84 4,20C4,21.11 4.89,22 6,22H18C19.11,22 20,21.11 20,20C20,19.84 19.97,19.68 19.94,19.53L18.58,14.42L17,16L17.2,17H13.41L16.25,14.16L14.84,12.75L10.59,17H6.8L10.29,4H13.71L15.17,9.43L16.8,7.79L15.43,2.67L12,1.75M11.25,5V14.75L12.75,13.25V5H11.25M19.79,7.8L16.96,10.63L16.25,9.92L14.84,11.34L17.66,14.16L19.08,12.75L18.37,12.04L21.2,9.21L19.79,7.8Z'
  }
}

var MDI_VIEWBOX = 24

// Icon size relative to the key, so 81px on a 144px key
var ICON_RATIO = 0.5625

if (typeof module !== 'undefined') {
  module.exports = { MDI_ICONS: MDI_ICONS, MDI_VIEWBOX: MDI_VIEWBOX, ICON_RATIO: ICON_RATIO }
}
