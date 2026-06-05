import Phaser from 'phaser'

export interface CharacterAppearance {
  skinColor: string
  hairColor: string
  eyeColor: string
  shirtColor: string
  pantsColor: string
  shoesColor: string
}

interface BoneAngles {
  leftUpperArm: number
  leftForearm: number
  rightUpperArm: number
  rightForearm: number
  leftThigh: number
  leftShin: number
  rightThigh: number
  rightShin: number
}

interface FramePose {
  angles: BoneAngles
  bodyY: number
  headTilt: number
  squishX: number
  squishY: number
  armSwing: number
}

const RAD = Math.PI / 180
const FW = 64
const FH = 80
const SKIN = '#f5d6b8'
const DARK_SKIN = '#e8b88a'

function deg(d: number): number { return d * RAD }

function shortenHex(c: string): string {
  if (c.length === 7) return c
  return c
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount)
  return `rgb(${r},${g},${b})`
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount)
  return `rgb(${r},${g},${b})`
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawLimb(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, width: number, color: string, outline: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  drawRoundRect(ctx, -width / 2, 0, width, length, width / 3)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = outline
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function drawBody(ctx: CanvasRenderingContext2D, app: CharacterAppearance, pose: FramePose, flip: boolean) {
  const s = 1
  const cx = FW / 2
  const by = 42 + pose.bodyY * s

  // --- Legs ---
  const legColor = app.pantsColor
  const legOutline = darken(legColor, 40)
  const shoeColor = app.shoesColor
  const shoeOutline = darken(shoeColor, 40)

  const hipL = cx - 7 * s
  const hipR = cx + 7 * s

  for (const side of ['left', 'right'] as const) {
    const thighAngle = side === 'left' ? pose.angles.leftThigh : pose.angles.rightThigh
    const shinAngle = side === 'left' ? pose.angles.leftShin : pose.angles.rightShin
    const hx = side === 'left' ? hipL : hipR
    const mult = flip ? -1 : 1

    const kneeX = hx + Math.sin(thighAngle * mult) * 14 * s
    const kneeY = by + Math.cos(thighAngle * mult) * 14 * s

    drawLimb(ctx, hx, by, thighAngle * mult, 14 * s, 7 * s, legColor, legOutline)

    const footX = kneeX + Math.sin((thighAngle + shinAngle) * mult) * 12 * s
    const footY = kneeY + Math.cos((thighAngle + shinAngle) * mult) * 12 * s

    drawLimb(ctx, kneeX, kneeY, (thighAngle + shinAngle) * mult, 12 * s, 6 * s, legColor, legOutline)

    ctx.save()
    ctx.translate(footX, footY)
    ctx.fillStyle = shoeColor
    ctx.strokeStyle = shoeOutline
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(0, 3 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // --- Body / Torso ---
  const shirtColor = app.shirtColor
  const shirtOutline = darken(shirtColor, 40)
  const bodyW = 22 * s
  const bodyH = 18 * s
  const bodyX = cx - bodyW / 2
  const bodyY = by - bodyH + 2 * s

  ctx.save()
  drawRoundRect(ctx, bodyX, bodyY, bodyW, bodyH, 4 * s)
  ctx.fillStyle = shirtColor
  ctx.fill()
  ctx.strokeStyle = shirtOutline
  ctx.lineWidth = 1
  ctx.stroke()

  // Collar detail
  ctx.fillStyle = lighten(shirtColor, 20)
  ctx.fillRect(bodyX + bodyW * 0.3, bodyY + 1 * s, bodyW * 0.4, 3 * s)
  ctx.restore()

  // --- Arms ---
  const armColor = app.skinColor
  const armOutline = darken(armColor, 40)
  const shoulderL = cx - 12 * s
  const shoulderR = cx + 12 * s

  for (const side of ['left', 'right'] as const) {
    const upperAngle = side === 'left' ? pose.angles.leftUpperArm : pose.angles.rightUpperArm
    const foreAngle = side === 'left' ? pose.angles.leftForearm : pose.angles.rightForearm
    const sx = side === 'left' ? shoulderL : shoulderR
    const shoulderY = by - 10 * s
    const mult = flip ? -1 : 1

    const elbowX = sx + Math.sin(upperAngle * mult) * 12 * s
    const elbowY = shoulderY + Math.cos(upperAngle * mult) * 12 * s

    drawLimb(ctx, sx, shoulderY, upperAngle * mult, 12 * s, 5 * s, armColor, armOutline)
    drawLimb(ctx, elbowX, elbowY, (upperAngle + foreAngle) * mult, 10 * s, 4 * s, armColor, armOutline)

    // Hand
    const handX = elbowX + Math.sin((upperAngle + foreAngle) * mult) * 10 * s
    const handY = elbowY + Math.cos((upperAngle + foreAngle) * mult) * 10 * s
    ctx.save()
    ctx.translate(handX, handY)
    ctx.fillStyle = armColor
    ctx.strokeStyle = armOutline
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, 0, 3 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // --- Head ---
  const headCX = cx + pose.headTilt * s
  const headCY = by - 22 * s
  const headRX = 14 * s
  const headRY = 15 * s

  ctx.save()
  ctx.translate(headCX, headCY)

  // Head shape
  ctx.fillStyle = app.skinColor
  ctx.strokeStyle = darken(app.skinColor, 40)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(0, 0, headRX, headRY, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Hair
  drawHair(ctx, app, headRX, headRY)

  // Eyes
  const eyeY = -3 * s
  const eyeSpacing = 7 * s
  for (const ex of [-eyeSpacing, eyeSpacing]) {
    // White
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.ellipse(ex, eyeY, 4 * s, 4.5 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Iris
    ctx.fillStyle = app.eyeColor
    ctx.beginPath()
    ctx.arc(ex + (flip ? 1 : -1), eyeY + 0.5 * s, 2.5 * s, 0, Math.PI * 2)
    ctx.fill()

    // Pupil
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(ex + (flip ? 1 : -1), eyeY + 0.5 * s, 1.2 * s, 0, Math.PI * 2)
    ctx.fill()

    // Highlight
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(ex + (flip ? 0.5 : -0.5), eyeY - 1 * s, 1 * s, 0, Math.PI * 2)
    ctx.fill()
  }

  // Eyebrows
  ctx.strokeStyle = app.hairColor
  ctx.lineWidth = 2
  for (const bx of [-7, 7]) {
    ctx.beginPath()
    ctx.moveTo(bx - 3 * s, -9 * s)
    ctx.lineTo(bx + 3 * s, -8.5 * s)
    ctx.stroke()
  }

  // Mouth
  ctx.fillStyle = '#e57373'
  ctx.beginPath()
  ctx.ellipse(0, 5 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  // Blush
  ctx.fillStyle = 'rgba(255,150,150,0.3)'
  ctx.beginPath()
  ctx.ellipse(-9 * s, 4 * s, 4 * s, 2.5 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(9 * s, 4 * s, 4 * s, 2.5 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawHair(ctx: CanvasRenderingContext2D, app: CharacterAppearance, rx: number, ry: number) {
  const hc = app.hairColor
  const hd = darken(hc, 50)

  ctx.fillStyle = hc
  ctx.strokeStyle = hd
  ctx.lineWidth = 1

  // Main hair volume - dome shape on top of head
  ctx.beginPath()
  ctx.moveTo(-rx - 2, -ry + 4)
  ctx.quadraticCurveTo(-rx - 6, -ry - 10, -rx * 0.4, -ry - 8)
  ctx.quadraticCurveTo(0, -ry - 14, rx * 0.4, -ry - 8)
  ctx.quadraticCurveTo(rx + 6, -ry - 10, rx + 2, -ry + 4)
  ctx.quadraticCurveTo(rx + 4, -ry + 2, rx + 2, -ry + 4)
  ctx.fill()
  ctx.stroke()

  // Side hair
  ctx.beginPath()
  ctx.moveTo(-rx - 2, -ry + 4)
  ctx.quadraticCurveTo(-rx - 5, -ry + 8, -rx - 2, 0)
  ctx.quadraticCurveTo(-rx - 3, -ry + 2, -rx - 2, -ry + 4)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(rx + 2, -ry + 4)
  ctx.quadraticCurveTo(rx + 5, -ry + 8, rx + 2, 0)
  ctx.quadraticCurveTo(rx + 3, -ry + 2, rx + 2, -ry + 4)
  ctx.fill()
  ctx.stroke()

  // Fringe/bangs
  ctx.fillStyle = lighten(hc, 15)
  ctx.beginPath()
  ctx.moveTo(-rx * 0.3, -ry * 1.1)
  ctx.quadraticCurveTo(-rx * 0.5, -ry * 0.6, -rx * 0.1, -ry * 0.3)
  ctx.quadraticCurveTo(0, -ry * 0.4, rx * 0.1, -ry * 0.3)
  ctx.quadraticCurveTo(rx * 0.5, -ry * 0.6, rx * 0.3, -ry * 1.1)
  ctx.fill()
}

function defaultPose(overrides?: Partial<BoneAngles>): BoneAngles {
  return {
    leftUpperArm: 0, leftForearm: 0,
    rightUpperArm: 0, rightForearm: 0,
    leftThigh: -5, leftShin: 0,
    rightThigh: 5, rightShin: 0,
    ...overrides
  }
}

const ANIM_FRAMES: Record<string, FramePose[]> = {
  idle: [
    { angles: defaultPose({ leftUpperArm: -10, rightUpperArm: 10, leftForearm: -5, rightForearm: 5 }), bodyY: 0, headTilt: 0, squishX: 1, squishY: 1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -10, rightUpperArm: 10, leftForearm: -5, rightForearm: 5 }), bodyY: -1, headTilt: 0, squishX: 1.01, squishY: 0.99, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -10, rightUpperArm: 10, leftForearm: -5, rightForearm: 5 }), bodyY: 0, headTilt: 0, squishX: 1, squishY: 1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -8, rightUpperArm: 8, leftForearm: -3, rightForearm: 3 }), bodyY: 1, headTilt: 0.5, squishX: 0.99, squishY: 1.01, armSwing: 0 },
  ],
  run: [
    { angles: defaultPose({ leftUpperArm: -30, rightUpperArm: 30, leftForearm: -20, rightForearm: 20, leftThigh: 20, rightThigh: -20 }), bodyY: 0, headTilt: 3, squishX: 1, squishY: 1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -15, rightUpperArm: 15, leftForearm: -10, rightForearm: 10, leftThigh: 5, rightThigh: -5 }), bodyY: -1, headTilt: 1, squishX: 1, squishY: 1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: 30, rightUpperArm: -30, leftForearm: 20, rightForearm: -20, leftThigh: -20, rightThigh: 20 }), bodyY: 0, headTilt: -3, squishX: 1, squishY: 1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: 15, rightUpperArm: -15, leftForearm: 10, rightForearm: -10, leftThigh: -5, rightThigh: 5 }), bodyY: -1, headTilt: -1, squishX: 1, squishY: 1, armSwing: 0 },
  ],
  jump: [
    { angles: defaultPose({ leftUpperArm: -60, rightUpperArm: -60, leftForearm: -40, rightForearm: -40, leftThigh: 30, rightThigh: 30, leftShin: -30, rightShin: -30 }), bodyY: -4, headTilt: 0, squishX: 0.85, squishY: 1.15, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -80, rightUpperArm: -80, leftForearm: -50, rightForearm: -50, leftThigh: 10, rightThigh: 10, leftShin: -10, rightShin: -10 }), bodyY: -3, headTilt: 0, squishX: 0.9, squishY: 1.1, armSwing: 0 },
  ],
  aim: [
    { angles: defaultPose({ leftUpperArm: -20, rightUpperArm: -90, leftForearm: -15, rightForearm: 30, leftThigh: -5, rightThigh: 5 }), bodyY: 0, headTilt: -5, squishX: 1, squishY: 1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -30, rightUpperArm: -100, leftForearm: -20, rightForearm: 45, leftThigh: -5, rightThigh: 5 }), bodyY: 0, headTilt: -8, squishX: 1, squishY: 1, armSwing: 0 },
  ],
  throw: [
    { angles: defaultPose({ leftUpperArm: -10, rightUpperArm: -130, leftForearm: -5, rightForearm: 80, leftThigh: -5, rightThigh: 5 }), bodyY: -1, headTilt: -10, squishX: 1.1, squishY: 0.9, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -10, rightUpperArm: -90, leftForearm: -5, rightForearm: 20, leftThigh: -5, rightThigh: 5 }), bodyY: 0, headTilt: -5, squishX: 0.95, squishY: 1.05, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -10, rightUpperArm: -10, leftForearm: -5, rightForearm: -10, leftThigh: -5, rightThigh: 5 }), bodyY: 0, headTilt: 0, squishX: 0.9, squishY: 1.1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -10, rightUpperArm: 10, leftForearm: -5, rightForearm: 5, leftThigh: -5, rightThigh: 5 }), bodyY: 0, headTilt: 0, squishX: 1, squishY: 1, armSwing: 0 },
  ],
  hit: [
    { angles: defaultPose({ leftUpperArm: 30, rightUpperArm: -30, leftForearm: 20, rightForearm: -20, leftThigh: 15, rightThigh: -15 }), bodyY: 2, headTilt: 10, squishX: 1.2, squishY: 0.8, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: 10, rightUpperArm: -10, leftForearm: 5, rightForearm: -5, leftThigh: 5, rightThigh: -5 }), bodyY: 0, headTilt: 5, squishX: 1, squishY: 1, armSwing: 0 },
  ],
  die: [
    { angles: defaultPose({ leftUpperArm: -40, rightUpperArm: 40, leftForearm: -30, rightForearm: 30, leftThigh: 30, rightThigh: -30, leftShin: -20, rightShin: 20 }), bodyY: 2, headTilt: 20, squishX: 1.1, squishY: 0.9, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -50, rightUpperArm: 50, leftForearm: -40, rightForearm: 40, leftThigh: 45, rightThigh: -45, leftShin: -30, rightShin: 30 }), bodyY: 10, headTilt: 45, squishX: 0.8, squishY: 1.2, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -60, rightUpperArm: 60, leftForearm: -50, rightForearm: 50, leftThigh: 60, rightThigh: -60, leftShin: -45, rightShin: 45 }), bodyY: 20, headTilt: 60, squishX: 0.6, squishY: 1.4, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -80, rightUpperArm: 80, leftForearm: -50, rightForearm: 50, leftThigh: -90, rightThigh: 90, leftShin: 0, rightShin: 0 }), bodyY: 30, headTilt: 90, squishX: 0.5, squishY: 1.5, armSwing: 0 },
  ],
  win: [
    { angles: defaultPose({ leftUpperArm: -70, rightUpperArm: -70, leftForearm: -30, rightForearm: -30, leftThigh: -5, rightThigh: 5 }), bodyY: -2, headTilt: 0, squishX: 1, squishY: 1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -70, rightUpperArm: -70, leftForearm: -30, rightForearm: -30, leftThigh: -5, rightThigh: 5 }), bodyY: -4, headTilt: 0, squishX: 0.95, squishY: 1.05, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -60, rightUpperArm: -60, leftForearm: -20, rightForearm: -20, leftThigh: -5, rightThigh: 5 }), bodyY: -1, headTilt: 0, squishX: 1, squishY: 1, armSwing: 0 },
  ],
  taunt: [
    { angles: defaultPose({ leftUpperArm: -80, rightUpperArm: -80, leftForearm: -60, rightForearm: -60, leftThigh: -5, rightThigh: 5 }), bodyY: -1, headTilt: -5, squishX: 0.95, squishY: 1.05, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -30, rightUpperArm: -30, leftForearm: 30, rightForearm: 30, leftThigh: -5, rightThigh: 5 }), bodyY: -2, headTilt: 5, squishX: 1.05, squishY: 0.95, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -80, rightUpperArm: -80, leftForearm: -60, rightForearm: -60, leftThigh: -5, rightThigh: 5 }), bodyY: -1, headTilt: -5, squishX: 0.95, squishY: 1.05, armSwing: 0 },
  ],
  crouch: [
    { angles: defaultPose({ leftUpperArm: 20, rightUpperArm: -20, leftForearm: 10, rightForearm: -10, leftThigh: 80, rightThigh: -80, leftShin: -60, rightShin: 60 }), bodyY: 15, headTilt: 5, squishX: 1.3, squishY: 0.7, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: 20, rightUpperArm: -20, leftForearm: 10, rightForearm: -10, leftThigh: 80, rightThigh: -80, leftShin: -60, rightShin: 60 }), bodyY: 15, headTilt: 5, squishX: 1.3, squishY: 0.7, armSwing: 0 },
  ],
  stunned: [
    { angles: defaultPose({ leftUpperArm: -30, rightUpperArm: 30, leftForearm: -10, rightForearm: 10, leftThigh: 10, rightThigh: -10 }), bodyY: 1, headTilt: 15, squishX: 1, squishY: 1, armSwing: 0 },
    { angles: defaultPose({ leftUpperArm: -20, rightUpperArm: 20, leftForearm: -5, rightForearm: 5, leftThigh: -10, rightThigh: 10 }), bodyY: -1, headTilt: -15, squishX: 1, squishY: 1, armSwing: 0 },
  ],
  sleeping: [
    { angles: defaultPose({ leftUpperArm: 10, rightUpperArm: -10, leftForearm: -30, rightForearm: 30, leftThigh: -5, rightThigh: 5 }), bodyY: 0, headTilt: 20, squishX: 1, squishY: 1, armSwing: 0 },
  ],
}

