import { Room, Client } from '@colyseus/core'
import { Schema, type, MapSchema } from '@colyseus/schema'
import { GameRoomSchema, PlayerSchema, ProjectileSchema } from './schema.js'

const GRAVITY = 980
const GROUND_Y = 580
const MAX_TURN_TIME = 15 // seconds
const THROW_SPEED = 1500 // base speed multiplier for throw velocity

export class GameRoom extends Room<GameRoomSchema> {
  maxClients = 2
  private turnTimer?: NodeJS.Timeout
  private windChangeInterval?: NodeJS.Timeout
  private comboCount: Map<string, { count: number; lastHitTime: number }> = new Map()
  private hasThrownThisTurn: boolean = false

  onCreate(options: any) {
    this.setState(new GameRoomSchema())
    this.state.phase = "waiting"

    // Handle player input
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId)
      if (player && player.isAlive) {
        player.x = data.x
        player.y = data.y
        player.velocityX = data.velocityX || 0
        player.velocityY = data.velocityY || 0
        player.facingLeft = data.facingLeft || false
        player.animState = data.animState || "idle"
      }
    })

    this.onMessage("throw", (client, data) => {
      if (this.hasThrownThisTurn) return
      console.log(`[message] throw from ${client.sessionId}: ${JSON.stringify(data)}`)
      const player = this.state.players.get(client.sessionId)
      if (player && this.isPlayerTurn(player) && player.isAlive) {
        this.hasThrownThisTurn = true
        this.handleThrow(player, data)
      }
    })

    this.onMessage("ready", (client, data) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.characterId = data.characterId || "warrior"
        
        // Check if both players have selected a character (not default warrior with no selection)
        const allReady = Array.from(this.state.players.values()).every(p => p.characterId !== "warrior" || data.characterId !== "")
        if (allReady && this.state.players.size === 2) {
          this.startGame()
        }
      }
    })

    this.onMessage("taunt", (client) => {
      // Taunt is punishable - can be hit during taunt
      this.broadcast("taunt", { playerId: client.sessionId })
    })

    this.onMessage("emoji", (client, data) => {
      this.broadcast("emoji", { playerId: client.sessionId, emoji: data.emoji })
    })
  }

  onJoin(client: Client, options: any) {
    const player = new PlayerSchema()
    player.id = client.sessionId

    // Spawn positions
    const playerIndex = this.state.players.size
    player.x = playerIndex === 0 ? 200 : 1080
    player.y = 520
    player.characterId = "warrior"
    player.facingLeft = playerIndex === 1
    player.hp = this.getCharacterHP(player.characterId)
    player.maxHp = player.hp
    player.isAlive = true

    this.state.players.set(client.sessionId, player)

    if (this.state.players.size === 2) {
      this.state.phase = "selecting"
    }
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId)
    if (this.state.players.size < 2 && this.state.phase === "playing") {
      this.state.phase = "gameEnd"
    }
  }

  private startGame() {
    this.state.phase = "countdown"
    this.state.currentTurn = 0
    this.state.turnNumber = 0
    this.state.windForce = this.randomWind()

    // Random first turn
    const playerIds = Array.from(this.state.players.keys())
    this.state.currentTurn = Math.random() > 0.5 ? 1 : 0

    setTimeout(() => {
      this.state.phase = "playing"
      this.startTurn()
    }, 3000)
  }

  private startTurn() {
    this.hasThrownThisTurn = false
    const playerIds = Array.from(this.state.players.keys())
    const currentPlayer = this.state.players.get(playerIds[this.state.currentTurn])

    // Check if current player has a disabling status effect
    const isStunned = currentPlayer?.statusEffect === "stunned" || currentPlayer?.statusEffect === "sleeping"
    const turnTime = isStunned ? 5 : MAX_TURN_TIME

    this.state.timeLeft = turnTime

    if (isStunned && currentPlayer) {
      this.broadcast("statusEffect", {
        playerId: currentPlayer.id,
        effect: currentPlayer.statusEffect,
        duration: turnTime
      })
    }

    this.turnTimer = setInterval(() => {
      this.state.timeLeft--
      if (this.state.timeLeft <= 0) {
        this.handleTimeout()
      }
    }, 1000)

    const currentPlayerId = playerIds[this.state.currentTurn]
    this.broadcast("turnStart", { playerId: currentPlayerId, timeLeft: turnTime })
  }

  private handleThrow(player: PlayerSchema, data: any) {
    const angle = data.angle || 0
    const power = data.power || 0.5
    const skillId = data.skillId || "rock"
    const radians = (angle * Math.PI) / 180

    console.log(`[handleThrow] rawAngle=${data.angle}, angle=${angle}, radians=${radians.toFixed(4)}, cos=${Math.cos(radians).toFixed(4)}`)
const velocityX = Math.cos(radians) * power * THROW_SPEED
const velocityY = Math.sin(radians) * power * THROW_SPEED

    console.log(`[handleThrow] player=${player.id}, angle=${angle}, power=${power}, velocityX=${velocityX.toFixed(1)}, velocityY=${velocityY.toFixed(1)}`)

    const projectile = new ProjectileSchema()
    projectile.id = `${player.id}_${Date.now()}`
    projectile.ownerId = player.id
    projectile.type = skillId
    projectile.x = player.x
    projectile.y = player.y
    projectile.velocityX = velocityX
    projectile.velocityY = velocityY

    this.state.projectiles.set(projectile.id, projectile)
    this.broadcast("throw", { projectileId: projectile.id, ownerId: player.id })

    // Start projectile simulation
    this.simulateProjectile(projectile.id)
  }

  private simulateProjectile(projectileId: string) {
    const projectile = this.state.projectiles.get(projectileId)
    if (!projectile) return

    const interval = setInterval(() => {
      // Update position
      projectile.x += (projectile.velocityX / 60) // 60fps
      projectile.y += (projectile.velocityY / 60)
      projectile.velocityY += GRAVITY / 60
      projectile.velocityX += this.state.windForce / 60

      // Check collision with ground
      if (projectile.y >= GROUND_Y) {
        this.handleProjectileHit(projectile, null)
        clearInterval(interval)
        this.state.projectiles.delete(projectileId)
        return
      }

      // Check collision with players
      this.state.players.forEach((player, playerId) => {
        if (playerId !== projectile.ownerId && player.isAlive) {
          const dist = Math.sqrt(
            Math.pow(projectile.x - player.x, 2) + Math.pow(projectile.y - player.y, 2)
          )
          if (dist < 40) { // Hit radius
            this.handleProjectileHit(projectile, player)
            clearInterval(interval)
            this.state.projectiles.delete(projectileId)
          }
        }
      })
    }, 1000 / 60) // 60fps
  }

  private handleProjectileHit(projectile: ProjectileSchema, target: PlayerSchema | null) {
    const isBomb = projectile.type === "bomb"
    let comboMultiplier = 1
    let comboLevel = 0

    if (target) {
      // Wind shield blocks incoming projectile entirely
      if (target.statusEffect === "wind_shield") {
        target.statusEffect = ""
        target.statusDuration = 0
        this.broadcast("hit", {
          targetId: target.id,
          damage: 0,
          isCritical: false,
          projectileType: projectile.type,
          statusEffect: "shield_break",
          comboLevel: 0
        })
        setTimeout(() => this.nextTurn(), 1000)
        return
      }

      let damage = this.getSkillDamage(projectile.type)

      // Critical hit (20% chance)
      const isCritical = Math.random() < 0.2
      if (isCritical) damage = Math.floor(damage * 1.5)

      // Combo tracking: 2+ hits within 3 seconds
      const now = Date.now()
      const comboData = this.comboCount.get(projectile.ownerId) || { count: 0, lastHitTime: 0 }
      if (now - comboData.lastHitTime < 3000) {
        comboData.count++
        if (comboData.count >= 3) {
          comboMultiplier = 1.2
          comboLevel = 3
        } else if (comboData.count >= 2) {
          comboMultiplier = 1.1
          comboLevel = 2
        }
      } else {
        comboData.count = 1
      }
      comboData.lastHitTime = now
      this.comboCount.set(projectile.ownerId, comboData)
      damage = Math.floor(damage * comboMultiplier)

      // Apply damage
      target.hp = Math.max(0, target.hp - damage)

      // Broadcast combo
      if (comboLevel > 1) {
        this.broadcast("combo", {
          playerId: projectile.ownerId,
          level: comboLevel,
          multiplier: comboMultiplier
        })
      }

      // Wake sleeping player on hit
      const wasSleeping = target.statusEffect === "sleeping"
      if (wasSleeping) {
        target.statusEffect = ""
        target.statusDuration = 0
      }

      // Apply status effects from projectile (unless target was sleeping and is now awake)
      if (!wasSleeping) {
        if (projectile.type === "soap") {
          target.statusEffect = "stunned"
          target.statusDuration = 2
        } else if (projectile.type === "pillow") {
          target.statusEffect = "sleeping"
          target.statusDuration = 2
        } else if (projectile.type === "honey") {
          target.statusEffect = "slowed"
          target.statusDuration = 3
        } else if (projectile.type === "wind_blade") {
          target.statusEffect = "wind_shield"
          target.statusDuration = 2
        }
      }

      // Bomb AoE: damage nearby players too
      if (isBomb) {
        this.state.players.forEach((player, playerId) => {
          if (playerId !== target.id && player.isAlive) {
            const dist = Math.sqrt(
              Math.pow(projectile.x - player.x, 2) + Math.pow(projectile.y - player.y, 2)
            )
            if (dist < 80) {
              const aoeDamage = Math.floor(50 * (1 - dist / 80))
              player.hp = Math.max(0, player.hp - aoeDamage)
              this.broadcast("hit", {
                targetId: player.id,
                damage: aoeDamage,
                isCritical: false,
                projectileType: "bomb_aoe"
              })
              if (player.hp <= 0) {
                player.isAlive = false
                player.animState = "die"
                this.broadcast("death", { targetId: player.id, killerId: projectile.ownerId })
              }
            }
          }
        })
      }

      this.broadcast("hit", {
        targetId: target.id,
        damage,
        isCritical,
        projectileType: projectile.type,
        statusEffect: target.statusEffect || undefined,
        comboLevel: comboLevel > 1 ? comboLevel : 0
      })

      if (target.hp <= 0) {
        target.isAlive = false
        target.animState = "die"
        this.broadcast("death", { targetId: target.id, killerId: projectile.ownerId })
      }
    }

    // Next turn after hit
    setTimeout(() => this.nextTurn(), isBomb ? 1500 : 1000)
  }

  private handleTimeout() {
    if (this.turnTimer) clearInterval(this.turnTimer)
    if (this.hasThrownThisTurn) return

    const playerIds = Array.from(this.state.players.keys())
    const currentPlayer = this.state.players.get(playerIds[this.state.currentTurn])

    if (currentPlayer) {
      // If stunned, throw erratically
      const isStunned = currentPlayer.statusEffect === "stunned" || currentPlayer.statusEffect === "sleeping"
      const defaultAngle = isStunned
        ? (Math.random() * 180) - 180  // random bad throw
        : currentPlayer.facingLeft ? -135 : -45

      this.broadcast("timeout", {
        playerId: currentPlayer.id,
        isStunned: isStunned,
        effect: currentPlayer.statusEffect
      })

      // Clear the status effect after timeout throw
      currentPlayer.statusEffect = ""
      currentPlayer.statusDuration = 0

      this.handleThrow(currentPlayer, { angle: defaultAngle, power: 0.5, skillId: "rock" })
    }
  }

  private nextTurn() {
    if (this.turnTimer) clearInterval(this.turnTimer)

    // Decrement status durations
    this.state.players.forEach(player => {
      if (player.statusDuration > 0) {
        player.statusDuration--
        if (player.statusDuration <= 0) {
          player.statusEffect = ""
        }
      }
    })

    this.state.turnNumber++

    // Check round end conditions
    const alivePlayers = Array.from(this.state.players.values()).filter(p => p.isAlive)
    if (alivePlayers.length <= 1 || this.state.turnNumber >= this.state.maxTurns) {
      this.endRound()
      return
    }

    // Switch turn
    this.state.currentTurn = (this.state.currentTurn + 1) % 2
    this.state.windForce = this.randomWind()
    this.broadcast("windChange", { force: this.state.windForce })
    this.startTurn()
  }

  private endRound() {
    this.state.phase = "roundEnd"
    const playerIds = Array.from(this.state.players.keys())
    const p1 = this.state.players.get(playerIds[0])!
    const p2 = this.state.players.get(playerIds[1])!

    let winnerId = p1.hp > p2.hp ? playerIds[0] : playerIds[1]
    if (p1.hp === p2.hp) winnerId = ""

    if (winnerId === playerIds[0]) this.state.p1RoundsWon++
    else if (winnerId === playerIds[1]) this.state.p2RoundsWon++

    this.broadcast("roundEnd", {
      winnerId,
      p1Hp: p1.hp,
      p2Hp: p2.hp
    })

    // Check game end (best of 3)
    if (this.state.p1RoundsWon >= 2 || this.state.p2RoundsWon >= 2) {
      setTimeout(() => {
        this.state.phase = "gameEnd"
        this.broadcast("gameEnd", {
          winnerId: this.state.p1RoundsWon >= 2 ? playerIds[0] : playerIds[1]
        })
      }, 3000)
    } else {
      // Next round
      setTimeout(() => this.startNextRound(), 3000)
    }
  }

  private startNextRound() {
    this.state.players.forEach(player => {
      player.hp = player.maxHp
      player.isAlive = true
      player.animState = "idle"
    })
    this.comboCount.clear()
    this.state.currentTurn = Math.random() > 0.5 ? 1 : 0
    this.state.turnNumber = 0
    this.state.phase = "playing"
    this.startTurn()
  }

  private isPlayerTurn(player: PlayerSchema): boolean {
    const playerIds = Array.from(this.state.players.keys())
    return playerIds[this.state.currentTurn] === player.id
  }

  private randomWind(): number {
    return Math.floor(Math.random() * 300) - 150
  }

  private getCharacterHP(characterId: string): number {
    const hpMap: Record<string, number> = {
      warrior: 120,
      mage: 80,
      samurai: 100,
      bear: 150
    }
    return hpMap[characterId] || 100
  }

  private getSkillDamage(skillId: string): number {
    const damageMap: Record<string, number> = {
      rock: 20,
      big_rock: 35,
      bomb: 50,
      soap: 15,
      pillow: 10,
      fireball: 40,
      wind_blade: 0,
      shuriken: 25,
      hug_rush: 30,
      honey: 5,
      rock_rain: 50,
      triple_rock: 45
    }
    return damageMap[skillId] || 20
  }
}
