/*
 * Minimal PNG writer plus an SVG path rasterizer, so the key images can be
 * generated with plain node, without pulling in a dependency.
 */

const zlib = require('zlib')

const CRC_TABLE = (() => {
  const table = new Int32Array(256)

  for (let n = 0; n < 256; n++) {
    let c = n

    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }

    table[n] = c
  }

  return table
})()

function crc32 (buffer) {
  let c = -1

  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  }

  return (c ^ -1) >>> 0
}

function chunk (type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)

  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])

  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))

  return Buffer.concat([length, body, crc])
}

/** Encodes a straight-alpha RGBA buffer as an 8 bit RGBA PNG */
function encodePng (size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // 10-12 stay 0: deflate, adaptive filtering, no interlace

  // Every scanline is prefixed with its filter type, 0 meaning none
  const raw = Buffer.alloc(size * (size * 4 + 1))

  for (let y = 0; y < size; y++) {
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const CURVE_STEPS = 24

function cubic (from, c1, c2, to, out) {
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS
    const u = 1 - t

    out.push({
      x: u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
      y: u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y
    })
  }
}

function quadratic (from, c, to, out) {
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS
    const u = 1 - t

    out.push({
      x: u * u * from.x + 2 * u * t * c.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * c.y + t * t * to.y
    })
  }
}

/** Endpoint to center parameterization, following the SVG spec appendix F.6.5 */
function arc (from, rx, ry, rotation, largeArc, sweep, to, out) {
  if (rx === 0 || ry === 0) {
    out.push({ x: to.x, y: to.y })

    return
  }

  rx = Math.abs(rx)
  ry = Math.abs(ry)

  const phi = rotation * Math.PI / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)

  const dx = (from.x - to.x) / 2
  const dy = (from.y - to.y) / 2

  const x1 = cosPhi * dx + sinPhi * dy
  const y1 = -sinPhi * dx + cosPhi * dy

  // Scale up the radii when they are too small to span the two points
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)

  if (lambda > 1) {
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }

  const sign = largeArc === sweep ? -1 : 1
  const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const factor = sign * Math.sqrt(Math.max(0, numerator / denominator))

  const cx1 = factor * (rx * y1) / ry
  const cy1 = factor * -(ry * x1) / rx

  const cx = cosPhi * cx1 - sinPhi * cy1 + (from.x + to.x) / 2
  const cy = sinPhi * cx1 + cosPhi * cy1 + (from.y + to.y) / 2

  const angle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy)
    const a = Math.acos(Math.min(1, Math.max(-1, dot / len)))

    return (ux * vy - uy * vx < 0) ? -a : a
  }

  const start = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)

  let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)

  if (!sweep && delta > 0) delta -= Math.PI * 2
  if (sweep && delta < 0) delta += Math.PI * 2

  const steps = Math.max(2, Math.ceil(Math.abs(delta) / (Math.PI / 24)))

  for (let i = 1; i <= steps; i++) {
    const theta = start + delta * (i / steps)
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)

    out.push({
      x: cosPhi * rx * cosTheta - sinPhi * ry * sinTheta + cx,
      y: sinPhi * rx * cosTheta + cosPhi * ry * sinTheta + cy
    })
  }
}

