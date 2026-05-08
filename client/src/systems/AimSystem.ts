import Phaser from 'phaser'
import { PHYSICS } from '@nem-da/shared/constants'

export default class AimSystem {
  private scene: Phaser.Scene
  private graphics?: Phaser.GameObjects.Graphics
  private isAimingFlag: boolean = false
  private startX: number = 0
  private startY: number = 0
  private currentX: number = 0
  private currentY: number = 0
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

  startAim(x: number, y: number, facingLeft: boolean) {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics()
      this.graphics.setDepth(1000)
    }
    this.isAimingFlag = true
    this.startX = x
    this.startY = y
    this.currentX = x
    this.currentY = y
    this.facingLeft = facingLeft
  }

  updateAim(x: number, y: number) {
    if (!this.isAimingFlag) return

    this.currentX = x
    this.currentY = y

    const dx = x - this.startX
    const dy = y - this.startY

    this.angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx))

    // Clamp based on facing direction
    if (this.facingLeft) {
      // P2 throws left: angles from -180 (left) to -90 (up)
      if (this.angle > -90 && this.angle <= 0) {
        this.angle = -90
      } else if (this.angle > 0) {
        this.angle = this.angle - 360 // Convert 0..90 to -360..-270, then clamp
      }
      this.angle = Phaser.Math.Clamp(this.angle, -180, -90)
    } else {
      // P1 throws right: angles from -90 (up) to 0 (right)
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
    let px = this.startX
    let py = this.startY

    // Draw aim direction line
    this.graphics.lineStyle(3, 0xffff00, 0.8)
    this.graphics.beginPath()
    this.graphics.moveTo(px, py)
    this.graphics.lineTo(px + vx / 10, py + vy / 10)
    this.graphics.strokePath()

    // Draw trajectory dots
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
    const x = this.startX + (this.facingLeft ? -150 : 50)
    const y = this.startY - 80

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