export const ANIMATION_KEYS = [
  'idle', 'run', 'jump', 'aim', 'throw', 'hit', 'die', 'win', 'taunt', 'crouch', 'stunned', 'sleeping'
] as const

export type AnimationKey = typeof ANIMATION_KEYS[number]

export interface CharacterConfig {
  id: string
  appearance: CharacterAppearance
}

const DEFAULT_APPEARANCES: Record<string, CharacterAppearance> = {
  warrior: {
    skinColor: SKIN, hairColor: '#1565C0', eyeColor: '#1e88e5',
    shirtColor: '#1976D2', pantsColor: '#37474F', shoesColor: '#5D4037'
  },
  mage: {
    skinColor: SKIN, hairColor: '#7B1FA2', eyeColor: '#ce93d8',
    shirtColor: '#9C27B0', pantsColor: '#4A148C', shoesColor: '#311B92'
  },
  samurai: {
    skinColor: '#f5d0a9', hairColor: '#212121', eyeColor: '#d32f2f',
    shirtColor: '#D32F2F', pantsColor: '#37474F', shoesColor: '#212121'
  },
  bear: {
    skinColor: '#a1887f', hairColor: '#5D4037', eyeColor: '#3e2723',
    shirtColor: '#8D6E63', pantsColor: '#4E342E', shoesColor: '#3E2723'
  },
}

