import Phaser from 'phaser'
import NetworkManager from '../network/NetworkManager'
import { SKILL_DATA } from '@nem-da/shared/constants'
import { getCharacterById } from '../config/characters'

interface SkillIcon {
  id: string
  bg: Phaser.GameObjects.Rectangle
  keyLabel: Phaser.GameObjects.Text
  nameLabel: Phaser.GameObjects.Text
  cooldownOverlay: Phaser.GameObjects.Graphics
  cooldownText: Phaser.GameObjects.Text
  cooldownEnd: number
}

const SKILL_COLORS: Record<string, number> = {
  rock: 0x9e9e9e,
  big_rock: 0x757575,
  bomb: 0xd32f2f,
  soap: 0x42a5f5,
  pillow: 0xfff176,
  fireball: 0xff5722,
  wind_blade: 0x80deea,
  shuriken: 0x78909c,
  hug_rush: 0x8d6e63,
  honey: 0xffc107,
  rock_rain: 0x9e9e9e,
  triple_rock: 0x9e9e9e
}

export default class UIScene extends Phaser.Scene {
  private network: NetworkManager
  private timerText?: Phaser.GameObjects.Text
  private windIndicator?: Phaser.GameObjects.Text
  private p1HpBar?: Phaser.GameObjects.Graphics
  private p2HpBar?: Phaser.GameObjects.Graphics
  private roundCircles?: Phaser.GameObjects.Graphics
  private skillIcons: SkillIcon[] = []
  private titleLabel?: Phaser.GameObjects.Text
  public selectedSkill: string = 'rock'
  private defenderLabel?: Phaser.GameObjects.Text
  private barCreated: boolean = false

  constructor() {
    super('UIScene')
    this.network = NetworkManager.getInstance()
  }

  private cleanup() {
    this.clearSkillBar()
    this.barCreated = false
    this.skillIcons = []
  }

