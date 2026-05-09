import Phaser from 'phaser'
import { PlayerState } from '@nem-da/shared/types'

export default class PlayerEntity {
  public sprite: Phaser.Physics.Arcade.Sprite
  public hpBarGreen: Phaser.GameObjects.Graphics
  public hpBarYellow: Phaser.GameObjects.Graphics
  private playerState: PlayerState
  private targetX: number
  private targetY: number
  private debugRect: Phaser.GameObjects.Rectangle
  private yellowTargetPercent: number
  private statusText?: Phaser.GameObjects.Text
  private idleTween?: Phaser.Tweens.Tween
  private breathTime: number = 0
  private wasOnFloor: boolean = true

  constructor(scene: Phaser.Scene, state: PlayerState, isLocal: boolean = false) {
    this.playerState = state
    this.targetX = state.x
    this.targetY = state.y
    this.yellowTargetPercent = state.hp / state.maxHp

    this.sprite = scene.physics.add.sprite(state.x, state.y, state.characterId || 'warrior')
    this.sprite.setScale(2)
    this.sprite.setDepth(50)

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(36, 64)
    body.setOffset(14, 8)
    body.setCollideWorldBounds(true)
    body.setBounce(0.2)

    // Only local player needs gravity - enemy positions are interpolated from server
    if (!isLocal) {
      body.setAllowGravity(false)
    }

    this.hpBarGreen = scene.add.graphics().setDepth(100)
    this.hpBarYellow = scene.add.graphics().setDepth(99)

    this.debugRect = scene.add.rectangle(state.x, state.y, 64, 80, 0xff0000, 0.3).setDepth(49)

    const initialFacingLeft = (state.x || 0) > 640
    this.sprite.setFlipX(initialFacingLeft)
    this.playerState.facingLeft = initialFacingLeft

    this.updateHPBar()
  }

  update(time: number, delta: number) {
    this.sprite.x += (this.targetX - this.sprite.x) * 0.15
    this.sprite.y += (this.targetY - this.sprite.y) * 0.15

    this.targetX = this.playerState.x
    this.targetY = this.playerState.y

    // Idle breathing animation (subtle scale oscillation)
    this.breathTime += delta * 0.003
    if (this.playerState.animState === 'idle' || !this.playerState.animState) {
      const breathe = 1 + Math.sin(this.breathTime) * 0.015
      this.sprite.setScale(2 * breathe, 2 / breathe)
    }

    // Landing squash detection
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    if (body) {
      if (body.onFloor() && !this.wasOnFloor) {
        this.playLandingSquash()
      }
      this.wasOnFloor = body.onFloor()
    }

    this.updateHPBar()
    this.debugRect.setPosition(this.sprite.x, this.sprite.y)

    if (this.statusText) {
      this.statusText.setPosition(this.sprite.x, this.sprite.y - 100)
    }
  }

