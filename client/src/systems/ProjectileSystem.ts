import Phaser from 'phaser'
import { PHYSICS } from '/home/lap16851/dev/myopencode/game-nem-da/shared/src/constants'

export default class ProjectileSystem {
  private scene: Phaser.Scene
  private projectiles: Map<string, Phaser.Physics.Arcade.Sprite>
  private particles: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.projectiles = new Map()
    this.particles = new Map()
  }

  createProjectile(projectileId: string, projData: any) {
    const texture = this.getTextureForKey(projData.type) || 'rock'
    console.log(`[ProjectileSystem] Spawn ${projectileId}: type=${projData.type}, pos=(${projData.x}, ${projData.y}), vel=(${projData.velocityX}, ${projData.velocityY})`)
    const proj = this.scene.physics.add.sprite(projData.x, projData.y, texture)
    proj.setVelocity(projData.velocityX, projData.velocityY)
    proj.setData('ownerId', projData.ownerId)
    proj.setData('projectileId', projectileId)
    proj.setData('type', projData.type)

    // Add trail
    this.addTrail(proj, projData.type)

    this.projectiles.set(projectileId, proj)

    // Cleanup when out of bounds
    this.timeEventCheck(projectileId)
  }

  private getTextureForKey(type: string): string | undefined {
    const keys = ['rock', 'bomb', 'soap', 'pillow', 'big_rock', 'fireball', 'wind_blade', 'shuriken', 'hug_rush', 'honey', 'rock_rain', 'triple_rock']
    return keys.includes(type) ? type : undefined
  }

  private addTrail(proj: Phaser.Physics.Arcade.Sprite, type: string) {
    let texture = 'fx_spark'
    let tintColor = type === 'bomb' ? [0xff6600, 0xffcc00] : [0xcccccc, 0xaaaaaa]

    if (type === 'bomb') {
      texture = 'fx_fire'
    }

    const particles = this.scene.add.particles(0, 0, texture, {
      follow: proj,
      speed: { min: 10, max: 30 },
      angle: { min: 160, max: 200 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 200,
      quantity: 2,
      tint: tintColor
    })

    this.particles.set(proj.getData('projectileId'), particles)
  }

  private timeEventCheck(projectileId: string) {
    this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        const proj = this.projectiles.get(projectileId)
        if (proj) {
          if (proj.y > GAME_CONFIG.groundLevel + 50 || proj.x < -100 || proj.x > 2600) {
            this.destroyProjectile(projectileId)
          }
        }
      },
      repeat: -1
    })
  }

  update() {
    // Cleanup already-scheduled via time events
  }

  hasProjectile(id: string): boolean {
    return this.projectiles.has(id)
  }

  private destroyProjectile(key: string) {
    const proj = this.projectiles.get(key)
    if (proj) {
      const particles = this.particles.get(key)
      if (particles) {
        particles.destroy()
        this.particles.delete(key)
      }
      proj.destroy()
      this.projectiles.delete(key)
    }
  }

  getProjectile(id: string) {
    return this.projectiles.get(id)
  }
}

const GAME_CONFIG = { groundLevel: 580 }
