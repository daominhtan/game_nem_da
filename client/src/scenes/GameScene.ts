import Phaser from 'phaser'
import NetworkManager from '../network/NetworkManager'
import PlayerEntity from '../entities/PlayerEntity'
import AimSystem from '../systems/AimSystem'
import ProjectileSystem from '../systems/ProjectileSystem'
import { GAME_CONFIG, SKILL_DATA } from '@nem-da/shared/constants'
import { getCharacterById } from '../config/characters'

export default class GameScene extends Phaser.Scene {
  private network: NetworkManager
  private players: Map<string, PlayerEntity>
  private aimSystem: AimSystem
  private projectileSystem: ProjectileSystem
  private myPlayerId: string = ''
  private isMyTurn: boolean = false
  private phase: string = 'waiting'
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>
  private moveState: { left: boolean; right: boolean; up: boolean } = { left: false, right: false, up: false }
  private skillKeys?: Phaser.Input.Keyboard.Key[]
  private syncTimer?: Phaser.Time.TimerEvent
  private selectedSkill: string = 'rock'
  private skillBarRects: Phaser.GameObjects.Rectangle[] = []
  private skillBarCreated: boolean = false

  constructor() {
    super('GameScene')
    this.network = NetworkManager.getInstance()
    this.players = new Map()
    this.aimSystem = new AimSystem(this)
    this.projectileSystem = new ProjectileSystem(this)
  }

  create() {
    const { width, height } = this.cameras.main

    // Background
    this.add.image(width / 2, 360, 'bg_game')

    // Ground visual (tileSprite for display only)
    this.add.tileSprite(width / 2, GAME_CONFIG.groundLevel + 100, width, 200, 'ground').setDepth(10)

    // Set world bounds so players can't fall below ground
    this.physics.world.setBounds(0, 0, width, GAME_CONFIG.groundLevel)

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

    // Launch UI
    this.scene.launch('UIScene')

    // Create skill bar after scene is ready
    this.time.delayedCall(300, () => {
      this.createSkillBar()
    })
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

    // Title
    this.add.text(width / 2, barY - 30, 'CHON DAN (phim 1-4):', {
      fontSize: '16px', color: '#ffeb3b',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(200)

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
      bg.setData('skillId', skillId)

      this.add.text(x, barY - 8, skillData.name.substring(0, 8), {
        fontSize: '12px', color: '#fff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(201)

      const dmg = skillData.damage > 0 ? `${skillData.damage}` : '--'
      this.add.text(x, barY + 11, dmg, {
        fontSize: '9px', color: '#ffccbc',
        stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(201)

      this.add.text(x, barY + iconSize / 2 - 12, `[${index + 1}]`, {
        fontSize: '12px', color: '#ffeb3b', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(201)

      bg.on('pointerdown', () => {
        this.selectedSkill = skillId
        this.highlightSkill()
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
    this.phase = state.phase

    const playerIds = Array.from(state.players.keys())
    this.isMyTurn = playerIds[state.currentTurn] === this.myPlayerId

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
      key.on('down', () => { this.moveState[direction] = true })
      key.on('up', () => { this.moveState[direction] = false })
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
      })
    })

    // Mouse aiming
    this.input.on('pointerdown', () => {
      if (!this.isMyTurn || this.phase !== 'playing') return
      const myPlayer = this.players.get(this.myPlayerId)
      if (!myPlayer || !myPlayer.isAlive()) return
      this.aimSystem.startAim(myPlayer.x, myPlayer.y, myPlayer.flipX)
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.aimSystem.isAiming()) {
        this.aimSystem.updateAim(pointer.x, pointer.y)
      }
    })

    this.input.on('pointerup', () => {
      if (!this.isMyTurn || this.phase !== 'playing') return
      if (!this.aimSystem.isAiming()) return

      const myPlayer = this.players.get(this.myPlayerId)
      const { angle, power } = this.aimSystem.stopAim()
      if (power < 0.05) return

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
      if (this.isMyTurn) {
        this.showTurnIndicator('LƯỢT CỦA BẠN!')
      }
    })

    this.network.on('throw', (data: any) => {
      const room = this.network.getRoom()
      if (!room) return
      const proj = room.state.projectiles.get(data.projectileId)
      if (proj && !this.projectileSystem.hasProjectile(data.projectileId)) {
        this.projectileSystem.createProjectile(data.projectileId, proj)
      }
    })

    this.network.on('hit', (data: any) => {
      this.showDamageText(data.targetId, data.damage, data.isCritical)

      const intensity = data.projectileType === 'bomb' || data.projectileType === 'bomb_aoe' ? 0.008 : data.isCritical ? 0.005 : 0.003
      const duration = data.projectileType === 'bomb' || data.projectileType === 'bomb_aoe' ? 400 : data.isCritical ? 200 : 150
      this.cameras.main.shake(duration, intensity)

      if (data.isCritical) {
        this.showText('\u{26A1} CRITICAL!', 0xffeb3b)
        this.time.timeScale = 0.3
        this.time.delayedCall(300, () => { this.time.timeScale = 1.0 })
      }

      if (data.projectileType === 'bomb' || data.projectileType === 'bomb_aoe') {
        const flash = this.add.rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2,
          this.cameras.main.width, this.cameras.main.height, 0xffffff, 0.3).setDepth(999)
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
        }
      }
    })

    this.network.on('combo', (data: any) => {
      if (data.level >= 3) {
        this.showText(`\u{1F525} COMBO x${data.level}!`, 0xff6600)
      } else {
        this.showText(`COMBO x${data.level}!`, 0xffff00)
      }
    })

    this.network.on('death', (data: any) => {
      this.cameras.main.shake(200, 0.005)
      const victim = this.players.get(data.targetId)
      if (victim) victim.playAnimation('die')
    })

    this.network.on('timeout', (data: any) => {
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
      const player = this.players.get(data.playerId)
      if (player) player.showEmoji(data.emoji)
    })

    this.network.on('taunt', (data: any) => {
      const player = this.players.get(data.playerId)
      if (player) player.playAnimation('taunt')
    })

    this.network.on('statusEffect', (data: any) => {
      const player = this.players.get(data.playerId)
      if (player) {
        player.showStatusEffect(data.effect)
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
    }).setOrigin(0.5)

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
    }).setOrigin(0.5)

    this.tweens.add({
      targets: textObj, alpha: 0, duration: 2000, onComplete: () => textObj.destroy()
    })
  }

  update(_time: number, delta: number) {
    this.handleMovement()
    this.players.forEach(player => player.update(_time, delta))
    this.projectileSystem.update()
  }

  private handleMovement() {
    const myPlayer = this.players.get(this.myPlayerId)
    if (!myPlayer || !myPlayer.isAlive()) return

    const body = myPlayer.getBody()
    if (!body) return

    const speed = 180
    let vx = 0

    if (this.moveState.left) vx = -speed
    if (this.moveState.right) vx = speed

    if (vx !== 0) {
      myPlayer.flipX = vx < 0
    }

    body.setVelocityX(vx)

    if ((this.cursors!.up.isDown || this.wasd!.up.isDown) && body.onFloor()) {
      body.setVelocityY(-400)
    }

    this.network.sendMove(myPlayer.x, myPlayer.y, body.velocity.x, body.velocity.y, myPlayer.flipX, vx !== 0 ? 'run' : 'idle')
  }
}
