export const GAME_CONFIG = {
  width: 1280,
  height: 720,
  gravity: 0.3,
  groundLevel: 580,
  maxPlayers: 2,
  turnTime: 15,
  maxTurns: 20,
  maxRounds: 3
}

export const PHYSICS = {
  gravity: 980, // pixels/s² for server
  windForce: 0,
  maxPower: 1.0,
  minAngle: -90,
  maxAngle: 0,
  groundY: 580
}

export const MSG = {
  MOVE: 'move',
  THROW: 'throw',
  READY: 'ready',
  TAUNT: 'taunt',
  EMOJI: 'emoji',
  TURN_START: 'turnStart',
  TURN_END: 'turnEnd',
  HIT: 'hit',
  DEATH: 'death',
  ROUND_END: 'roundEnd',
  GAME_END: 'gameEnd',
  TIMEOUT: 'timeout',
  WIND_CHANGE: 'windChange'
}

export const CHARACTER_STATS = {
  warrior: { hp: 120, speed: 180, powerMult: 1.1 },
  mage: { hp: 80, speed: 200, powerMult: 1.0 },
  samurai: { hp: 100, speed: 220, powerMult: 1.0 },
  bear: { hp: 150, speed: 140, powerMult: 0.9 }
}