  create() {
    this.cleanup()
    this.events.on('shutdown', this.cleanup, this)
    const { width, height } = this.cameras.main

    this.roundCircles = this.add.graphics().setDepth(1000)

    this.timerText = this.add.text(width / 2, 20, '15', {
      fontSize: '48px', color: '#00ff00', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000)

    this.windIndicator = this.add.text(width / 2, 60, 'Gió: 0', {
      fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(1000)

    this.p1HpBar = this.add.graphics().setDepth(1000)
    this.add.text(20, 20, 'Player 1', {
      fontSize: '18px', color: '#2196F3'
    }).setDepth(1000)

    this.p2HpBar = this.add.graphics().setDepth(1000)
    this.add.text(width - 20, 20, 'Player 2', {
      fontSize: '18px', color: '#F44336'
    }).setOrigin(1, 0).setDepth(1000)

    // Skill bar title - shown above skill icons
    this.titleLabel = this.add.text(width / 2, height - 110, 'CHON DAN (phim 1-4):', {
      fontSize: '18px', color: '#ffeb3b',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000).setAlpha(0)

    // Defender label
    this.defenderLabel = this.add.text(width / 2, height - 20, '', {
      fontSize: '16px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(1000).setAlpha(0)

    // DEBUG: verify UIScene renders
    this.add.text(width / 2, height / 2, 'UIScene OK', {
      fontSize: '24px', color: '#00ff00', backgroundColor: '#000',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(9999)

    // Listen for skill select events from GameScene (keyboard 1-4)
    this.game.events.on('selectSkill', (skillId: string) => {
      this.setSelectedSkill(skillId)
    })
  }

  public initSkillBar() {
    this.clearSkillBar()
    this.barCreated = false

    const room = this.network.getRoom()
    if (!room) { console.error('[UIScene] No room'); this.addDebugText('ERROR: No room'); return }

    const myPlayerId = room.sessionId
    if (!myPlayerId) { console.error('[UIScene] No sessionId'); this.addDebugText('ERROR: No sessionId'); return }

    const myPlayerData = room.state.players.get(myPlayerId)
    if (!myPlayerData) {
      console.error('[UIScene] No player data - available players:', Array.from(room.state.players.keys()))
      this.addDebugText(`ERROR: No data for ${myPlayerId}`)
      return
    }

    const charId = myPlayerData.characterId || 'warrior'
    console.log(`[UIScene] initSkillBar: charId=${charId}`)
    this.addDebugText(`Creating bar for ${charId}`)

    const char = getCharacterById(charId)
    if (!char) { console.error('[UIScene] Unknown char:', charId); this.addDebugText(`ERROR: Unknown char ${charId}`); return }

    const skills = char.skills
    const { width, height } = this.cameras.main
    const barY = height - 85
    const iconSize = 52
    const spacing = 60

    // Position: center the bar
    const totalWidth = skills.length * spacing
    const startX = (width - totalWidth) / 2 + iconSize / 2

    this.selectedSkill = skills[0] || 'rock'

    // Show title
    if (this.titleLabel) this.titleLabel.setAlpha(1)

    console.log(`[UIScene] Creating skill bar for ${charId}:`, skills)

    skills.forEach((skillId, index) => {
      const x = startX + index * spacing
      const skillData = SKILL_DATA[skillId]
      if (!skillData) return

      const color = SKILL_COLORS[skillId] || 0x666666

      // Skill icon background
      const bg = this.add.rectangle(x, barY, iconSize, iconSize, color, 0.9)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true })
        .setDepth(1000)

      // Skill name
      const nameLabel = this.add.text(x, barY - 8, this.getShortName(skillData.name), {
        fontSize: '12px', color: '#fff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(1001)

      // Damage label
      const dmgText = skillData.damage > 0 ? `${skillData.damage} DMG` : 'DEBUFF'
      this.add.text(x, barY + 10, dmgText, {
        fontSize: '9px', color: '#ffccbc',
        stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(1001)

      // Key label
      const keyLabel = this.add.text(x, barY + iconSize / 2 - 12, `[${index + 1}]`, {
        fontSize: '11px', color: '#ffeb3b',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(1001)

      // Cooldown overlay
      const cooldownOverlay = this.add.graphics().setDepth(1002)
      const cooldownText = this.add.text(x, barY, '', {
        fontSize: '16px', color: '#fff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(1003)

      bg.on('pointerdown', () => {
        this.setSelectedSkill(skillId)
        this.game.events.emit('skillSelected', skillId)
      })

      this.skillIcons.push({
        id: skillId, bg, keyLabel, nameLabel,
        cooldownOverlay, cooldownText, cooldownEnd: 0
      })
    })

    this.highlightSelected()
    this.barCreated = true
    console.log(`[UIScene] Skill bar created with ${skills.length} skills`)
    this.addDebugText(`Bar created: ${skills.join(', ')}`)
  }

  private getShortName(name: string): string {
    if (name.length <= 8) return name
    return name.substring(0, 7) + '..'
  }

  private addDebugText(msg: string) {
    const { width, height } = this.cameras.main
    this.add.text(width / 2, height / 2 + 40, msg, {
      fontSize: '20px', color: '#ffff00', backgroundColor: '#000',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(9999)
  }

  private clearSkillBar() {
    this.skillIcons.forEach(s => {
      s.bg.destroy()
      s.keyLabel.destroy()
      s.nameLabel.destroy()
      s.cooldownOverlay.destroy()
      s.cooldownText.destroy()
    })
    this.skillIcons = []
  }

  private setSelectedSkill(skillId: string) {
    const exists = this.skillIcons.find(s => s.id === skillId)
    if (!exists) return
    this.selectedSkill = skillId
    this.highlightSelected()
  }

  private highlightSelected() {
    this.skillIcons.forEach(s => {
      const isSelected = s.id === this.selectedSkill
      s.bg.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0x00ff00 : 0xffffff)
      if (isSelected) {
        s.bg.setAlpha(1)
      }
    })
  }

  selectSkillByIndex(index: number) {
    if (index >= 0 && index < this.skillIcons.length) {
      const skill = this.skillIcons[index]
      this.setSelectedSkill(skill.id)
      this.game.events.emit('skillSelected', skill.id)
    }
  }

  startCooldown(skillId: string) {
    const skill = this.skillIcons.find(s => s.id === skillId)
    if (!skill) return
    const cd = SKILL_DATA[skillId]?.cooldown || 0
    if (cd <= 0) return
    skill.cooldownEnd = Date.now() + cd * 1000
  }

  getSelectedSkill(): string {
    return this.selectedSkill
  }

  update() {
    const room = this.network.getRoom()
    if (!room || !room.state) return

    const state = room.state

    // Update timer
    const timeLeft = state.timeLeft || 15
    if (this.timerText) {
      this.timerText.setText(timeLeft.toString())

      if (timeLeft <= 5) {
        this.timerText.setColor('#ff0000')
        this.timerText.setVisible(Math.floor(Date.now() / 300) % 2 === 0)
      } else if (timeLeft <= 10) {
        this.timerText.setColor('#ffff00')
        this.timerText.setVisible(true)
      } else {
        this.timerText.setColor('#00ff00')
        this.timerText.setVisible(true)
      }
    }

    // Update wind
    if (this.windIndicator) {
      const windForce = state.windForce || 0
      const windDir = windForce > 0 ? '→' : windForce < 0 ? '←' : ''
      this.windIndicator.setText(`Gió: ${Math.abs(windForce)} ${windDir}`)
    }

    // Defender label
    if (this.defenderLabel) {
      const playerIds = Array.from(state.players.keys())
      const isMyTurn = playerIds[state.currentTurn] === room.sessionId
      if (state.phase === 'playing' && !isMyTurn) {
        this.defenderLabel.setText('\u{1F6E1} Lượt đối thủ — Di chuyển né tránh!').setAlpha(1)
      } else {
        this.defenderLabel.setAlpha(0)
      }
    }

    this.updateSkillCooldowns()
    this.updateHPBars()
    this.updateRoundIndicators(state)
  }

  private updateSkillCooldowns() {
    const now = Date.now()
    this.skillIcons.forEach(s => {
      const cd = SKILL_DATA[s.id]?.cooldown || 0
      if (cd <= 0) return

      const remaining = Math.max(0, s.cooldownEnd - now)

      s.cooldownOverlay.clear()
      if (remaining > 0) {
        const r = 27
        const progress = remaining / (cd * 1000)

        s.cooldownOverlay.fillStyle(0x000000, 0.55)
        s.cooldownOverlay.beginPath()
        s.cooldownOverlay.moveTo(s.bg.x, s.bg.y)
        s.cooldownOverlay.arc(s.bg.x, s.bg.y, r,
          Phaser.Math.DegToRad(-90),
          Phaser.Math.DegToRad(-90 + 360 * (1 - progress)),
          false)
        s.cooldownOverlay.closePath()
        s.cooldownOverlay.fillPath()

        s.cooldownText.setText(`${Math.ceil(remaining / 1000)}s`)
        s.bg.setAlpha(0.4)
      } else {
        s.cooldownText.setText('')
        s.bg.setAlpha(1)
      }
    })
  }

  private updateRoundIndicators(state: any) {
    if (!this.roundCircles) return
    const { width } = this.cameras.main
    const cx = width / 2
    const cy = 80
    this.roundCircles.clear()

    for (let i = 0; i < 3; i++) {
      const x = cx - 30 + i * 25
      const p1Won = i < (state.p1RoundsWon || 0)
      const p2Won = i < (state.p2RoundsWon || 0)

      this.roundCircles.fillStyle(p1Won ? 0x2196F3 : p2Won ? 0xF44336 : 0x666666, 0.7)
      this.roundCircles.fillCircle(x, cy, 8)
      this.roundCircles.lineStyle(2, 0xffffff, 0.5)
      this.roundCircles.strokeCircle(x, cy, 8)
    }
  }

  private updateHPBars() {
    const room = this.network.getRoom()
    if (!room || !room.state) return

    const players = Array.from(room.state.players.values()) as any[]
    if (players.length < 2) return

    if (this.p1HpBar) {
      const p1 = players[0]
      const p1HpPercent = p1.hp / p1.maxHp
      this.p1HpBar.clear()
      this.p1HpBar.fillStyle(0x000000, 0.5)
      this.p1HpBar.fillRect(20, 45, 200, 15)
      this.p1HpBar.fillStyle(this.getHPColor(p1HpPercent), 1)
      this.p1HpBar.fillRect(20, 45, 200 * p1HpPercent, 15)
    }

    if (this.p2HpBar) {
      const p2 = players[1]
      const p2HpPercent = p2.hp / p2.maxHp
      this.p2HpBar.clear()
      this.p2HpBar.fillStyle(0x000000, 0.5)
      this.p2HpBar.fillRect(this.cameras.main.width - 220, 45, 200, 15)
      this.p2HpBar.fillStyle(this.getHPColor(p2HpPercent), 1)
      this.p2HpBar.fillRect(
        this.cameras.main.width - 220 + (200 * (1 - p2HpPercent)),
        45,
        200 * p2HpPercent,
        15
      )
    }
  }

  private getHPColor(percent: number): number {
    if (percent > 0.6) return 0x22dd22
    if (percent > 0.3) return 0xffaa00
    return 0xff2222
  }
}
