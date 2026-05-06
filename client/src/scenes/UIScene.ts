import Phaser from 'phaser'
import NetworkManager from '../network/NetworkManager'

export default class UIScene extends Phaser.Scene {
  private network: NetworkManager
  private timerText?: Phaser.GameObjects.Text
  private windIndicator?: Phaser.GameObjects.Text
  private p1HpBar?: Phaser.GameObjects.Graphics
  private p2HpBar?: Phaser.GameObjects.Graphics

  constructor() {
    super('UIScene')
    this.network = NetworkManager.getInstance()
  }

  create() {
    const { width } = this.cameras.main

    // Timer display
    this.timerText = this.add.text(width / 2, 20, '15', {
      fontSize: '48px',
      color: '#00ff00',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000)

    // Wind indicator
    this.windIndicator = this.add.text(width / 2, 60, 'Gió: 0', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1000)

    // Player 1 HP bar (left)
    this.p1HpBar = this.add.graphics().setDepth(1000)
    this.add.text(20, 20, 'Player 1', {
      fontSize: '18px',
      color: '#2196F3'
    }).setDepth(1000)

    // Player 2 HP bar (right)
    this.p2HpBar = this.add.graphics().setDepth(1000)
    this.add.text(width - 20, 20, 'Player 2', {
      fontSize: '18px',
      color: '#F44336'
    }).setOrigin(1, 0).setDepth(1000)

    // Round indicator (best of 3)
    for (let i = 0; i < 3; i++) {
      this.add.circle(width / 2 - 30 + i * 25, 80, 8, 0x666666, 0.5).setDepth(1000)
    }
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

    // Update HP bars
    this.updateHPBars()
  }

  private updateHPBars() {
    const room = this.network.getRoom()
    if (!room || !room.state) return

    const players = Array.from(room.state.players.values()) as any[]
    if (players.length < 2) return

    // Player 1 HP
    if (this.p1HpBar) {
      const p1 = players[0]
      const p1HpPercent = p1.hp / p1.maxHp
      this.p1HpBar.clear()
      this.p1HpBar.fillStyle(0x000000, 0.5)
      this.p1HpBar.fillRect(20, 45, 200, 15)
      this.p1HpBar.fillStyle(this.getHPColor(p1HpPercent), 1)
      this.p1HpBar.fillRect(20, 45, 200 * p1HpPercent, 15)
    }

    // Player 2 HP
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
