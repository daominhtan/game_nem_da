import Phaser from 'phaser'
import NetworkManager from '../network/NetworkManager'

export default class MenuScene extends Phaser.Scene {
  private network: NetworkManager
  private statusText?: Phaser.GameObjects.Text
  private roomCodeText?: Phaser.GameObjects.Text
  private codeInput?: Phaser.GameObjects.Text
  private inputCode: string = ''
  private playerName: string = ''
  private menuHandlers: Array<{ event: string; handler: (data: any) => void }> = []

  constructor() {
    super('MenuScene')
    this.network = NetworkManager.getInstance()
  }

  private cleanupHandlers() {
    for (const { event, handler } of this.menuHandlers) {
      this.network.off(event, handler)
    }
    this.menuHandlers = []
  }

  create() {
    this.cleanupHandlers()
    const { width, height } = this.cameras.main

    this.add.image(width / 2, height / 2, 'bg_menu')

    this.add.text(width / 2, 60, 'NÉM ĐÁ ONLINE', {
      fontSize: '48px', color: '#fff',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5)

    // Name input section
    this.add.text(width / 2, height / 2 - 150, 'TÊN CỦA BẠN', {
      fontSize: '18px', color: '#aaa',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5)

    const nameBg = this.add.rectangle(width / 2, height / 2 - 115, 300, 40, 0x222222)
      .setStrokeStyle(2, 0x666666)

    this.playerName = this.network.playerName || ''
    const nameDisplay = this.add.text(width / 2, height / 2 - 115, this.playerName || 'Nhập tên...', {
      fontSize: '20px', color: this.playerName ? '#fff' : '#666'
    }).setOrigin(0.5)

    nameBg.setInteractive({ useHandCursor: true })
    nameBg.on('pointerdown', () => this.showNameInput(nameDisplay, height))

    // Status text (hidden by default)
    this.statusText = this.add.text(width / 2, height - 100, '', {
      fontSize: '18px', color: '#ffaa00'
    }).setOrigin(0.5).setVisible(false)

    // Room code display (hidden by default)
    this.roomCodeText = this.add.text(width / 2, height - 140, '', {
      fontSize: '28px', color: '#ffeb3b', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false)

    // Create buttons
    this.createMainMenu(width, height)
  }

  private showNameInput(nameDisplay: Phaser.GameObjects.Text, height: number) {
    let input = this.playerName || ''
    const overlay = this.add.rectangle(
      this.cameras.main.width / 2, height / 2,
      this.cameras.main.width, height, 0x000000, 0.7
    ).setInteractive().setDepth(20)

    const title = this.add.text(this.cameras.main.width / 2, height / 2 - 80, 'NHẬP TÊN', {
      fontSize: '24px', color: '#fff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(21)

    const inpBg = this.add.rectangle(this.cameras.main.width / 2, height / 2 - 20, 300, 45, 0x333333)
      .setStrokeStyle(2, 0xffffff).setDepth(21)

    const inpText = this.add.text(this.cameras.main.width / 2, height / 2 - 20, input || '______', {
      fontSize: '24px', color: '#fff'
    }).setOrigin(0.5).setDepth(22)

    const confirmBtn = this.add.text(this.cameras.main.width / 2, height / 2 + 50, 'XÁC NHẬN', {
      fontSize: '22px', color: '#fff', backgroundColor: '#4CAF50',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(21)

    const displayInput = () => {
      inpText.setText(input || 'Nhập tên...')
      inpText.setColor(input ? '#fff' : '#666')
    }

    const cleanup = () => {
      window.removeEventListener('keydown', keyHandler)
      overlay.destroy(); inpBg.destroy(); inpText.destroy()
      confirmBtn.destroy(); title.destroy()
    }

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (input.trim()) {
          this.playerName = input.trim()
          this.network.playerName = this.playerName
          nameDisplay.setText(this.playerName)
          nameDisplay.setColor('#fff')
        }
        cleanup()
      } else if (e.key === 'Backspace') {
        input = input.slice(0, -1)
      } else if (e.key.length === 1 && input.length < 20 && !e.ctrlKey && !e.metaKey) {
        input += e.key
      }
      displayInput()
    }

    const pasteHandler = (e: ClipboardEvent) => {
      const text = (e.clipboardData || (window as any).clipboardData).getData('text')
      if (text) {
        e.preventDefault()
        input = (input + text).slice(0, 20)
        displayInput()
      }
    }

    window.addEventListener('keydown', keyHandler)
    window.addEventListener('paste', pasteHandler)

    overlay.on('pointerdown', cleanup)
    confirmBtn.on('pointerdown', () => {
      if (input.trim()) {
        this.playerName = input.trim()
        this.network.playerName = this.playerName
        nameDisplay.setText(this.playerName)
        nameDisplay.setColor('#fff')
      }
      cleanup()
    })
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

    const botBtn = this.add.text(width / 2, height / 2 + 100, 'CHƠI VỚI BOT', {
      fontSize: '26px', color: '#fff', backgroundColor: '#9C27B0',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    const joinBtn = this.add.text(width / 2, height / 2 + 170, 'THAM GIA PHÒNG', {
      fontSize: '26px', color: '#fff', backgroundColor: '#FF9800',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    findBtn.on('pointerdown', () => this.onFindMatch())
    createBtn.on('pointerdown', () => this.onCreateRoom())
    botBtn.on('pointerdown', () => this.onPlayBot())
    joinBtn.on('pointerdown', () => this.onJoinRoom())

    // Hover effects
    const buttons = [findBtn, createBtn, botBtn, joinBtn]
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

      const onQueueUpdate = (data: any) => {
        this.showStatus(`Đang chờ người chơi... (${data.position}/2)`)
      }
      const onMatchFound = () => {
        this.network.off('matchFound', onMatchFound)
        this.network.off('queueUpdate', onQueueUpdate)
        this.showStatus('Đã tìm thấy đối thủ!')
        this.scene.start('CharacterSelectScene')
      }
      const onNetworkError = (data: any) => {
        this.showStatus(data.message || 'Lỗi kết nối!')
      }

      this.network.on('queueUpdate', onQueueUpdate)
      this.network.on('matchFound', onMatchFound)
      this.network.on('networkError', onNetworkError)
      this.menuHandlers.push(
        { event: 'queueUpdate', handler: onQueueUpdate },
        { event: 'matchFound', handler: onMatchFound },
        { event: 'networkError', handler: onNetworkError }
      )
    } catch (err) {
      this.showStatus('Lỗi kết nối! Thử lại.')
    }
  }

  private async onPlayBot() {
    this.showStatus('Đang tạo trận với Bot...')
    try {
      await this.network.playWithBot()

      const onMatchFound = () => {
        this.network.off('matchFound', onMatchFound)
        this.showStatus('Đã vào trận với Bot!')
        this.scene.start('CharacterSelectScene')
      }
      const onNetworkError = (data: any) => {
        this.showStatus(data.message || 'Lỗi kết nối!')
      }

      this.network.on('matchFound', onMatchFound)
      this.network.on('networkError', onNetworkError)
      this.menuHandlers.push(
        { event: 'matchFound', handler: onMatchFound },
        { event: 'networkError', handler: onNetworkError }
      )
    } catch (err) {
      this.showStatus('Lỗi kết nối!')
    }
  }

  private async onCreateRoom() {
    this.showStatus('Đang tạo phòng...')
    try {
      await this.network.createPrivateRoom()

      const onRoomCreated = (data: any) => {
        this.showRoomCode(data.code)
        this.showStatus('Đang chờ người tham gia...')
      }
      const onNetworkError = (data: any) => {
        this.showStatus(data.message || 'Lỗi tạo phòng!')
      }
      const onPhaseChange = (data: any) => {
        if (data.current === 'selecting' || data.current === 'countdown' || data.current === 'playing') {
          this.showStatus('Đã có người tham gia!')
          this.scene.start('CharacterSelectScene')
        }
      }

      this.network.on('roomCreated', onRoomCreated)
      this.network.on('networkError', onNetworkError)
      this.network.on('phaseChange', onPhaseChange)
      this.menuHandlers.push(
        { event: 'roomCreated', handler: onRoomCreated },
        { event: 'networkError', handler: onNetworkError },
        { event: 'phaseChange', handler: onPhaseChange }
      )
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

    const cleanup = () => {
      window.removeEventListener('keydown', keyHandler)
      window.removeEventListener('paste', pasteHandler)
      overlay.destroy()
      inputBg.destroy()
      this.codeInput?.destroy()
      confirmBtn.destroy()
      title.destroy()
    }

    const displayCode = () => {
      if (this.codeInput) {
        const display = this.inputCode + '_'.repeat(Math.max(0, 6 - this.inputCode.length))
        this.codeInput.setText(display)
      }
    }

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive()
      .on('pointerdown', cleanup)

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

    const keyHandler = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const key = event.key.toUpperCase()
      if (key === 'ENTER' && this.inputCode.length >= 4) {
        cleanup()
        this.doJoinByCode(this.inputCode)
      } else if (key === 'BACKSPACE') {
        this.inputCode = this.inputCode.slice(0, -1)
      } else if (/^[A-Z0-9]$/.test(key) && this.inputCode.length < 6) {
        this.inputCode += key
      }
      displayCode()
    }

    const pasteHandler = (event: ClipboardEvent) => {
      const text = (event.clipboardData || (window as any).clipboardData).getData('text')
      const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      if (clean) {
        event.preventDefault()
        this.inputCode = clean
        displayCode()
      }
    }

    window.addEventListener('keydown', keyHandler)
    window.addEventListener('paste', pasteHandler)

    confirmBtn.on('pointerdown', () => {
      if (this.inputCode.length >= 4) {
        cleanup()
        this.doJoinByCode(this.inputCode)
      }
    })
  }

  private async doJoinByCode(code: string) {
    this.showStatus('Đang tham gia phòng...')
    try {
      await this.network.joinByCode(code)

      const onMatchFound = () => {
        this.network.off('matchFound', onMatchFound)
        this.showStatus('Đã vào phòng!')
        this.scene.start('CharacterSelectScene')
      }
      const onNetworkError = (data: any) => {
        this.showStatus(data.message || 'Mã phòng không hợp lệ!')
      }

      this.network.on('matchFound', onMatchFound)
      this.network.on('networkError', onNetworkError)
      this.menuHandlers.push(
        { event: 'matchFound', handler: onMatchFound },
        { event: 'networkError', handler: onNetworkError }
      )
    } catch (err) {
      this.showStatus('Không tìm thấy phòng!')
    }
  }
}
