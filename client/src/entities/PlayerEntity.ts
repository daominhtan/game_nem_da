import Phaser from 'phaser'
import { PlayerState } from '@nem-da/shared/types'

export default class PlayerEntity {
  public sprite: Phaser.Physics.Arcade.Sprite
  public hpBarGreen: Phaser.GameObjects.Graphics
  public hpBarYellow: Phaser.GameObjects.Graphics
  public nameText: Phaser.GameObjects.Text
  public hpValueText: Phaser.GameObjects.Text
  private playerState: PlayerState
  private targetX: number
  private targetY: number
  private debugRect: Phaser.GameObjects.Rectangle
  private yellowTargetPercent: number
  private statusText?: Phaser.GameObjects.Text
  private statusTimerText?: Phaser.GameObjects.Text
  private wasOnFloor: boolean = true
  private statusEffect: string = ''
  private statusEffectDuration: number = 0
  private statusTimer?: Phaser.Time.TimerEvent
  private statusParticles?: Phaser.GameObjects.Particles.ParticleEmitter
  private shieldGraphic?: Phaser.GameObjects.Graphics
  private zzzTexts: Phaser.GameObjects.Text[] = []
  private zzzTimer?: Phaser.Time.TimerEvent
  private stunAngle: number = 0
  private _isCrouching: boolean = false
  private crouchTween?: Phaser.Tweens.Tween
  private crouchIndicator?: Phaser.GameObjects.Text
  private crouchTimer?: Phaser.Time.TimerEvent
  private readonly CROUCH_DURATION = 3000
  private lastAnim: string = ''
  private texKey: string

