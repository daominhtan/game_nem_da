import Phaser from 'phaser'
import NetworkManager from '../network/NetworkManager'
import PlayerEntity from '../entities/PlayerEntity'
import AimSystem from '../systems/AimSystem'
import ProjectileSystem from '../systems/ProjectileSystem'
import { GAME_CONFIG } from '/home/lap16851/dev/myopencode/game-nem-da/shared/src/constants'

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
  private selectedSkill: string = 'rock'
  private ground?: Phaser.GameObjects.TileSprite
  private syncTimer?: Phaser.Time.TimerEvent

  constructor() {
    super('GameScene')
    this.network = NetworkManager.getInstance()
    this.players = new Map()
    this.aimSystem = new AimSystem(this)
    this.projectileSystem = new ProjectileSystem(this)
  }

  create() {
    const { width } = this.cameras.main

    // Background
    this.add.image(width / 2, 360, 'bg_game')

    // Ground with collision
    this.ground = this.add.tileSprite(width / 2, GAME_CONFIG.groundLevel + 60, width, 120, 'ground')
    this.physics.add.existing(this.ground, true)

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
  }

  private syncStateFromServer() {
    const room = this.network.getRoom()
    if (!room || !room.state) return

    const state = room.state
    this.phase = state.phase

    // Update turn
    const playerIds = Array.from(state.players.keys())
    this.isMyTurn = playerIds[state.currentTurn] === this.myPlayerId

    // Sync player positions
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

    // Sync projectiles
    state.projectiles.forEach((proj: any, projId: string) => {
      if (!this.projectileSystem.hasProjectile(projId)) {
        this.projectileSystem.createProjectile(projId, proj)
      }
    })
  }

  private createPlayerEntity(key: string, playerData: any): PlayerEntity {
    console.log(`[createPlayerEntity] key=${key}, charId=${playerData.characterId}, x=${playerData.x}, facingLeft=${playerData.facingLeft}`)
    const entity = new PlayerEntity(this, playerData)

    if (this.ground) {
      this.physics.add.collider(entity.sprite, this.ground)
    }

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
      z: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
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
    this.wasd!.z.on('down', () => this.network.sendEmoji('😂'))

    // Mouse aiming
    this.input.on('pointerdown', () => {
      if (!this.isMyTurn || this.phase !== 'playing') return
      const myPlayer = this.players.get(this.myPlayerId)
      if (!myPlayer || !myPlayer.isAlive()) return

      console.log(`Start aim: flipX=${myPlayer.flipX}, x=${myPlayer.x}`)
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

      console.log(`Throw: angle=${angle}, power=${power}, facingLeft=${myPlayer?.flipX}`)
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
      this.cameras.main.shake(150, 0.003)
      const victim = this.players.get(data.targetId)
      if (victim) victim.playAnimation('hit')
    })

    this.network.on('death', (data: any) => {
      this.cameras.main.shake(200, 0.005)
      const victim = this.players.get(data.targetId)
      if (victim) victim.playAnimation('die')
    })

    this.network.on('timeout', (data: any) => {
      if (data.playerId === this.myPlayerId) {
        this.showText('HẾT GIỜ!', 0xff0000)
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

    // Update flipX based on movement direction
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
