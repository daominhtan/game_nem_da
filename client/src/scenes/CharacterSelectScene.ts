import Phaser from 'phaser'
import NetworkManager from '../network/NetworkManager'
import { CHARACTERS } from '../config/characters'
import { GAME_CONFIG } from '@nem-da/shared/constants'

export default class CharacterSelectScene extends Phaser.Scene {
  private network: NetworkManager
  private selectedChar: string = 'warrior'
  private timer: number = 30
  private timerText?: Phaser.GameObjects.Text
  private readySent: boolean = false

  constructor() {
    super('CharacterSelectScene')
    this.network = NetworkManager.getInstance()
  }

  create() {
    const { width, height } = this.cameras.main
    const room = this.network.getRoom()
    if (!room) {
      this.scene.start('MenuScene')
      return
    }

    this.add.image(width / 2, height / 2, 'bg_menu')

    this.add.text(width / 2, 50, 'CHỌN NHÂN VẬT', {
      fontSize: '36px', color: '#fff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5)

    this.timerText = this.add.text(width / 2, 100, `Thời gian: ${this.timer}s`, {
      fontSize: '20px', color: '#ffaa00'
    }).setOrigin(0.5)

    const charCards = this.createCharacterCards(width / 2, 280)
    this.selectCharacter(0, charCards)

    this.add.text(width / 2, height - 180, 'Chọn nhân vật và nhấn SẴN SÀNG', {
      fontSize: '18px', color: '#ccc'
    }).setOrigin(0.5)

    const readyBtn = this.add.text(width / 2, height - 100, 'SẴN SÀNG', {
      fontSize: '28px', color: '#fff', backgroundColor: '#4CAF50',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    readyBtn.on('pointerdown', () => {
      if (this.readySent) return
      this.readySent = true
      this.network.sendReady(this.selectedChar)
      readyBtn.setText('ĐÃ SẴN SÀNG').setAlpha(0.6)
    })

    readyBtn.on('pointerover', () => !this.readySent && readyBtn.setAlpha(0.8))
    readyBtn.on('pointerout', () => !this.readySent && readyBtn.setAlpha(1))

    // Listen for phase changes
    const checkPhase = () => {
      const state = this.network.getState()
      if (state && (state.phase === 'countdown' || state.phase === 'playing')) {
        this.scene.start('GameScene')
      }
    }
    this.time.addEvent({ delay: 500, callback: checkPhase, loop: true })

    // Timer countdown
    this.time.addEvent({
      delay: 1000, callback: () => {
        this.timer--
        if (this.timerText) {
          this.timerText.setText(`Thời gian: ${this.timer}s`)
        }
        if (this.timer <= 0 && !this.readySent) {
          this.readySent = true
          this.network.sendReady(this.selectedChar)
          readyBtn.setText('HẾT GIỜ!').setAlpha(0.6)
        }
      }, loop: true
    })
  }

  private selectCharacter(index: number, cards: Phaser.GameObjects.Container[]) {
    this.selectedChar = CHARACTERS[index].id
    cards.forEach((c, i) => {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle
      if (bg) {
        bg.setStrokeStyle(i === index ? 4 : 0, i === index ? 0x00ff00 : 0x000000)
      }
    })
  }

  private createCharacterCards(x: number, y: number): Phaser.GameObjects.Container[] {
    const cards: Phaser.GameObjects.Container[] = []
    const cardWidth = 150
    const spacing = 170
    const startX = x - ((CHARACTERS.length - 1) * spacing) / 2

    CHARACTERS.forEach((char, index) => {
      const bg = this.add.rectangle(0, 0, cardWidth, 200, 0x333333, 0.8)
        .setStrokeStyle(0, 0x000000)
        .setInteractive({ useHandCursor: true })

      bg.on('pointerdown', () => {
        this.selectCharacter(index, cards)
      })

      const sprite = this.add.sprite(0, -50, 'char_' + char.id)
      sprite.setScale(2)
      const name = this.add.text(0, 40, char.name, { fontSize: '14px', color: '#fff', align: 'center' }).setOrigin(0.5)
      const hpText = this.add.text(0, 60, `HP: ${char.hp}`, { fontSize: '14px', color: '#4CAF50' }).setOrigin(0.5)
      const speedText = this.add.text(0, 80, `Speed: ${char.moveSpeed}`, { fontSize: '14px', color: '#2196F3' }).setOrigin(0.5)

      const card = this.add.container(startX + index * spacing, y, [bg, sprite, name, hpText, speedText])
      cards.push(card)
    })

    return cards
  }
}
