import Phaser from 'phaser'
import NetworkManager from '../network/NetworkManager'
import PlayerEntity from '../entities/PlayerEntity'
import AimSystem from '../systems/AimSystem'
import ProjectileSystem from '../systems/ProjectileSystem'
import { SoundManager } from '../systems/SoundManager'
import { GAME_CONFIG, SKILL_DATA, PLATFORMS } from '@nem-da/shared/constants'
import { getCharacterById } from '../config/characters'

export default class GameScene extends Phaser.Scene {
  private network: NetworkManager
  private players: Map<string, PlayerEntity>
  private aimSystem: AimSystem
  private projectileSystem: ProjectileSystem
  private myPlayerId: string = ''
  private isMyTurn: boolean = false
  private hasThrownThisTurn: boolean = false
  private phase: string = 'waiting'
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>
  private moveState: { left: boolean; right: boolean; up: boolean } = { left: false, right: false, up: false }
  private skillKeys?: Phaser.Input.Keyboard.Key[]
  private syncTimer?: Phaser.Time.TimerEvent
  private selectedSkill: string = 'rock'
  private skillBarRects: Phaser.GameObjects.Rectangle[] = []
  private skillBarCreated: boolean = false
  private sfx: SoundManager

  private farBg?: Phaser.GameObjects.TileSprite
  private midBg?: Phaser.GameObjects.TileSprite
  private nearBg?: Phaser.GameObjects.TileSprite
  private groundTile?: Phaser.GameObjects.TileSprite
  private platformGroup?: Phaser.Physics.Arcade.StaticGroup
  private cloudSprites: Phaser.GameObjects.Image[] = []
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private leafEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private cameraTargetX: number = 640
  private cameraTargetY: number = 360
  private lastTurnNumber: number = -1
  private defendStartX: number = 0
  private defendRange: number = 150
  private localEnergy: number = 0
  private energyText?: Phaser.GameObjects.Text

  constructor() {
    super('GameScene')
    this.network = NetworkManager.getInstance()
    this.players = new Map()
    this.aimSystem = new AimSystem(this)
    this.projectileSystem = new ProjectileSystem(this)
    this.sfx = SoundManager.getInstance()
  }

  private cleanup() {
    this.players.clear()
    this.skillBarRects = []
    this.skillBarCreated = false
    this.selectedSkill = 'rock'
    this.hasThrownThisTurn = false
    this.isMyTurn = false
    this.phase = 'waiting'
    this.cloudSprites = []
    this.localEnergy = 0
    this.lastTurnNumber = -1
    this.defendStartX = 0
    this.moveState = { left: false, right: false, up: false }
    this.destroyEnergyDisplay()
  }

  create() {
    this.cleanup()
    this.events.on('shutdown', this.cleanup, this)
    this.aimSystem = new AimSystem(this)
    this.projectileSystem = new ProjectileSystem(this)
    const { height } = this.cameras.main
    const viewW = GAME_CONFIG.width
    const worldW = GAME_CONFIG.worldWidth

    // Setup world and camera
    this.physics.world.setBounds(0, 0, worldW, GAME_CONFIG.groundLevel)
    this.cameras.main.setBounds(0, 0, worldW, GAME_CONFIG.height)
    this.cameras.main.setScroll(0, 0)

    // Parallax backgrounds (3 layers)
    this.farBg = this.add.tileSprite(0, 0, worldW, height, 'bg_far').setOrigin(0, 0).setDepth(-10)
    this.midBg = this.add.tileSprite(0, 0, worldW, height, 'bg_mid').setOrigin(0, 0).setDepth(-5)
    this.nearBg = this.add.tileSprite(0, 0, worldW, height, 'bg_near').setOrigin(0, 0).setDepth(0)

    // Ground visual (full world width)
    this.groundTile = this.add.tileSprite(
      worldW / 2, GAME_CONFIG.groundLevel + 100, worldW, 200, 'ground'
    ).setDepth(10)

    // Floating clouds (3-5 clouds)
    this.createClouds()

    // Ambient particles
    this.createAmbientParticles()

    // Floating platforms
    this.createPlatforms()

    // Keyboard
    this.setupKeyboardInput()

    // Network
    this.setupNetworkListeners()

    // Get room and create players
    const room = this.network.getRoom()
    if (room) {
      this.myPlayerId = room.sessionId

      room.state.players.forEach((player: any, key: string) => {
        if (!this.players.has(key)) {
          this.createPlayerEntity(key, player)
        }
      })
    }

    // Sync state every 50ms
    this.syncTimer = this.time.addEvent({
      delay: 50,
      callback: this.syncStateFromServer,
      callbackScope: this,
      loop: true
    })

    // Set up collision between local player and platforms
    this.time.delayedCall(100, () => {
      this.setupCollisions()
    })

    // Launch UI
    this.scene.launch('UIScene')

    // Create skill bar after scene is ready
    this.time.delayedCall(300, () => {
      this.createSkillBar()
    })

    // Start BGM
    this.time.delayedCall(500, () => {
      this.sfx.startBGM()
    })
  }

