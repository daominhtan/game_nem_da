import { PlayerSchema } from '../rooms/schema.js'

const BOT_NAMES = [
  'Bot_Pro', 'Bot_N00b', 'Bot_God', 'Bot_Hehe',
  'Bot_SieuNhan', 'Bot_DaBanh', 'Bot_Luoi', 'Bot_KimCuong',
  'Bot_Xeko', 'Bot_Pika'
]

const CHARACTERS = ['warrior', 'mage', 'samurai', 'bear']

const GRAVITY = 980
const THROW_SPEED = 1500
const GROUND_Y = 580
const WORLD_MIN_X = 50
const WORLD_MAX_X = 2510

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export class BotPlayer {
  player: PlayerSchema
  private characterSkills: Record<string, string[]> = {
    warrior: ['rock', 'big_rock', 'bomb', 'soap'],
    mage: ['rock', 'fireball', 'pillow', 'wind_blade'],
    samurai: ['rock', 'shuriken', 'wind_blade', 'triple_rock'],
    bear: ['rock', 'hug_rush', 'honey', 'rock_rain']
  }
  private cooldowns: Map<string, number> = new Map()
  private turnCount: number = 0
  private lastDodgeTime: number = 0
  private dodgeDirection: number = 0
  private dodgeTimer: number = 0
  private defendStartX: number = 0
  private defendRange: number = 150
  private lastHumanAngle: number = 0
  private lastHumanPower: number = 0
  private hasObservedHuman: boolean = false

  constructor(botId: string, playerIndex: number) {
    this.player = new PlayerSchema()
    this.player.id = botId
    this.player.name = randomPick(BOT_NAMES)
    this.player.characterId = randomPick(CHARACTERS)
    this.player.x = playerIndex === 0 ? 800 : 1760
    this.player.y = 520
    this.player.facingLeft = playerIndex === 1
    this.player.hp = this.getCharacterHP(this.player.characterId)
    this.player.maxHp = this.player.hp
    this.player.isAlive = true
  }

  selectCharacter(): string {
    this.player.characterId = randomPick(CHARACTERS)
    const hp = this.getCharacterHP(this.player.characterId)
    this.player.hp = hp
    this.player.maxHp = hp
    return this.player.characterId
  }

  observeHumanThrow(angle: number, power: number) {
    this.lastHumanAngle = angle
    this.lastHumanPower = power
    this.hasObservedHuman = true
  }

  decideAction(myX: number, myY: number, targetX: number, targetY: number, windForce: number): { angle: number; power: number; skillId: string } {
    this.turnCount++

    const dx = targetX - myX
    const dy = targetY - myY
    const absDx = Math.abs(dx)
    const facingLeft = this.player.facingLeft

    const skillId = this.pickSkill(facingLeft, absDx)

    let angle: number
    let power: number

    if (this.hasObservedHuman) {
      // Mirror human's angle for bot's side:
      // human facing right (left side, -89 to -15), bot facing left (right side, -180 to -90)
      // mirror: -180 - humanAngle
      const mirroredAngle = -180 - this.lastHumanAngle
      angle = mirroredAngle + (Math.random() * 8 - 4)
      power = clamp(this.lastHumanPower + (Math.random() * 0.1 - 0.05), 0.3, 1.0)
    } else {
      // First turn: optimal calculation with 5% random
      power = this.findBestPower(absDx, dy, windForce)
      angle = this.calculateOptimalAngle(myX, myY, targetX, targetY, power, windForce, facingLeft)
      angle += (Math.random() * 8 - 4)
      power = clamp(power + (Math.random() * 0.1 - 0.05), 0.3, 1.0)
    }

    if (facingLeft) {
      angle = clamp(angle, -180, -90)
    } else {
      angle = clamp(angle, -89, -15)
    }

    return { angle, power, skillId }
  }

  private findBestPower(absDx: number, dy: number, windForce: number): number {
    const g = GRAVITY
    const vMax = THROW_SPEED

    // Try powers from 0.95 down to 0.35 until discriminant >= 0
    for (let p = 0.95; p >= 0.35; p -= 0.05) {
      const v = p * vMax
      const A = (g * absDx * absDx) / (2 * v * v)
      const B = absDx
      const windComp = -windForce * absDx / (v * v)
      const C = A - dy + windComp
      const disc = B * B - 4 * A * C
      if (disc >= 0) return Math.round(p * 100) / 100
    }

    // Fallback: use distance-based heuristic
    if (absDx < 300) return 0.5
    if (absDx < 600) return 0.65
    if (absDx < 1000) return 0.8
    return 0.95
  }

  private calculateOptimalAngle(
    myX: number, myY: number,
    targetX: number, targetY: number,
    power: number, windForce: number,
    facingLeft: boolean
  ): number {
    let dx = targetX - myX
    const dy = targetY - myY
    const absDx = Math.abs(dx)
    const v = power * THROW_SPEED
    const g = GRAVITY

    if (absDx < 60) {
      return facingLeft ? -150 : -75
    }

    const windComp = -windForce * absDx / (v * v)

    const A = (g * absDx * absDx) / (2 * v * v)
    const B = absDx
    const C = A - dy + windComp

    const discriminant = B * B - 4 * A * C

    let angleDeg: number

    if (discriminant < 0) {
      angleDeg = facingLeft ? -150 : -55
    } else {
      const sqrtD = Math.sqrt(discriminant)
      const T1 = (-B + sqrtD) / (2 * A)
      const T2 = (-B - sqrtD) / (2 * A)
      const T = Math.abs(T1) > Math.abs(T2) ? T1 : T2
      angleDeg = Math.atan(T) * (180 / Math.PI)
    }

    if (facingLeft) {
      return -180 - angleDeg
    }
    return angleDeg
  }

  private pickSkill(facingLeft: boolean, absDx: number): string {
    const skills = this.characterSkills[this.player.characterId] || ['rock']
    const available = skills.filter(s => {
      const cd = this.cooldowns.get(s) || 0
      return cd <= 0
    })

    if (available.length === 0) return 'rock'

    const preferred = available.filter(s => s !== 'rock')
    if (preferred.length > 0 && Math.random() < 0.55) {
      const picked = randomPick(preferred)
      this.cooldowns.set(picked, 3)
      return picked
    }

    const picked = randomPick(available)
    if (picked !== 'rock') this.cooldowns.set(picked, 3)
    return picked
  }

  decideDodge(
    myX: number, myY: number,
    projX: number, projY: number,
    projVx: number, projVy: number,
    windForce: number
  ): { moveX: number; jump: boolean; crouch: boolean } {
    const now = Date.now()
    if (now - this.lastDodgeTime < 400) {
      if (this.dodgeTimer > 0) {
        this.dodgeTimer--
        return {
          moveX: this.dodgeDirection,
          jump: false,
          crouch: false
        }
      }
      return { moveX: 0, jump: false, crouch: false }
    }

    const dt = 1.0
    const predX = projX + projVx * dt + 0.5 * windForce * dt * dt
    const predY = projY + projVy * dt + 0.5 * GRAVITY * dt * dt

    const distToBotX = predX - myX
    const distToBotY = predY - myY

    const isApproaching = (projVx > 0 && projX < myX) || (projVx < 0 && projX > myX)

    if (!isApproaching || Math.abs(distToBotX) > 500 || Math.abs(distToBotY) > 400) {
      return { moveX: 0, jump: false, crouch: false }
    }

    this.lastDodgeTime = now
    const roll = Math.random()

    if (roll < 0.35) {
      this.dodgeDirection = distToBotX > 0 ? -200 : 200
      this.dodgeTimer = 3
      return {
        moveX: this.dodgeDirection,
        jump: true,
        crouch: false
      }
    } else if (roll < 0.65) {
      this.dodgeDirection = distToBotX > 0 ? -250 : 250
      this.dodgeTimer = 4
      return {
        moveX: this.dodgeDirection,
        jump: false,
        crouch: false
      }
    } else if (roll < 0.85) {
      this.dodgeDirection = 0
      this.dodgeTimer = 2
      return {
        moveX: 0,
        jump: false,
        crouch: true
      }
    }

    this.dodgeTimer = 0
    return { moveX: 0, jump: false, crouch: false }
  }

  applyDodgeResult(result: { moveX: number; jump: boolean; crouch: boolean }) {
    if (result.moveX !== 0) {
      const newX = this.player.x + result.moveX
      const minX = Math.max(WORLD_MIN_X, this.defendStartX - this.defendRange)
      const maxX = Math.min(WORLD_MAX_X, this.defendStartX + this.defendRange)
      this.player.x = clamp(newX, minX, maxX)
      this.player.facingLeft = result.moveX < 0
      this.player.animState = 'run'
    } else if (result.crouch) {
      this.player.isCrouching = true
      this.player.animState = 'crouch'
    } else {
      this.player.isCrouching = false
      this.player.animState = 'idle'
    }

    if (result.jump) {
      this.player.velocityY = -600
      this.player.y -= 30
      this.player.animState = 'jump'
    }
  }

  reduceCooldowns() {
    this.cooldowns.forEach((cd, skill) => {
      this.cooldowns.set(skill, cd - 1)
    })
  }

  resetForNewRound() {
    this.turnCount = 0
    this.lastDodgeTime = 0
    this.dodgeTimer = 0
    this.dodgeDirection = 0
    this.player.hp = this.player.maxHp
    this.player.isAlive = true
    this.player.isCrouching = false
    this.player.animState = 'idle'
  }

  reset() {
    this.resetForNewRound()
    this.cooldowns.clear()
  }

  setDefendPosition(x: number) {
    this.defendStartX = x
  }

  getDefendStartX(): number {
    return this.defendStartX
  }

  getDefendRange(): number {
    return this.defendRange
  }

  private getCharacterHP(characterId: string): number {
    const hpMap: Record<string, number> = {
      warrior: 120, mage: 80, samurai: 100, bear: 150
    }
    return hpMap[characterId] || 100
  }
}
