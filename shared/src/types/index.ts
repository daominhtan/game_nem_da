export interface PlayerState {
  id: string
  name: string
  characterId: string
  x: number
  y: number
  velocityX: number
  velocityY: number
  hp: number
  maxHp: number
  animState: string
  facingLeft: boolean
  statusEffect: string
  statusDuration: number
  kills: number
  deaths: number
  isAlive: boolean
}

export interface ProjectileState {
  id: string
  ownerId: string
  type: string
  x: number
  y: number
  velocityX: number
  velocityY: number
  rotation: number
}

export interface GameRoomState {
  phase: string
  timeLeft: number
  windForce: number
  mapId: string
  p1RoundsWon: number
  p2RoundsWon: number
  currentTurn: number
  turnNumber: number
  maxTurns: number
  players: Map<string, PlayerState>
  projectiles: Map<string, ProjectileState>
}

export type MessageType =
  | 'move'
  | 'throw'
  | 'taunt'
  | 'ready'
  | 'emoji'
  | 'turnStart'
  | 'turnEnd'
  | 'hit'
  | 'death'
  | 'roundEnd'
  | 'gameEnd'
  | 'timeout'
  | 'windChange'