  private playLandingSquash() {
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      scaleX: 2.6, scaleY: 1.4,
      duration: 80,
      yoyo: true,
      ease: 'Power2'
    })
  }

  updatePositionFromServer(x: number, y: number, _animState: string, facingLeft: boolean) {
    this.targetX = x
    this.targetY = y
    this.playerState.facingLeft = facingLeft
    this.sprite.setFlipX(facingLeft)
  }

  updateHPFromServer(hp: number, maxHp: number, isAlive: boolean) {
    const oldHp = this.playerState.hp
    this.playerState.hp = hp
    this.playerState.maxHp = maxHp
    this.playerState.isAlive = isAlive
    this.sprite.setAlpha(isAlive ? 1 : 0.3)

    // Afterburn: yellow bar catches up slowly
    if (hp < oldHp) {
      this.yellowTargetPercent = hp / maxHp
      const scene = this.sprite.scene
      scene.tweens.add({
        targets: this,
        yellowTargetPercent: hp / maxHp,
        duration: 600,
        ease: 'Power2',
        onUpdate: () => this.updateHPBar()
      })
    }
  }

  showStatusEffect(effect: string) {
    if (this.statusText) {
      this.statusText.destroy()
    }
    const labels: Record<string, string> = {
      stunned: '😵 Choáng!',
      sleeping: '😴 Ngủ!',
      slowed: '🐢 Chậm!'
    }
    this.statusText = this.sprite.scene.add.text(
      this.sprite.x, this.sprite.y - 100,
      labels[effect] || effect,
      { fontSize: '20px', color: '#ffff00', stroke: '#000', strokeThickness: 3 }
    ).setOrigin(0.5).setDepth(101)

    this.sprite.scene.time.delayedCall(3000, () => {
      if (this.statusText) {
        this.statusText.destroy()
        this.statusText = undefined
      }
    })
  }

  playAnimation(animName: string) {
    const scene = this.sprite.scene

    if (animName === 'hit') {
      // Squash on hit: stretch horizontally, squish vertically
      scene.tweens.add({ targets: this.sprite, alpha: 0.4, duration: 40, yoyo: true, repeat: 2 })
      scene.tweens.add({
        targets: this.sprite,
        scaleX: 2.8, scaleY: 1.2,
        duration: 80,
        yoyo: true,
        ease: 'Back.easeOut'
      })
    } else if (animName === 'die') {
      // Dramatic death: squish then sink
      scene.tweens.add({
        targets: this.sprite,
        scaleX: 3, scaleY: 0.5,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          scene.tweens.add({
            targets: this.sprite, alpha: 0, y: this.sprite.y + 100, duration: 700, ease: 'Power2'
          })
        }
      })
    } else if (animName === 'throw') {
      // Windup squash → release stretch
      scene.tweens.add({
        targets: this.sprite,
        scaleX: 2.4, scaleY: 1.6,
        duration: 60,
        ease: 'Power1',
        onComplete: () => {
          scene.tweens.add({
            targets: this.sprite,
            scaleX: 1.8, scaleY: 2.2,
            duration: 100,
            ease: 'Power2',
            onComplete: () => {
              scene.tweens.add({
                targets: this.sprite,
                scaleX: 2, scaleY: 2,
                duration: 150,
                ease: 'Bounce.easeOut'
              })
            }
          })
        }
      })
    } else if (animName === 'taunt') {
      // Bouncy taunt
      scene.tweens.add({
        targets: this.sprite, y: this.sprite.y - 25, duration: 150,
        yoyo: true, repeat: 3, ease: 'Bounce'
      })
      scene.tweens.add({
        targets: this.sprite,
        scaleX: 2.2, scaleY: 1.8,
        duration: 100, yoyo: true, repeat: 3,
        ease: 'Sine.easeInOut'
      })
    } else if (animName === 'jump') {
      // Squish before jump
      scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.6, scaleY: 2.4,
        duration: 60,
        yoyo: true,
        ease: 'Power2'
      })
    } else {
      scene.tweens.add({
        targets: this.sprite, alpha: 0.5, duration: 50, yoyo: true,
        repeat: animName === 'hit' ? 2 : 0
      })
    }
  }

  showEmoji(emoji: string) {
    const emojiText = this.sprite.scene.add.text(this.sprite.x, this.sprite.y - 80, emoji, {
      fontSize: '32px', color: '#fff', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(101)

    this.sprite.scene.tweens.add({
      targets: emojiText, y: this.sprite.y - 120, alpha: 0, duration: 2000,
      onComplete: () => emojiText.destroy()
    })
  }

  isAlive(): boolean { return this.playerState.isAlive }

  getBody(): Phaser.Physics.Arcade.Body | null {
    return this.sprite.body as Phaser.Physics.Arcade.Body | null
  }

  get x(): number { return this.sprite.x }
  get y(): number { return this.sprite.y }
  get flipX(): boolean { return this.sprite.flipX }
  set flipX(v: boolean) { this.sprite.flipX = v }

  private updateHPBar() {
    const hpPercent = this.playerState.hp / this.playerState.maxHp
    const yellowPercent = this.yellowTargetPercent
    const barW = 60
    const barX = this.sprite.x - 30
    const barY = this.sprite.y - 70

    // Background
    this.hpBarGreen.clear()
    this.hpBarGreen.fillStyle(0x000000, 0.7)
    this.hpBarGreen.fillRect(barX, barY, barW, 8)

    // HP bar color
    const color = hpPercent > 0.6 ? 0x22dd22 : hpPercent > 0.3 ? 0xffaa00 : 0xff2222
    this.hpBarGreen.fillStyle(color, 1)
    this.hpBarGreen.fillRect(barX, barY, barW * hpPercent, 8)

    // Afterburn yellow bar
    this.hpBarYellow.clear()
    if (yellowPercent > hpPercent) {
      this.hpBarYellow.fillStyle(0xffaa00, 0.5)
      this.hpBarYellow.fillRect(barX + barW * hpPercent, barY, barW * (yellowPercent - hpPercent), 8)
    }
  }

  getPlayerState(): PlayerState { return this.playerState }

  destroy() {
    this.sprite.destroy()
    this.hpBarGreen.destroy()
    this.hpBarYellow.destroy()
    this.debugRect.destroy()
    if (this.statusText) this.statusText.destroy()
  }
}
