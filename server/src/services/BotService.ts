import { PlayerSchema } from '../rooms/schema.js'

const BOT_NAMES = [
  'Bot_Pro', 'Bot_N00b', 'Bot_God', 'Bot_Hehe',
  'Bot_SieuNhan', 'Bot_DaBanh', 'Bot_Luoi', 'Bot_KimCuong',
  'Bot_Xeko', 'Bot_Pika'
]

const CHARACTERS = ['warrior', 'mage', 'samurai', 'bear']

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
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

  decideAction(myX: number, myY: number, targetX: number, targetY: number, windForce: number): { angle: number; power: number; skillId: string } {
    this.turnCount++
    const dx = targetX - myX
    const dy = targetY - myY
    const rawAngle = Math.atan2(dy, dx)
    let angle = rawAngle

    const facingLeft = this.player.facingLeft
    if (facingLeft && rawAngle > -Math.PI / 2) {
      angle = -Math.PI + rawAngle
    } else if (!facingLeft && rawAngle < -Math.PI / 2) {
      angle = Math.PI + rawAngle
    }

    const angleDeg = (angle * 180) / Math.PI
    const clampedAngle = Math.max(facingLeft ? -180 : -90, Math.min(facingLeft ? -90 : 0, angleDeg))

    const accuracy = Math.random()
    let finalAngle: number
    if (accuracy < 0.3) {
      finalAngle = clampedAngle + (Math.random() * 30 - 15)
    } else if (accuracy < 0.7) {
      finalAngle = clampedAngle + (Math.random() * 10 - 5)
    } else {
      finalAngle = clampedAngle
    }

    const skills = this.characterSkills[this.player.characterId] || ['rock']
    const availableSkills = skills.filter(s => {
      const cd = this.cooldowns.get(s) || 0
      return cd <= 0
    })
    const skillId = availableSkills.length > 0 ? randomPick(availableSkills) : 'rock'
    this.cooldowns.set(skillId, 3)

    const power = 0.3 + Math.random() * 0.6

    return {
      angle: Math.max(facingLeft ? -180 : -90, Math.min(facingLeft ? -90 : 0, finalAngle)),
      power,
      skillId
    }
  }

  reduceCooldowns() {
    this.cooldowns.forEach((cd, skill) => {
      this.cooldowns.set(skill, cd - 1)
    })
  }

  reset() {
    this.turnCount = 0
    this.cooldowns.clear()
    this.player.hp = this.player.maxHp
    this.player.isAlive = true
  }

  private getCharacterHP(characterId: string): number {
    const hpMap: Record<string, number> = {
      warrior: 120, mage: 80, samurai: 100, bear: 150
    }
    return hpMap[characterId] || 100
  }
}
