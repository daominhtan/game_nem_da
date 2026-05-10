import Phaser from 'phaser'
import NetworkManager from '../network/NetworkManager'

export default class MenuScene extends Phaser.Scene {
  private network: NetworkManager
  private statusText?: Phaser.GameObjects.Text
  private roomCodeText?: Phaser.GameObjects.Text
  private codeInput?: Phaser.GameObjects.Text
  private inputCode: string = ''

  constructor() {
    super('MenuScene')
    this.network = NetworkManager.getInstance()
  }

  create() {
    const { width, height } = this.cameras.main

    this.add.image(width / 2, height / 2, 'bg_menu')

    this.add.text(width / 2, 60, 'NÉM ĐÁ ONLINE', {
      fontSize: '48px', color: '#fff',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5)

    // Status text (hidden by default)
    this.statusText = this.add.text(width / 2, height - 180, '', {
      fontSize: '18px', color: '#ffaa00'
    }).setOrigin(0.5).setVisible(false)

    // Room code display (hidden by default)
    this.roomCodeText = this.add.text(width / 2, height - 220, '', {
      fontSize: '28px', color: '#ffeb3b', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false)

    // Create buttons
    this.createMainMenu(width, height)
  }

  private createMainMenu(width: number, height: number) {
    const findBtn = this.add.text(width / 2, height / 2 - 60, 'TÌM TRẬN', {
      fontSize: '26px', color: '#fff', backgroundColor: '#4CAF50',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    const createBtn = this.add.text(width / 2, height / 2 + 20, 'TẠO PHÒNG', {
      fontSize: '26px', color: '#fff', backgroundColor: '#2196F3',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    const joinBtn = this.add.text(width / 2, height / 2 + 100, 'THAM GIA PHÒNG', {
      fontSize: '26px', color: '#fff', backgroundColor: '#FF9800',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    findBtn.on('pointerdown', () => this.onFindMatch())
    createBtn.on('pointerdown', () => this.onCreateRoom())
    joinBtn.on('pointerdown', () => this.onJoinRoom())

    // Hover effects
    const buttons = [findBtn, createBtn, joinBtn]
    buttons.forEach(btn => {
      btn.on('pointerover', () => btn.setAlpha(0.8))
      btn.on('pointerout', () => btn.setAlpha(1))
    })
  }

  private showStatus(msg: string) {
    if (this.statusText) {
      this.statusText.setText(msg).setVisible(true)
    }
  }

  private async onFindMatch() {
    this.showStatus('Đang tìm trận...')
    try {
      await this.network.joinMatchmaking()
      this.network.on('queueUpdate', (data: any) => {
        this.showStatus(`Đang chờ người chơi... (${data.position}/2)`)
      })
      this.network.on('matchFound', () => {
        this.network.off('matchFound', () => {})
        this.network.off('queueUpdate', () => {})
        this.showStatus('Đã tìm thấy đối thủ!')
        this.scene.start('CharacterSelectScene')
      })
      this.network.on('networkError', (data: any) => {
        this.showStatus(data.message || 'Lỗi kết nối!')
      })
    } catch (err) {
      this.showStatus('Lỗi kết nối! Thử lại.')
    }
  }

  private async onCreateRoom() {
    this.showStatus('Đang tạo phòng...')
    try {
      await this.network.createPrivateRoom()
      this.network.on('roomCreated', (data: any) => {
        this.showRoomCode(data.code)
        this.showStatus('Đang chờ người tham gia...')
      })
      this.network.on('networkError', (data: any) => {
        this.showStatus(data.message || 'Lỗi tạo phòng!')
      })
      this.network.on('phaseChange', (data: any) => {
        if (data.current === 'selecting' || data.current === 'countdown' || data.current === 'playing') {
          this.showStatus('Đã có người tham gia!')
          this.scene.start('CharacterSelectScene')
        }
      })
    } catch (err) {
      this.showStatus('Lỗi kết nối!')
    }
  }

  private showRoomCode(code: string) {
    const { width, height } = this.cameras.main

    const bg = this.add.rectangle(width / 2, height / 2 - 20, 360, 140, 0x000000, 0.6)
      .setStrokeStyle(2, 0xffeb3b)

    this.add.text(width / 2, height / 2 - 65, 'MÃ PHÒNG CỦA BẠN', {
      fontSize: '16px', color: '#ccc'
    }).setOrigin(0.5)

    const codeText = this.add.text(width / 2, height / 2 - 20, code, {
      fontSize: '48px', color: '#ffeb3b', fontStyle: 'bold',
      letterSpacing: 12
    }).setOrigin(0.5)

    const copyBtn = this.add.text(width / 2, height / 2 + 35, 'SAO CHÉP', {
      fontSize: '18px', color: '#fff', backgroundColor: '#2196F3',
      padding: { x: 16, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    copyBtn.on('pointerdown', async () => {
      try {
        await navigator.clipboard.writeText(code)
        copyBtn.setText('ĐÃ SAO CHÉP!').setBackgroundColor('#4CAF50')
        this.time.delayedCall(2000, () => {
          copyBtn.setText('SAO CHÉP').setBackgroundColor('#2196F3')
        })
      } catch {
        const ta = document.createElement('textarea')
        ta.value = code
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        copyBtn.setText('ĐÃ SAO CHÉP!').setBackgroundColor('#4CAF50')
        this.time.delayedCall(2000, () => {
          copyBtn.setText('SAO CHÉP').setBackgroundColor('#2196F3')
        })
      }
    })

    copyBtn.on('pointerover', () => copyBtn.setAlpha(0.8))
    copyBtn.on('pointerout', () => copyBtn.setAlpha(1))
  }

  private async onJoinRoom() {
    const { width, height } = this.cameras.main
    this.inputCode = ''

    // Show code input UI
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive()
      .on('pointerdown', () => {
        overlay.destroy()
        inputBg.destroy()
        this.codeInput?.destroy()
        confirmBtn.destroy()
        title.destroy()
      })

    const title = this.add.text(width / 2, height / 2 - 100, 'NHẬP MÃ PHÒNG', {
      fontSize: '28px', color: '#fff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(10)

    const inputBg = this.add.rectangle(width / 2, height / 2, 300, 50, 0x333333)
      .setStrokeStyle(2, 0xffffff).setDepth(10)

    this.codeInput = this.add.text(width / 2, height / 2, this.inputCode || '______', {
      fontSize: '32px', color: '#fff', letterSpacing: 8
    }).setOrigin(0.5).setDepth(11)

    const confirmBtn = this.add.text(width / 2, height / 2 + 80, 'THAM GIA', {
      fontSize: '24px', color: '#fff', backgroundColor: '#FF9800',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)

    // Keyboard input for room code
    const keyHandler = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase()
      if (key === 'ENTER' && this.inputCode.length >= 4) {
        window.removeEventListener('keydown', keyHandler)
        overlay.destroy()
        inputBg.destroy()
        this.codeInput?.destroy()
        confirmBtn.destroy()
        title.destroy()
        this.doJoinByCode(this.inputCode)
      } else if (key === 'BACKSPACE') {
        this.inputCode = this.inputCode.slice(0, -1)
      } else if (/^[A-Z0-9]$/.test(key) && this.inputCode.length < 6) {
        this.inputCode += key
      }
      if (this.codeInput) {
        const display = this.inputCode + '_'.repeat(Math.max(0, 6 - this.inputCode.length))
        this.codeInput.setText(display)
      }
    }

    window.addEventListener('keydown', keyHandler)

    confirmBtn.on('pointerdown', () => {
      if (this.inputCode.length >= 4) {
        window.removeEventListener('keydown', keyHandler)
        overlay.destroy()
        inputBg.destroy()
        this.codeInput?.destroy()
        confirmBtn.destroy()
        title.destroy()
        this.doJoinByCode(this.inputCode)
      }
    })
  }

  private async doJoinByCode(code: string) {
    this.showStatus('Đang tham gia phòng...')
    try {
      await this.network.joinByCode(code)
      this.network.on('matchFound', () => {
        this.network.off('matchFound', () => {})
        this.showStatus('Đã vào phòng!')
        this.scene.start('CharacterSelectScene')
      })
      this.network.on('networkError', (data: any) => {
        this.showStatus(data.message || 'Mã phòng không hợp lệ!')
      })
    } catch (err) {
      this.showStatus('Không tìm thấy phòng!')
    }
  }
}
