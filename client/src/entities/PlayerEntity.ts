import Phaser from 'phaser'
import { PlayerState } from '/home/lap16851/dev/myopencode/game-nem-da/shared/src/types'

export default class PlayerEntity {
  public sprite: Phaser.Physics.Arcade.Sprite
  public hpBarGreen: Phaser.GameObjects.Graphics
  public hpBarYellow: Phaser.GameObjects.Graphics
  private playerState: PlayerState
  private targetX: number
  private targetY: number
  private debugRect: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, state: PlayerState) {
    this.playerState = state
    this.targetX = state.x
    this.targetY = state.y

    // Create via physics factory to get proper body
    this.sprite = scene.physics.add.sprite(state.x, state.y, state.characterId || 'warrior')
    this.sprite.setScale(2)
    this.sprite.setDepth(50)

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(36, 64)
    body.setOffset(14, 8)
    body.setCollideWorldBounds(true)
    body.setBounce(0.2)

    this.hpBarGreen = scene.add.graphics().setDepth(100)
    this.hpBarYellow = scene.add.graphics().setDepth(99)

    this.debugRect = scene.add.rectangle(state.x, state.y, 64, 80, 0xff0000, 0.3).setDepth(49)

    // P2 spawns on right, faces left. P1 spawns on left, faces right
    // Determine initial facing: players on right side face left, players on left face right
    const initialFacingLeft = (state.x || 0) > 640
    this.sprite.setFlipX(initialFacingLeft)
    this.playerState.facingLeft = initialFacingLeft
    console.log(`[PlayerEntity] Created "${state.characterId}" at x=${state.x}, flipX=${this.sprite.flipX}`)

    this.updateHPBar()
  }

  update(time: number, delta: number) {
    this.sprite.x += (this.targetX - this.sprite.x) * 0.15
    this.sprite.y += (this.targetY - this.sprite.y) * 0.15

    this.targetX = this.playerState.x
    this.targetY = this.playerState.y

    this.updateHPBar()
    this.debugRect.setPosition(this.sprite.x, this.sprite.y)
  }

  updatePositionFromServer(x: number, y: number, _animState: string, facingLeft: boolean) {
    this.targetX = x
    this.targetY = y
    this.playerState.facingLeft = facingLeft
    this.sprite.setFlipX(facingLeft)
  }

  updateHPFromServer(hp: number, maxHp: number, isAlive: boolean) {
    this.playerState.hp = hp
    this.playerState.maxHp = maxHp
    this.playerState.isAlive = isAlive
    this.sprite.setAlpha(isAlive ? 1 : 0.3)
  }

  playAnimation(animName: string) {
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.5,
      duration: 50,
      yoyo: true,
      repeat: animName === 'hit' ? 2 : 0
    })
  }

  showEmoji(emoji: string) {
    const emojiText = this.sprite.scene.add.text(this.sprite.x, this.sprite.y - 80, emoji, {
      fontSize: '32px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(101)

    this.sprite.scene.tweens.add({
      targets: emojiText,
      y: this.sprite.y - 120,
      alpha: 0,
      duration: 2000,
      onComplete: () => emojiText.destroy()
    })
  }

  isAlive(): boolean {
    return this.playerState.isAlive
  }

  getBody(): Phaser.Physics.Arcade.Body | null {
    return this.sprite.body as Phaser.Physics.Arcade.Body | null
  }

  get x(): number { return this.sprite.x }
  get y(): number { return this.sprite.y }
  get flipX(): boolean { return this.sprite.flipX }
  set flipX(v: boolean) { this.sprite.flipX = v }

  private updateHPBar() {
    const hpPercent = this.playerState.hp / this.playerState.maxHp

    this.hpBarGreen.clear()
    this.hpBarGreen.fillStyle(0x000000, 0.7)
    this.hpBarGreen.fillRect(this.sprite.x - 30, this.sprite.y - 70, 60, 8)
    this.hpBarGreen.fillStyle(0x22dd22, 1)
    this.hpBarGreen.fillRect(this.sprite.x - 30, this.sprite.y - 70, 60 * hpPercent, 8)

    this.hpBarYellow.clear()
    this.hpBarYellow.fillStyle(0xffaa00, 0.5)
    this.hpBarYellow.fillRect(this.sprite.x - 30, this.sprite.y - 70, 60 * hpPercent, 8)
  }

  getPlayerState(): PlayerState {
    return this.playerState
  }

  destroy() {
    this.sprite.destroy()
    this.hpBarGreen.destroy()
    this.hpBarYellow.destroy()
    this.debugRect.destroy()
  }
}
