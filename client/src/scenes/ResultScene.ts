import Phaser from 'phaser'

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene')
  }

  create(data: any) {
    const { width, height } = this.cameras.main

    // Background overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)

    // Determine winner
    const winnerId = data?.winnerId
    const room = this.game.scene.getScenes(true).find(s => s.scene.key === 'GameScene') as any
    const myPlayerId = room?.network?.getRoom()?.sessionId

    const isWin = winnerId === myPlayerId

    // Result text
    const resultText = isWin ? 'CHIẾN THẮNG!' : 'THẤT BẠI!'
    const resultColor = isWin ? '#ffff00' : '#ff0000'

    this.add.text(width / 2, height / 2 - 100, resultText, {
      fontSize: '64px',
      color: resultColor,
      stroke: '#000',
      strokeThickness: 8
    }).setOrigin(0.5)

    // Score
    const p1Wins = data?.p1RoundsWon || 0
    const p2Wins = data?.p2RoundsWon || 0
    this.add.text(width / 2, height / 2, `Tỷ sổ: ${p1Wins} - ${p2Wins}`, {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // Buttons
    const playAgainBtn = this.add.text(width / 2, height / 2 + 100, 'CHƠI LẠI', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#4CAF50',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive()

    playAgainBtn.on('pointerdown', () => {
      this.scene.stop('UIScene')
      this.scene.stop('GameScene')
      this.scene.start('GameScene')
    })

    const menuBtn = this.add.text(width / 2, height / 2 + 160, 'VỀ MENU', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#2196F3',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive()

    menuBtn.on('pointerdown', () => {
      this.scene.stop('UIScene')
      this.scene.stop('GameScene')
      this.scene.start('MenuScene')
    })
  }
}
