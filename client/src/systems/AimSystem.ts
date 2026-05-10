import Phaser from 'phaser'
import { PHYSICS } from '@nem-da/shared/constants'

export default class AimSystem {
  private scene: Phaser.Scene
  private graphics?: Phaser.GameObjects.Graphics
  private isAimingFlag: boolean = false
  private screenStartX: number = 0
  private screenStartY: number = 0
  private worldStartX: number = 0
  private worldStartY: number = 0
  private currentScreenX: number = 0
  private currentScreenY: number = 0
  private dragDistance: number = 0
  private angle: number = -45
  private power: number = 0.5
  private facingLeft: boolean = false
  private previewText?: Phaser.GameObjects.Text
  private windForce: number = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  setWindForce(force: number) {
    this.windForce = force
  }

  startAim(worldX: number, worldY: number, screenX: number, screenY: number, facingLeft: boolean) {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics()
      this.graphics.setDepth(1000)
    }
    this.isAimingFlag = true
    this.worldStartX = worldX
    this.worldStartY = worldY
    this.screenStartX = screenX
    this.screenStartY = screenY
    this.currentScreenX = screenX
    this.currentScreenY = screenY
    this.facingLeft = facingLeft
  }

  updateAim(screenX: number, screenY: number) {
    if (!this.isAimingFlag) return

    this.currentScreenX = screenX
    this.currentScreenY = screenY

    const dx = screenX - this.screenStartX
    const dy = screenY - this.screenStartY

    this.angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx))

    if (this.facingLeft) {
      if (this.angle > -90 && this.angle <= 0) {
        this.angle = -90
      } else if (this.angle > 0) {
        this.angle = this.angle - 360
      }
      this.angle = Phaser.Math.Clamp(this.angle, -180, -90)
    } else {
      this.angle = Phaser.Math.Clamp(this.angle, -90, 0)
    }

    this.dragDistance = Math.sqrt(dx * dx + dy * dy)
    this.power = Phaser.Math.Clamp(this.dragDistance / 200, 0, 1)

    this.drawTrajectory()
    this.drawPowerBar()
  }

  update() {}

  stopAim(): { angle: number; power: number } {
    this.isAimingFlag = false
    if (this.graphics) {
      this.graphics.clear()
    }
    if (this.previewText) {
      this.previewText.destroy()
      this.previewText = undefined
    }
    return { angle: this.angle, power: this.power }
  }

  isAiming(): boolean {
    return this.isAimingFlag
  }

  private drawTrajectory() {
    if (!this.graphics) return
    this.graphics.clear()

    const radians = Phaser.Math.DegToRad(this.angle)
    let vx = Math.cos(radians) * this.power * PHYSICS.throwSpeed
    let vy = Math.sin(radians) * this.power * PHYSICS.throwSpeed
    let px = this.worldStartX
    let py = this.worldStartY

    this.graphics.lineStyle(3, 0xffff00, 0.8)
    this.graphics.beginPath()
    this.graphics.moveTo(px, py)
    this.graphics.lineTo(px + vx / 10, py + vy / 10)
    this.graphics.strokePath()

    for (let i = 0; i < 30; i++) {
      vx += this.windForce / 60
      vy += PHYSICS.gravity / 60
      px += vx / 60
      py += vy / 60

      const alpha = 1.0 - (i / 30) * 0.9
      const size = 4 * (1 - i / 60)

      this.graphics.fillStyle(0xffffff, alpha)
      this.graphics.fillCircle(px, py, size)

      if (py > PHYSICS.groundY) break
    }
  }

  private drawPowerBar() {
    if (!this.graphics) return

    const barWidth = 100
    const barHeight = 10
    const x = this.worldStartX + (this.facingLeft ? -150 : 50)
    const y = this.worldStartY - 80

    this.graphics.fillStyle(0x000000, 0.6)
    this.graphics.fillRect(x, y, barWidth, barHeight)

    const color = this.power > 0.7 ? 0xff0000 : this.power > 0.4 ? 0xffaa00 : 0x00ff00
    if (this.facingLeft) {
      this.graphics.fillStyle(color, 1)
      this.graphics.fillRect(x + barWidth * (1 - this.power), y, barWidth * this.power, barHeight)
    } else {
      this.graphics.fillStyle(color, 1)
      this.graphics.fillRect(x, y, barWidth * this.power, barHeight)
    }

    this.graphics.lineStyle(1, 0xffffff, 1)
    this.graphics.strokeRect(x, y, barWidth, barHeight)

    if (this.previewText) {
      this.previewText.setText(`Angle: ${Math.round(this.angle)}° | Power: ${Math.round(this.power * 100)}%`)
      this.previewText.setPosition(x, y - 20)
    } else {
      this.previewText = this.scene.add.text(x, y - 20, `Angle: ${Math.round(this.angle)}° | Power: ${Math.round(this.power * 100)}%`, {
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 3
      }).setDepth(1001)
    }
  }

  getAngle(): number {
    return this.angle
  }

  getPower(): number {
    return this.power
  }

  destroy() {
    if (this.graphics) this.graphics.destroy()
    if (this.previewText) this.previewText.destroy()
  }
}