/** Turns an SVG path into flattened polygons, in the path's own units */
function flattenPath (d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) || []

  const subpaths = []

  let points = null
  let command = null
  let i = 0

  let cx = 0, cy = 0 // Current point
  let sx = 0, sy = 0 // Start of the current subpath
  let lastControl = null

  const number = () => parseFloat(tokens[i++])
  const start = () => {
    points = []
    subpaths.push(points)
  }

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      command = tokens[i++]
    } else if (command === 'M') {
      command = 'L' // Repeated moveto coordinates are implicit linetos
    } else if (command === 'm') {
      command = 'l'
    }

    const relative = command === command.toLowerCase()
    const ox = relative ? cx : 0
    const oy = relative ? cy : 0

    switch (command.toUpperCase()) {
      case 'M': {
        cx = ox + number()
        cy = oy + number()
        sx = cx
        sy = cy

        start()
        points.push({ x: cx, y: cy })
        lastControl = null

        break
      }

      case 'L': {
        cx = ox + number()
        cy = oy + number()

        points.push({ x: cx, y: cy })
        lastControl = null

        break
      }

      case 'H': {
        cx = ox + number()

        points.push({ x: cx, y: cy })
        lastControl = null

        break
      }

      case 'V': {
        cy = oy + number()

        points.push({ x: cx, y: cy })
        lastControl = null

        break
      }

      case 'C': {
        const from = { x: cx, y: cy }
        const c1 = { x: ox + number(), y: oy + number() }
        const c2 = { x: ox + number(), y: oy + number() }
        const to = { x: ox + number(), y: oy + number() }

        cubic(from, c1, c2, to, points)

        cx = to.x
        cy = to.y
        lastControl = c2

        break
      }

      case 'S': {
        const from = { x: cx, y: cy }
        const c1 = lastControl ? { x: 2 * cx - lastControl.x, y: 2 * cy - lastControl.y } : from
        const c2 = { x: ox + number(), y: oy + number() }
        const to = { x: ox + number(), y: oy + number() }

        cubic(from, c1, c2, to, points)

        cx = to.x
        cy = to.y
        lastControl = c2

        break
      }

      case 'Q': {
        const from = { x: cx, y: cy }
        const c = { x: ox + number(), y: oy + number() }
        const to = { x: ox + number(), y: oy + number() }

        quadratic(from, c, to, points)

        cx = to.x
        cy = to.y
        lastControl = c

        break
      }

      case 'T': {
        const from = { x: cx, y: cy }
        const c = lastControl ? { x: 2 * cx - lastControl.x, y: 2 * cy - lastControl.y } : from
        const to = { x: ox + number(), y: oy + number() }

        quadratic(from, c, to, points)

        cx = to.x
        cy = to.y
        lastControl = c

        break
      }

      case 'A': {
        const from = { x: cx, y: cy }
        const rx = number()
        const ry = number()
        const rotation = number()
        const largeArc = number() !== 0
        const sweep = number() !== 0
        const to = { x: ox + number(), y: oy + number() }

        arc(from, rx, ry, rotation, largeArc, sweep, to, points)

        cx = to.x
        cy = to.y
        lastControl = null

        break
      }

      case 'Z': {
        cx = sx
        cy = sy
        lastControl = null

        // Subpaths are implicitly closed by the rasterizer
        break
      }

      default:
        throw new Error(`unsupported path command ${command}`)
    }
  }

  return subpaths.filter(x => x.length > 2)
}

function transform (subpaths, scale, offsetX, offsetY) {
  return subpaths.map(points => points.map(p => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY
  })))
}

const SAMPLES = 4 // Scanlines per pixel row, horizontal coverage is exact

/*
 * Scanline fill using the nonzero winding rule, the same rule canvas and SVG use.
 * Returns a straight-alpha RGBA buffer.
 */
function rasterize (size, subpaths, rgb) {
  const edges = []

  for (const points of subpaths) {
    for (let i = 0; i < points.length; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]

      if (a.y !== b.y) edges.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y })
    }
  }

  const coverage = new Float32Array(size * size)
  const weight = 1 / SAMPLES

  for (let row = 0; row < size * SAMPLES; row++) {
    const y = Math.floor(row / SAMPLES)
    const scanY = (row + 0.5) / SAMPLES

    const crossings = []

    for (const e of edges) {
      let direction = 0

      if (e.y0 <= scanY && e.y1 > scanY) direction = 1
      else if (e.y1 <= scanY && e.y0 > scanY) direction = -1
      else continue

      crossings.push({
        x: e.x0 + ((scanY - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0),
        direction: direction
      })
    }

    if (crossings.length < 2) continue

    crossings.sort((a, b) => a.x - b.x)

    let winding = 0

    for (let i = 0; i < crossings.length - 1; i++) {
      winding += crossings[i].direction

      if (winding === 0) continue

      const from = Math.max(0, crossings[i].x)
      const to = Math.min(size, crossings[i + 1].x)

      if (to <= from) continue

      for (let x = Math.floor(from); x < Math.ceil(to); x++) {
        const overlap = Math.min(to, x + 1) - Math.max(from, x)

        if (overlap > 0) coverage[y * size + x] += overlap * weight
      }
    }
  }

  const pixels = Buffer.alloc(size * size * 4)

  for (let i = 0; i < coverage.length; i++) {
    if (coverage[i] <= 0) continue

    pixels[i * 4] = rgb.r
    pixels[i * 4 + 1] = rgb.g
    pixels[i * 4 + 2] = rgb.b
    pixels[i * 4 + 3] = Math.round(Math.min(1, coverage[i]) * 255)
  }

  return pixels
}

function hexToRgb (hex) {
  const v = parseInt(hex.slice(1), 16)

  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
}

module.exports = { encodePng, flattenPath, transform, rasterize, hexToRgb }