const ANIM_FRAME_RATES: Record<AnimationKey, number> = {
  idle: 5, run: 10, jump: 8, aim: 6, throw: 14, hit: 10, die: 8, win: 6, taunt: 8, crouch: 6, stunned: 6, sleeping: 4
}

export class CharacterGenerator {
  static generateCharacter(scene: Phaser.Scene, charId: string, appearance?: CharacterAppearance) {
    const app = appearance || DEFAULT_APPEARANCES[charId] || DEFAULT_APPEARANCES.warrior
    const texKey = `char_${charId}`

    if (scene.textures.exists(texKey)) return texKey

    let totalFrames = 0
    const frameOffsets: Record<string, { start: number; count: number }> = {}

    for (const animKey of ANIMATION_KEYS) {
      const frames = ANIM_FRAMES[animKey]
      if (!frames) continue
      frameOffsets[animKey] = { start: totalFrames, count: frames.length }
      totalFrames += frames.length
    }

    if (totalFrames === 0) totalFrames = 1

    const sheetW = FW * totalFrames
    const sheetH = FH

    const canvas = document.createElement('canvas')
    canvas.width = sheetW
    canvas.height = sheetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return texKey

    let frameIdx = 0
    for (const animKey of ANIMATION_KEYS) {
      const frames = ANIM_FRAMES[animKey]
      if (!frames) continue
      for (const pose of frames) {
        const offX = frameIdx * FW
        ctx.save()
        ctx.translate(offX, 0)
        ctx.save()
        const sx = pose.squishX || 1
        const sy = pose.squishY || 1
        ctx.translate(FW / 2, FH / 2)
        ctx.scale(sx, sy)
        ctx.translate(-FW / 2, -FH / 2)
        drawBody(ctx, app, pose, false)
        ctx.restore()
        ctx.restore()
        frameIdx++
      }
    }

    const texture = scene.textures.addCanvas(texKey, canvas)
    if (!texture) return texKey

    for (let i = 0; i < totalFrames; i++) {
      texture.add(i, 0, i * FW, 0, FW, FH)
    }

    for (const animKey of ANIMATION_KEYS) {
      const info = frameOffsets[animKey]
      if (!info) continue

      const frameRate = ANIM_FRAME_RATES[animKey] || 8
      const repeat = (animKey === 'idle' || animKey === 'run' || animKey === 'stunned' || animKey === 'sleeping') ? -1 : 0

      if (scene.anims.exists(`${texKey}_${animKey}`)) continue

      scene.anims.create({
        key: `${texKey}_${animKey}`,
        frames: scene.anims.generateFrameNumbers(texKey, {
          start: info.start,
          end: info.start + info.count - 1
        }),
        frameRate,
        repeat
      })
    }

    return texKey
  }

  static getDefaultAppearance(charId: string): CharacterAppearance {
    return { ...DEFAULT_APPEARANCES[charId] || DEFAULT_APPEARANCES.warrior }
  }

  static getAllAppearances(): Record<string, CharacterAppearance> {
    return { ...DEFAULT_APPEARANCES }
  }
}
