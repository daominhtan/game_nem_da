import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload() {}

  create() {
    this.createCharacterTextures()
    this.createProjectileTextures()
    this.createFxTextures()
    this.createBackgroundTextures()
    this.createGroundTexture()

    this.time.delayedCall(100, () => {
      this.scene.start('MenuScene')
    })
  }

  private createCharacterTextures() {
    const characters = [
      { key: 'warrior', color: '#2196F3', darkColor: '#1565C0', darkerColor: '#0D47A1' },
      { key: 'mage', color: '#9C27B0', darkColor: '#7B1FA8', darkerColor: '#4A148C' },
      { key: 'samurai', color: '#F44336', darkColor: '#D32F2F', darkerColor: '#B71C1C' },
      { key: 'bear', color: '#795548', darkColor: '#5D4037', darkerColor: '#3E2723' }
    ]

    characters.forEach(char => {
      if (this.textures.exists(char.key)) return

      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 80
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = char.color
      ctx.fillRect(16, 10, 32, 30)
      ctx.fillStyle = char.darkColor
      ctx.fillRect(12, 40, 40, 25)
      ctx.fillStyle = char.darkerColor
      ctx.fillRect(16, 65, 12, 12)
      ctx.fillRect(36, 65, 12, 12)
      ctx.fillStyle = '#fff'
      ctx.fillRect(22, 18, 8, 8)
      ctx.fillRect(34, 18, 8, 8)
      ctx.fillStyle = '#000'
      ctx.fillRect(24, 20, 4, 4)
      ctx.fillRect(36, 20, 4, 4)

      this.textures.addCanvas(char.key, canvas)
    })
  }

  private createProjectileTextures() {
    const projectiles = [
      { key: 'rock', color: '#9E9E9E', size: 32 },
      { key: 'bomb', color: '#212121', size: 32 },
      { key: 'soap', color: '#E1F5FE', size: 32 },
      { key: 'pillow', color: '#FFF9C4', size: 32 },
      { key: 'big_rock', color: '#757575', size: 40 },
      { key: 'fireball', color: '#FF5722', size: 32 },
      { key: 'wind_blade', color: '#B3E5FC', size: 32 },
      { key: 'shuriken', color: '#607D8B', size: 32 },
      { key: 'hug_rush', color: '#8D6E63', size: 32 },
      { key: 'honey', color: '#FFC107', size: 32 },
      { key: 'rock_rain', color: '#9E9E9E', size: 24 },
      { key: 'triple_rock', color: '#9E9E9E', size: 28 }
    ]

    projectiles.forEach(p => this.createCircleTexture(p.key, p.color, p.size))
  }

  private createFxTextures() {
    this.createCircleTexture('fx_spark', '#ffffff', 8)
    this.createCircleTexture('fx_dust', '#b0b0b0', 12)
    this.createCircleTexture('fx_star', '#ffeb3b', 16)
    this.createCircleTexture('fx_fire', '#ff6600', 12)
    this.createCircleTexture('fx_smoke', '#555555', 16)
  }

  private createBackgroundTextures() {
    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = 1280
    bgCanvas.height = 720
    const bgCtx = bgCanvas.getContext('2d')
    if (!bgCtx) return

    const grad = bgCtx.createLinearGradient(0, 0, 0, 720)
    grad.addColorStop(0, '#87CEEB')
    grad.addColorStop(0.6, '#B0E0E6')
    grad.addColorStop(0.8, '#98FB98')
    grad.addColorStop(1, '#228B22')
    bgCtx.fillStyle = grad
    bgCtx.fillRect(0, 0, 1280, 720)

    bgCtx.fillStyle = 'rgba(255,255,255,0.8)'
    bgCtx.beginPath(); bgCtx.arc(200, 100, 40, 0, Math.PI*2); bgCtx.fill()
    bgCtx.beginPath(); bgCtx.arc(250, 110, 30, 0, Math.PI*2); bgCtx.fill()
    bgCtx.beginPath(); bgCtx.arc(800, 80, 50, 0, Math.PI*2); bgCtx.fill()
    bgCtx.beginPath(); bgCtx.arc(860, 90, 35, 0, Math.PI*2); bgCtx.fill()

    bgCtx.fillStyle = '#2E7D32'
    bgCtx.fillRect(50, 400, 30, 180)
    bgCtx.beginPath(); bgCtx.arc(65, 380, 60, 0, Math.PI*2); bgCtx.fill()
    bgCtx.fillRect(1100, 380, 30, 200)
    bgCtx.beginPath(); bgCtx.arc(1115, 360, 70, 0, Math.PI*2); bgCtx.fill()

    bgCtx.fillStyle = '#4CAF50'
    bgCtx.fillRect(0, 570, 1280, 10)

    this.textures.addCanvas('bg_game', bgCanvas)

    const menuBg = document.createElement('canvas')
    menuBg.width = 1280
    menuBg.height = 720
    const mCtx = menuBg.getContext('2d')
    if (!mCtx) return

    const menuGrad = mCtx.createLinearGradient(0, 0, 0, 720)
    menuGrad.addColorStop(0, '#1a237e')
    menuGrad.addColorStop(1, '#4a148c')
    mCtx.fillStyle = menuGrad
    mCtx.fillRect(0, 0, 1280, 720)

    mCtx.fillStyle = '#fff'
    for (let i = 0; i < 50; i++) {
      mCtx.beginPath()
      mCtx.arc(Math.random() * 1280, Math.random() * 500, Math.random() * 2 + 1, 0, Math.PI * 2)
      mCtx.fill()
    }

    this.textures.addCanvas('bg_menu', menuBg)
  }

  private createGroundTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // --- Dirt/soil layers ---
    const dirtGrad = ctx.createLinearGradient(0, 30, 0, 200)
    dirtGrad.addColorStop(0, '#5D4037')
    dirtGrad.addColorStop(0.3, '#6D4C41')
    dirtGrad.addColorStop(0.7, '#5D4037')
    dirtGrad.addColorStop(1, '#4E342E')
    ctx.fillStyle = dirtGrad
    ctx.fillRect(0, 30, 1280, 170)

    // Dirt texture spots (darker/lighter patches)
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * 1280
      const y = 30 + Math.random() * 170
      const r = 2 + Math.random() * 6
      const alpha = 0.1 + Math.random() * 0.2
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Small stones/pebbles in dirt
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * 1280
      const y = 50 + Math.random() * 140
      const w = 4 + Math.random() * 10
      const h = 3 + Math.random() * 6
      const gray = 100 + Math.floor(Math.random() * 80)
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`
      ctx.beginPath()
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgb(${gray-30},${gray-30},${gray-30})`
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

    // --- Grass layer ---
    const grassGrad = ctx.createLinearGradient(0, 0, 0, 35)
    grassGrad.addColorStop(0, '#66BB6A')
    grassGrad.addColorStop(0.4, '#4CAF50')
    grassGrad.addColorStop(1, '#388E3C')
    ctx.fillStyle = grassGrad
    ctx.fillRect(0, 0, 1280, 35)

    // Grass blade clusters
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1280
      const bladeHeight = 8 + Math.random() * 18
      const bladeWidth = 1.5 + Math.random() * 2
      const shade = Math.random() * 40
      ctx.fillStyle = `rgb(${80 + shade}, ${160 + shade}, ${50 + shade})`
      ctx.beginPath()
      ctx.ellipse(x, 30 - bladeHeight * 0.3, bladeWidth, bladeHeight, Math.random() * 0.4 - 0.2, 0, Math.PI * 2)
      ctx.fill()

      // Second blade at a slight offset
      ctx.beginPath()
      ctx.ellipse(x + 3 + Math.random() * 4, 30 - bladeHeight * 0.2, bladeWidth * 0.7, bladeHeight * 0.8, Math.random() * 0.3 - 0.15, 0, Math.PI * 2)
      ctx.fill()
    }

    // Shadow line at grass-dirt boundary
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fillRect(0, 28, 1280, 5)

    // Small flowers/details on grass
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 1280
      const y = Math.random() * 20
      const flowerColors = ['#FFF176', '#EF9A9A', '#CE93D8', '#90CAF9']
      ctx.fillStyle = flowerColors[Math.floor(Math.random() * flowerColors.length)]
      ctx.beginPath()
      ctx.arc(x, y, 2 + Math.random() * 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFF9C4'
      ctx.beginPath()
      ctx.arc(x + Math.random() * 3, y - 1 + Math.random() * 3, 1, 0, Math.PI * 2)
      ctx.fill()
    }

    this.textures.addCanvas('ground', canvas)
  }

  private createCircleTexture(key: string, color: string, size: number) {
    if (this.textures.exists(key)) return

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2
    ctx.stroke()

    this.textures.addCanvas(key, canvas)
  }
}