  private createClouds() {
    const cloudCount = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < cloudCount; i++) {
      const cloud = this.add.image(
        Math.random() * GAME_CONFIG.worldWidth,
        30 + Math.random() * 100,
        'fx_spark'
      ).setAlpha(0.3 + Math.random() * 0.3)
        .setScale(3 + Math.random() * 4)
        .setDepth(-8)
        .setTint(0xffffff)
      cloud.setData('speed', 3 + Math.random() * 5)
      cloud.setData('drift', Math.random() > 0.5 ? 1 : -1)
      this.cloudSprites.push(cloud)
    }
  }

  private createAmbientParticles() {
    // Floating dust particles
    this.dustEmitter = this.add.particles(0, 0, 'fx_dust', {
      x: { min: 0, max: GAME_CONFIG.worldWidth },
      y: { min: 300, max: 550 },
      speed: { min: 2, max: 8 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.15, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: { min: 3000, max: 6000 },
      quantity: 2,
      frequency: 500,
      tint: [0xcccccc, 0xddddbb],
      blendMode: 'ADD'
    }).setDepth(-3)

    // Leaf particles (fall every 3-5s)
    this.leafEmitter = this.add.particles(0, 0, 'fx_spark', {
      x: { min: 0, max: GAME_CONFIG.worldWidth },
      y: -10,
      speedX: { min: -15, max: 15 },
      speedY: { min: 20, max: 50 },
      scale: { start: 0.3, end: 0.1 },
      alpha: { start: 0.7, end: 0 },
      lifespan: { min: 4000, max: 8000 },
      quantity: 1,
      frequency: 3500,
      tint: [0x66bb6a, 0x81c784, 0xa5d6a7, 0xffcc02],
      rotate: { min: 0, max: 360 },
      gravityY: 20
    }).setDepth(5)
  }

  private createPlatforms() {
    this.platformGroup = this.physics.add.staticGroup()

    const addPlatform = (x: number, y: number, w: number, _h: number) => {
      const plat = this.platformGroup!.create(x, y, undefined)
      if (!plat) return
      plat.setVisible(false)
      const body = plat.body as Phaser.Physics.Arcade.StaticBody
      body.setSize(w, _h)
      body.setOffset(-w / 2, -_h / 2)
      body.updateFromGameObject()

      // Visual platform
      this.add.graphics()
        .fillStyle(0x5d4037, 1)
        .fillRect(x - w / 2, y - _h / 2, w, _h)
        .lineStyle(2, 0x4caf50, 0.8)
        .strokeRect(x - w / 2, y - _h / 2, w, _h)
        .setDepth(8)

      // Grass strip on top
      this.add.graphics()
        .fillStyle(0x66bb6a, 1)
        .fillRect(x - w / 2, y - _h / 2, w, 6)
        .setDepth(9)
    }

    // Main ground
    addPlatform(
      PLATFORMS.mainGround.x,
      PLATFORMS.mainGround.y,
      PLATFORMS.mainGround.width,
      PLATFORMS.mainGround.height
    )

    // Floating platforms
    addPlatform(
      PLATFORMS.left.x,
      PLATFORMS.left.y,
      PLATFORMS.left.width,
      PLATFORMS.left.height
    )
    addPlatform(
      PLATFORMS.center.x,
      PLATFORMS.center.y,
      PLATFORMS.center.width,
      PLATFORMS.center.height
    )
    addPlatform(
      PLATFORMS.right.x,
      PLATFORMS.right.y,
      PLATFORMS.right.width,
      PLATFORMS.right.height
    )
  }

  private updateCamera() {
    let targetX = GAME_CONFIG.width / 2
    let targetY = GAME_CONFIG.height / 2

    const alivePlayers: PlayerEntity[] = []
    this.players.forEach(p => { if (p.isAlive()) alivePlayers.push(p) })

    if (alivePlayers.length > 0) {
      const avgX = alivePlayers.reduce((sum, p) => sum + p.x, 0) / alivePlayers.length
      const avgY = alivePlayers.reduce((sum, p) => sum + p.y, 0) / alivePlayers.length
      targetX = Phaser.Math.Clamp(avgX, GAME_CONFIG.width / 2, GAME_CONFIG.worldWidth - GAME_CONFIG.width / 2)
      targetY = Phaser.Math.Clamp(avgY, GAME_CONFIG.height / 2, GAME_CONFIG.groundLevel)
    }

    this.cameraTargetX += (targetX - this.cameraTargetX) * 0.08
    this.cameraTargetY += (targetY - this.cameraTargetY) * 0.08

    const cam = this.cameras.main
    cam.scrollX = this.cameraTargetX - GAME_CONFIG.width / 2
    cam.scrollY = this.cameraTargetY - GAME_CONFIG.height / 2
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, GAME_CONFIG.worldWidth - GAME_CONFIG.width)
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, GAME_CONFIG.groundLevel - GAME_CONFIG.height)
  }

  private updateParallax() {
    const cam = this.cameras.main
    if (this.farBg) this.farBg.tilePositionX = cam.scrollX * 0.05
    if (this.midBg) this.midBg.tilePositionX = cam.scrollX * 0.2
    if (this.nearBg) this.nearBg.tilePositionX = cam.scrollX * 0.5
    if (this.groundTile) this.groundTile.tilePositionX = cam.scrollX
  }

  private updateClouds() {
    const cam = this.cameras.main
    this.cloudSprites.forEach(cloud => {
      const speed = cloud.getData('speed') as number
      const drift = cloud.getData('drift') as number
      cloud.x += speed * drift
      if (cloud.x < cam.scrollX - 200) cloud.x = cam.scrollX + GAME_CONFIG.width + 200
      if (cloud.x > cam.scrollX + GAME_CONFIG.width + 200) cloud.x = cam.scrollX - 200
    })
  }

  private updateWindParticles() {
  }

  private setupCollisions() {
    const room = this.network.getRoom()
    if (!room) return
    const myPlayer = this.players.get(room.sessionId)
    if (!myPlayer || !this.platformGroup) return
    this.physics.add.collider(myPlayer.sprite, this.platformGroup)
    const body = myPlayer.getBody()
    if (body) body.setGravityY(800)
  }

  private createSkillBar() {
    if (this.skillBarCreated) return

    const room = this.network.getRoom()
    if (!room) return
    const myPlayerId = room.sessionId
    if (!myPlayerId) return
    const myPlayerData = room.state.players.get(myPlayerId)
    if (!myPlayerData) return

    const charId = myPlayerData.characterId || 'warrior'
    const char = getCharacterById(charId)
    if (!char) return

    const skills = char.skills
    const { width, height } = this.cameras.main
    const barY = height - 85
    const iconSize = 50
    const spacing = 58
    const totalWidth = skills.length * spacing
    const startX = (width - totalWidth) / 2 + iconSize / 2

    this.selectedSkill = skills[0] || 'rock'

    this.add.text(width / 2, barY - 30, 'CHON DAN (phim 1-4):', {
      fontSize: '16px', color: '#ffeb3b',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0)

    const barColors: Record<string, number> = {
      rock: 0x9e9e9e, big_rock: 0x757575, bomb: 0xd32f2f, soap: 0x42a5f5,
      pillow: 0xfff176, fireball: 0xff5722, wind_blade: 0x80deea,
      shuriken: 0x78909c, hug_rush: 0x8d6e63, honey: 0xffc107,
      rock_rain: 0x9e9e9e, triple_rock: 0x9e9e9e
    }

    skills.forEach((skillId, index) => {
      const x = startX + index * spacing
      const skillData = SKILL_DATA[skillId]
      if (!skillData) return
      const color = barColors[skillId] || 0x666666

      const bg = this.add.rectangle(x, barY, iconSize, iconSize, color, 0.9)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true })
        .setDepth(200)
        .setScrollFactor(0)
      bg.setData('skillId', skillId)

      this.add.text(x, barY - 8, skillData.name.substring(0, 8), {
        fontSize: '12px', color: '#fff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(201).setScrollFactor(0)

      const dmg = skillData.damage > 0 ? `${skillData.damage}` : '--'
      this.add.text(x, barY + 11, dmg, {
        fontSize: '9px', color: '#ffccbc',
        stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(201).setScrollFactor(0)

      this.add.text(x, barY + iconSize / 2 - 12, `[${index + 1}]`, {
        fontSize: '12px', color: '#ffeb3b', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(201).setScrollFactor(0)

      bg.on('pointerdown', () => {
        this.selectedSkill = skillId
        this.highlightSkill()
        this.sfx.playClick()
      })

      this.skillBarRects.push(bg)
    })

    this.skillBarCreated = true
    this.highlightSkill()
    console.log('[GameScene] Skill bar created:', skills)
  }

  private highlightSkill() {
    this.skillBarRects.forEach(rect => {
      const isSelected = rect.getData('skillId') === this.selectedSkill
      rect.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0x00ff00 : 0xffffff)
    })
  }

  private syncStateFromServer() {
    const room = this.network.getRoom()
    if (!room || !room.state) return

    const state = room.state
    const prevPhase = this.phase
    this.phase = state.phase

    const playerIds = Array.from(state.players.keys())
    this.isMyTurn = playerIds[state.currentTurn] === this.myPlayerId

    const myData = state.players.get(this.myPlayerId)
    const serverEnergy = myData ? myData.energy : -1
    const energyBefore = this.localEnergy
    const willSync = state.turnNumber !== this.lastTurnNumber

    // Reset throw flag when turn changes (safety net in case turnStart event was missed)
    if (state.turnNumber !== this.lastTurnNumber) {
      this.lastTurnNumber = state.turnNumber
      this.hasThrownThisTurn = false
      // Sync energy from server state (state patch has already been applied - reliable)
      if (myData) {
        this.localEnergy = myData.energy || 0
      }
    }

    if (willSync || energyBefore !== this.localEnergy || prevPhase !== this.phase) {
      console.log(`[ENERGY-SYNC] turn=${state.turnNumber} lastTurn=${this.lastTurnNumber} phase=${this.phase} isMyTurn=${this.isMyTurn} serverEnergy=${serverEnergy} local=${energyBefore}->${this.localEnergy} sync=${willSync}`)
    }

    this.aimSystem.setWindForce(state.windForce || 0)

    state.players.forEach((player: any, key: string) => {
      let entity = this.players.get(key)
      if (!entity) {
        entity = this.createPlayerEntity(key, player)
      }
      if (key !== this.myPlayerId) {
        entity.updatePositionFromServer(player.x, player.y, player.animState, player.facingLeft)
      }
      entity.updateHPFromServer(player.hp, player.maxHp, player.isAlive)
      entity.updateStatusFromServer(player.statusEffect || '', player.statusDuration || 0)
    })

    state.projectiles.forEach((proj: any, projId: string) => {
      if (!this.projectileSystem.hasProjectile(projId)) {
        this.projectileSystem.createProjectile(projId, proj)
      }
    })
    this.projectileSystem.syncProjectiles(state.projectiles)
  }

  private createPlayerEntity(key: string, playerData: any): PlayerEntity {
    console.log(`[createPlayerEntity] key=${key}, charId=${playerData.characterId}, x=${playerData.x}, facingLeft=${playerData.facingLeft}`)
    const isLocal = key === this.myPlayerId
    const entity = new PlayerEntity(this, playerData, isLocal)
    this.players.set(key, entity)
    return entity
  }

  private setupKeyboardInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      t: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T),
      z: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      x: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      c: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      v: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.V)
    }

    const trackKey = (key: Phaser.Input.Keyboard.Key, direction: 'left' | 'right' | 'up') => {
      key.on('down', () => {
        this.moveState[direction] = true
      })
      key.on('up', () => {
        this.moveState[direction] = false
      })
    }

    trackKey(this.cursors!.left, 'left')
    trackKey(this.cursors!.right, 'right')
    trackKey(this.cursors!.up, 'up')
    trackKey(this.wasd!.left, 'left')
    trackKey(this.wasd!.right, 'right')
    trackKey(this.wasd!.up, 'up')

    this.wasd!.t.on('down', () => this.network.sendTaunt())

    const emojiMap: Record<string, string> = { z: '\u{1F602}', x: '\u{1F621}', c: '\u{1F44D}', v: '\u{1F480}' }
    this.wasd!.z.on('down', () => this.network.sendEmoji(emojiMap.z))
    this.wasd!.x.on('down', () => this.network.sendEmoji(emojiMap.x))
    this.wasd!.c.on('down', () => this.network.sendEmoji(emojiMap.c))
    this.wasd!.v.on('down', () => this.network.sendEmoji(emojiMap.v))

    // Skill selection: number keys 1-4
    this.skillKeys = [
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR)
    ]
    this.skillKeys.forEach((key, index) => {
      key.on('down', () => {
        const room = this.network.getRoom()
        if (!room) return
        const myPlayerData = room.state.players.get(room.sessionId)
        if (!myPlayerData) return
        const char = getCharacterById(myPlayerData.characterId || 'warrior')
        if (!char || index >= char.skills.length) return
        this.selectedSkill = char.skills[index]
        this.highlightSkill()
        this.sfx.playClick()
      })
    })

    // Mouse aiming
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isMyTurn || this.phase !== 'playing' || this.hasThrownThisTurn) return
      const myPlayer = this.players.get(this.myPlayerId)
      if (!myPlayer || !myPlayer.isAlive()) return
      const screenX = myPlayer.x - this.cameras.main.scrollX
      const screenY = myPlayer.y - this.cameras.main.scrollY
      this.aimSystem.startAim(myPlayer.x, myPlayer.y, screenX, screenY, myPlayer.flipX)
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.aimSystem.isAiming()) {
        this.aimSystem.updateAim(pointer.x, pointer.y)
      }
    })

    this.input.on('pointerup', () => {
      if (!this.isMyTurn || this.phase !== 'playing' || this.hasThrownThisTurn) return
      if (!this.aimSystem.isAiming()) return

      const myPlayer = this.players.get(this.myPlayerId)
      const { angle, power } = this.aimSystem.stopAim()
      if (power < 0.05) return

      this.hasThrownThisTurn = true
      console.log(`Throw: angle=${angle}, power=${power}, skill=${this.selectedSkill}, facingLeft=${myPlayer?.flipX}`)
      this.network.sendThrow(angle, power, this.selectedSkill)

      if (myPlayer) {
        myPlayer.playAnimation('throw')
      }
    })
  }

  private setupNetworkListeners() {
    this.network.on('playerJoin', ({ player, key }: any) => {
      if (!this.players.has(key)) {
        this.createPlayerEntity(key, player)
      }
    })

    this.network.on('playerLeave', ({ key }: any) => {
      const player = this.players.get(key)
      if (player) {
        player.destroy()
        this.players.delete(key)
      }
    })

    this.network.on('turnStart', (data: any) => {
      this.isMyTurn = data.playerId === this.myPlayerId
      this.hasThrownThisTurn = false
      if (this.isMyTurn) {
        this.showTurnIndicator('LƯỢT CỦA BẠN!')
        this.sfx.playTurnStart()
      } else {
        const myPlayer = this.players.get(this.myPlayerId)
        if (myPlayer) this.defendStartX = myPlayer.x
      }
    })

    this.network.on('throw', (data: any) => {
      const room = this.network.getRoom()
      if (!room) return
      const proj = room.state.projectiles.get(data.projectileId)
      if (proj && !this.projectileSystem.hasProjectile(data.projectileId)) {
        this.projectileSystem.createProjectile(data.projectileId, proj)
      }
      this.sfx.playThrow()
    })

    this.network.on('hit', (data: any) => {
      this.showDamageText(data.targetId, data.damage, data.isCritical)

      const isBomb = data.projectileType === 'bomb' || data.projectileType === 'bomb_aoe'
      if (isBomb) {
        this.sfx.playExplosion()
      } else if (data.isCritical) {
        this.sfx.playCritical()
      } else {
        this.sfx.playHit()
      }

      const intensity = isBomb ? 0.008 : data.isCritical ? 0.005 : 0.003
      const duration = isBomb ? 400 : data.isCritical ? 200 : 150
      this.cameras.main.shake(duration, intensity)

      if (data.isCritical) {
        this.showText('\u{26A1} CRITICAL!', 0xffeb3b)
        this.time.timeScale = 0.3
        this.time.delayedCall(300, () => { this.time.timeScale = 1.0 })
      }

      if (isBomb) {
        const flash = this.add.rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2,
          this.cameras.main.width, this.cameras.main.height, 0xffffff, 0.3).setDepth(999).setScrollFactor(0)
        this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() })
      }

      const victim = this.players.get(data.targetId)
      if (victim) {
        victim.playAnimation('hit')
        const dir = victim.flipX ? 1 : -1
        this.tweens.add({
          targets: victim.sprite, x: victim.sprite.x + dir * 30, duration: 100,
          yoyo: true, ease: 'Power2'
        })
        if (data.statusEffect) {
          victim.showStatusEffect(data.statusEffect)
          victim.updateStatusFromServer(data.statusEffect, 0)
        }
      }
    })

    this.network.on('combo', (data: any) => {
      this.sfx.playCombo(data.level || 2)
      if (data.level >= 3) {
        this.showText(`\u{1F525} COMBO x${data.level}!`, 0xff6600)
      } else {
        this.showText(`COMBO x${data.level}!`, 0xffff00)
      }
    })

    this.network.on('death', (data: any) => {
      this.cameras.main.shake(200, 0.005)
      this.sfx.playDeath()
      const victim = this.players.get(data.targetId)
      if (victim) victim.playAnimation('die')
    })

    this.network.on('timeout', (data: any) => {
      this.sfx.playTimeout()
      if (data.playerId === this.myPlayerId) {
        this.showText(data.isStunned ? 'BỊ CHOÁNG! NÉM TỰ ĐỘNG!' : 'HẾT GIỜ!', 0xff0000)
      }
      if (data.effect) {
        const player = this.players.get(data.playerId)
        if (player) player.showStatusEffect(data.effect)
      }
    })

    this.network.on('roundEnd', (data: any) => {
      this.time.delayedCall(3000, () => {
        this.scene.stop('UIScene')
        this.scene.start('ResultScene', data)
      })
    })

    this.network.on('gameEnd', (data: any) => {
      this.time.delayedCall(3000, () => {
        this.scene.stop('UIScene')
        this.scene.start('ResultScene', data)
      })
    })

    this.network.on('emoji', (data: any) => {
      this.sfx.playEmoji()
      const player = this.players.get(data.playerId)
      if (player) player.showEmoji(data.emoji)
    })

    this.network.on('taunt', (data: any) => {
      this.sfx.playTaunt()
      const player = this.players.get(data.playerId)
      if (player) player.playAnimation('taunt')
    })

    this.network.on('statusEffect', (data: any) => {
      const player = this.players.get(data.playerId)
      if (player) {
        player.showStatusEffect(data.effect)
        player.updateStatusFromServer(data.effect, data.duration || 5)
        if (data.playerId === this.myPlayerId) {
          const msg = data.effect === 'stunned' ? 'Bị choáng! Ném sau 5s...' : data.effect === 'sleeping' ? 'Bị ngủ! Ném sau 5s...' : ''
          if (msg) this.showText(msg, 0xff6600)
        }
      }
    })

    this.network.on('windChange', (data: any) => {
      this.aimSystem.setWindForce(data.force)
    })
  }

  private showTurnIndicator(text: string) {
    const textObj = this.add.text(this.cameras.main.width / 2, 100, text, {
      fontSize: '48px', color: '#fff', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0)

    this.tweens.add({
      targets: textObj, alpha: 0, y: 80, duration: 1500,
      onComplete: () => textObj.destroy()
    })
  }

  private showDamageText(playerId: string, damage: number, isCritical: boolean) {
    const player = this.players.get(playerId)
    if (!player) return

    const text = this.add.text(player.x, player.y - 80, `-${damage}`, {
      fontSize: isCritical ? '36px' : '28px',
      color: isCritical ? '#ffeb3b' : '#ff3333',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5)

    this.tweens.add({
      targets: text, y: text.y - 80, alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 1200, ease: 'Power2', onComplete: () => text.destroy()
    })
  }

  private showText(text: string, color: number = 0xffffff) {
    const textObj = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, text, {
      fontSize: '64px', color: `#${color.toString(16).padStart(6, '0')}`, stroke: '#000', strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0)

    this.tweens.add({
      targets: textObj, alpha: 0, duration: 2000, onComplete: () => textObj.destroy()
    })
  }

  update(_time: number, delta: number) {
    this.handleMovement()
    this.players.forEach(player => player.update(_time, delta))
    this.projectileSystem.update()
    this.updateCamera()
    this.updateParallax()
    this.updateClouds()
    this.updateWindParticles()
    this.updateEnergyDisplay()
  }

  private handleMovement() {
    const myPlayer = this.players.get(this.myPlayerId)
    if (!myPlayer || !myPlayer.isAlive()) return

    const body = myPlayer.getBody()
    if (!body) return

    // Check status effects
    const status = myPlayer.getStatusEffect()
    const isStunned = status === 'stunned' || status === 'sleeping'

    // Stunned/sleeping players can't move
    if (isStunned) {
      body.setVelocityX(0)
      this.network.sendMove(myPlayer.x, myPlayer.y, 0, body.velocity.y, myPlayer.flipX, 'idle')
      return
    }

    const baseSpeed = 180
    const speed = status === 'slowed' ? baseSpeed * 0.5 : baseSpeed
    let vx = 0

    if (!this.isMyTurn && this.phase === 'playing' && this.localEnergy > 0) {
      if (this.moveState.up && body.onFloor()) {
        body.setVelocityY(-900)
      }
      if (this.moveState.left && myPlayer.x > this.defendStartX - this.defendRange) {
        vx = -speed
      } else if (this.moveState.right && myPlayer.x < this.defendStartX + this.defendRange) {
        vx = speed
      }
    }

    if (vx !== 0) {
      myPlayer.flipX = vx < 0
    }

    body.setVelocityX(vx)

    this.network.sendMove(myPlayer.x, myPlayer.y, body.velocity.x, body.velocity.y, myPlayer.flipX, vx !== 0 ? 'run' : 'idle')
  }

  private updateEnergyDisplay() {
    if (!this.energyText) {
      this.energyText = this.add.text(this.cameras.main.width / 2, 140, '', {
        fontSize: '22px', color: '#ffeb3b', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(300).setScrollFactor(0)
    }

    if (!this.isMyTurn && this.phase === 'playing') {
      const totalEnergy = this.localEnergy
      const pips = '●'.repeat(totalEnergy) + '○'.repeat(Math.max(0, 4 - totalEnergy))
      this.energyText.setText(`LƯỢT NÉ: ${pips} (${totalEnergy})`)
      this.energyText.setVisible(true)
    } else {
      this.energyText.setVisible(false)
    }
  }

  private destroyEnergyDisplay() {
    if (this.energyText) {
      this.energyText.destroy()
      this.energyText = undefined
    }
  }
}