  constructor(scene: Phaser.Scene, state: PlayerState, isLocal: boolean = false) {
    this.playerState = state
    this.targetX = state.x
    this.targetY = state.y
    this.yellowTargetPercent = state.hp / state.maxHp
    this.texKey = 'char_' + (state.characterId || 'warrior')

    this.sprite = scene.physics.add.sprite(state.x, state.y, this.texKey)
    this.sprite.setScale(2)
    this.sprite.setDepth(50)

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(36, 64)
    body.setOffset(14, 8)
    body.setCollideWorldBounds(true)
    body.setBounce(0.2)

    if (!isLocal) {
      body.setAllowGravity(false)
    }

    this.hpBarGreen = scene.add.graphics().setDepth(100)
    this.hpBarYellow = scene.add.graphics().setDepth(99)

    this.debugRect = scene.add.rectangle(state.x, state.y, 64, 80, 0xff0000, 0.3).setDepth(49)

    this.nameText = scene.add.text(state.x, state.y - 85, state.name || '', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(101)

    this.hpValueText = scene.add.text(state.x, state.y - 62, ``, {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(101)

    const initialFacingLeft = (state.x || 0) > 1280
    this.sprite.setFlipX(initialFacingLeft)
    this.playerState.facingLeft = initialFacingLeft

    this.playAnimation('idle')
    this.updateHPBar()
  }

  update(time: number, delta: number) {
    this.sprite.x += (this.targetX - this.sprite.x) * 0.15
    this.sprite.y += (this.targetY - this.sprite.y) * 0.15

    this.targetX = this.playerState.x
    this.targetY = this.playerState.y

    if (this.statusText) {
      this.statusText.setPosition(this.sprite.x, this.sprite.y - 110)
    }
    if (this.statusTimerText) {
      this.statusTimerText.setPosition(this.sprite.x, this.sprite.y - 90)
    }

    this.nameText.setPosition(this.sprite.x, this.sprite.y - 85)
    this.nameText.setText(this.playerState.name || '')
    this.hpValueText.setPosition(this.sprite.x, this.sprite.y - 62)
    this.hpValueText.setText(`${this.playerState.hp}/${this.playerState.maxHp}`)

    if (this._isCrouching) {
      this.sprite.y += 18
    }

    if (this.crouchIndicator) {
      this.crouchIndicator.setPosition(this.sprite.x, this.sprite.y - 95)
    }

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    if (body) {
      if (body.onFloor() && !this.wasOnFloor) {
        this.playLandingSquash()
      }
      this.wasOnFloor = body.onFloor()
    }

    this.updateHPBar()
    this.debugRect.setPosition(this.sprite.x, this.sprite.y)

    if (this.statusEffect === 'stunned') {
      this.stunAngle += delta * 0.008
      this.sprite.x += Math.sin(time * 0.008) * 2.5
      this.sprite.rotation = Math.sin(this.stunAngle * 3) * 0.15
      this.sprite.y -= 1
      if (this.sprite.y < this.targetY - 5) this.sprite.y += 2
    } else {
      this.sprite.rotation = 0
    }

    if (this.statusEffect === 'sleeping') {
      this.sprite.y += Math.sin(time * 0.003) * 0.3
    }

    const targetAnim = this.playerState.animState || 'idle'
    if (targetAnim !== this.lastAnim) {
      this.playAnimation(targetAnim)
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

  updateStatusFromServer(effect: string, duration: number) {
    this.clearStatusEffects()
    this.statusEffect = effect
    this.statusEffectDuration = duration
    this.sprite.clearTint()
    this.sprite.rotation = 0

    if (!effect) return

    const scene = this.sprite.scene

    switch (effect) {
      case 'stunned':
        this.sprite.setTint(0xffff44)
        this.startStunParticles()
        break
      case 'sleeping':
        this.sprite.setTint(0xcc88ff)
        this.startZZZ()
        break
      case 'slowed':
        this.sprite.setTint(0x88ccff)
        this.startSlowParticles()
        break
      case 'wind_shield':
        this.drawShield()
        break
      case 'shield_break':
        this.flashShieldBreak()
        return
    }

    // Auto-clear after duration
    if (duration > 0) {
      this.statusTimer = scene.time.addEvent({
        delay: 200,
        repeat: Math.floor(duration * 5) - 1,
        callback: () => {
          const remaining = this.statusTimer!.getRepeatCount() * 0.2
          this.updateStatusTimerDisplay(Math.ceil(remaining))
          if (remaining <= 0) this.updateStatusFromServer('', 0)
        }
      })
    }
  }

  private clearStatusEffects() {
    if (this.statusParticles) {
      this.statusParticles.destroy()
      this.statusParticles = undefined
    }
    if (this.shieldGraphic) {
      this.shieldGraphic.destroy()
      this.shieldGraphic = undefined
    }
    if (this.statusTimer) {
      this.statusTimer.destroy()
      this.statusTimer = undefined
    }
    if (this.statusTimerText) {
      this.statusTimerText.destroy()
      this.statusTimerText = undefined
    }
    this.zzzTexts.forEach(t => t.destroy())
    this.zzzTexts = []
    if (this.zzzTimer) {
      this.zzzTimer.destroy()
      this.zzzTimer = undefined
    }
  }

  private updateStatusTimerDisplay(seconds: number) {
    const scene = this.sprite.scene
    if (seconds <= 0) {
      if (this.statusTimerText) {
        this.statusTimerText.destroy()
        this.statusTimerText = undefined
      }
      return
    }
    if (!this.statusTimerText) {
      this.statusTimerText = scene.add.text(this.sprite.x, this.sprite.y - 90, '', {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(101)
    }
    this.statusTimerText.setText(`${seconds}s`)
  }

  private startStunParticles() {
    const scene = this.sprite.scene
    this.statusParticles = scene.add.particles(0, 0, 'fx_spark', {
      follow: this.sprite,
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 400,
      quantity: 1,
      frequency: 100,
      tint: [0xffff00, 0xffaa00]
    })
    this.statusParticles.setDepth(51)
  }

  private startSlowParticles() {
    const scene = this.sprite.scene
    this.statusParticles = scene.add.particles(0, 0, 'fx_spark', {
      follow: this.sprite,
      speed: { min: 8, max: 25 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 500,
      quantity: 1,
      frequency: 150,
      tint: [0x88ccff, 0x66aaff]
    })
    this.statusParticles.setDepth(51)
  }

  private startZZZ() {
    const scene = this.sprite.scene
    this.zzzTimer = scene.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => {
        const zzz = scene.add.text(
          this.sprite.x + Phaser.Math.Between(-10, 10),
          this.sprite.y - 60,
          'Z',
          { fontSize: `${Phaser.Math.Between(14, 24)}px`, color: '#cc88ff',
            stroke: '#000', strokeThickness: 2 }
        ).setOrigin(0.5).setDepth(101)

        this.zzzTexts.push(zzz)

        scene.tweens.add({
          targets: zzz,
          y: zzz.y - Phaser.Math.Between(30, 60),
          alpha: 0,
          x: zzz.x + Phaser.Math.Between(-15, 15),
          duration: 1500,
          ease: 'Power2',
          onComplete: () => {
            zzz.destroy()
            const idx = this.zzzTexts.indexOf(zzz)
            if (idx > -1) this.zzzTexts.splice(idx, 1)
          }
        })
      }
    })
  }

  private drawShield() {
    const scene = this.sprite.scene
    this.shieldGraphic = scene.add.graphics()
    this.shieldGraphic.setDepth(55)

    const draw = () => {
      if (!this.shieldGraphic || !this.shieldGraphic.active) return
      this.shieldGraphic.clear()
      this.shieldGraphic.setPosition(this.sprite.x, this.sprite.y)
      this.shieldGraphic.lineStyle(3, 0x44ff44, 0.7)
      this.shieldGraphic.strokeCircle(0, 0, 40)
      this.shieldGraphic.lineStyle(2, 0x88ff88, 0.3)
      this.shieldGraphic.strokeCircle(0, 0, 44)
    }
    draw()
    scene.time.addEvent({ delay: 100, callback: draw, loop: true })
  }

  private flashShieldBreak() {
    const scene = this.sprite.scene
    const flash = scene.add.graphics()
    flash.setDepth(55)
    flash.setPosition(this.sprite.x, this.sprite.y)
    flash.lineStyle(4, 0xff4444, 0.9)
    flash.strokeCircle(0, 0, 44)
    flash.fillStyle(0x44ff44, 0.3)
    flash.fillCircle(0, 0, 44)
    scene.tweens.add({
      targets: flash, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 300,
      onComplete: () => flash.destroy()
    })
  }

  getStatusEffect(): string {
    return this.statusEffect
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

  startCrouch() {
    if (this._isCrouching || !this.playerState.isAlive) return
    this._isCrouching = true
    this.playerState.isCrouching = true

    if (this.crouchTween) { this.crouchTween.stop(); this.crouchTween = undefined }
    const scene = this.sprite.scene
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(36, 32)
    body.setOffset(14, 40)
    this.sprite.setTint(0xaaaaff)
    this.crouchTween = scene.tweens.add({
      targets: this.sprite,
      scaleX: 3, scaleY: 1,
      duration: 120,
      ease: 'Power2'
    })

    if (!this.crouchIndicator) {
      this.crouchIndicator = scene.add.text(this.sprite.x, this.sprite.y - 95, '🛡️ NẤP', {
        fontSize: '14px', color: '#88ccff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(102)
    }

    if (this.crouchTimer) { this.crouchTimer.destroy(); this.crouchTimer = undefined }
    this.crouchTimer = scene.time.delayedCall(this.CROUCH_DURATION, () => this.stopCrouch())
  }

  stopCrouch() {
    if (!this._isCrouching) return
    this._isCrouching = false
    this.playerState.isCrouching = false

    if (this.crouchTimer) { this.crouchTimer.destroy(); this.crouchTimer = undefined }
    if (this.crouchTween) { this.crouchTween.stop(); this.crouchTween = undefined }
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(36, 64)
    body.setOffset(14, 8)
    this.sprite.clearTint()
    this.crouchTween = this.sprite.scene.tweens.add({
      targets: this.sprite,
      scaleX: 2, scaleY: 2,
      duration: 120,
      ease: 'Power2'
    })
    if (this.crouchIndicator) {
      this.crouchIndicator.destroy()
      this.crouchIndicator = undefined
    }
  }

  isCrouching(): boolean { return this._isCrouching }

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
    this.nameText.destroy()
    this.hpValueText.destroy()
    if (this.crouchTween) this.crouchTween.stop()
    if (this.crouchIndicator) this.crouchIndicator.destroy()
    if (this.crouchTimer) this.crouchTimer.destroy()
    if (this.statusText) this.statusText.destroy()
    if (this.statusTimerText) this.statusTimerText.destroy()
    if (this.statusTimer) this.statusTimer.destroy()
    if (this.statusParticles) this.statusParticles.destroy()
    if (this.shieldGraphic) this.shieldGraphic.destroy()
    if (this.zzzTimer) this.zzzTimer.destroy()
    this.zzzTexts.forEach(t => t.destroy())
    this.zzzTexts = []
  }
}
