import { Schema, type, MapSchema } from '@colyseus/schema'

export class PlayerSchema extends Schema {
  @type("string") id = ""
  @type("string") name = ""
  @type("string") characterId = "warrior"
  @type("number") x = 0
  @type("number") y = 0
  @type("number") velocityX = 0
  @type("number") velocityY = 0
  @type("uint16") hp = 100
  @type("uint16") maxHp = 100
  @type("string") animState = "idle"
  @type("boolean") facingLeft = false
  @type("string") statusEffect = ""
  @type("number") statusDuration = 0
  @type("uint8") kills = 0
  @type("uint8") deaths = 0
  @type("uint8") energy = 3
  @type("boolean") isAlive = true
}

export class ProjectileSchema extends Schema {
  @type("string") id = ""
  @type("string") ownerId = ""
  @type("string") type = "rock"
  @type("number") x = 0
  @type("number") y = 0
  @type("number") velocityX = 0
  @type("number") velocityY = 0
  @type("number") rotation = 0
}

export class GameRoomSchema extends Schema {
  @type("string") phase = "waiting" // waiting, selecting, countdown, playing, roundEnd, gameEnd
  @type("uint8") timeLeft = 15
  @type("int8") windForce = 0 // -150..150
  @type("string") mapId = "forest_island"
  @type("uint8") p1RoundsWon = 0
  @type("uint8") p2RoundsWon = 0
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>()
  @type({ map: ProjectileSchema }) projectiles = new MapSchema<ProjectileSchema>()
  @type("uint8") currentTurn = 0 // index of current player
  @type("uint8") turnNumber = 0
  @type("uint8") maxTurns = 20 // 10 turns per player
}
