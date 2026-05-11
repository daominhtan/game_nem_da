export const GAME_CONFIG = {
    width: 1280,
    height: 720,
    worldWidth: 2560,
    gravity: 0.3,
    groundLevel: 580,
    maxPlayers: 2,
    turnTime: 15,
    maxTurns: 20,
    maxRounds: 3
};
export const PHYSICS = {
    gravity: 980,
    windForce: 0,
    maxPower: 1.0,
    minAngle: -90,
    maxAngle: 0,
    groundY: 580,
    throwSpeed: 1500
};
export const PLATFORMS = {
    mainGround: { x: 1280, y: 580, width: 2560, height: 40 },
    left: { x: 500, y: 500, width: 200, height: 20 },
    center: { x: 1280, y: 450, width: 240, height: 20 },
    right: { x: 2060, y: 500, width: 200, height: 20 }
};
export const SPAWN_POSITIONS = {
    player1: { x: 800, y: 520 },
    player2: { x: 1760, y: 520 }
};
export const ENERGY = {
    base: 4,
    bonusPerMissing30Hp: 1,
    maxDisplay: 8
};
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
};
export const CHARACTER_STATS = {
    warrior: { hp: 120, speed: 180, powerMult: 1.1 },
    mage: { hp: 80, speed: 200, powerMult: 1.0 },
    samurai: { hp: 100, speed: 220, powerMult: 1.0 },
    bear: { hp: 150, speed: 140, powerMult: 0.9 }
};
export const SKILL_DATA = {
    rock: { id: 'rock', name: 'Đá', damage: 20, cooldown: 0, description: 'Đạn cơ bản' },
    big_rock: { id: 'big_rock', name: 'Đá To', damage: 35, cooldown: 2, description: 'Nặng hơn, rơi nhanh' },
    bomb: { id: 'bomb', name: 'Bom', damage: 50, cooldown: 4, description: 'Nổ tung AoE 80px' },
    soap: { id: 'soap', name: 'Xà Bông', damage: 15, cooldown: 5, description: 'Choáng 2s' },
    pillow: { id: 'pillow', name: 'Gối Ngủ', damage: 10, cooldown: 6, description: 'Ngủ 2s' },
    fireball: { id: 'fireball', name: 'Cầu Lửa', damage: 40, cooldown: 4, description: 'Bay thẳng, khỏi gió' },
    wind_blade: { id: 'wind_blade', name: 'Chém Gió', damage: 0, cooldown: 8, description: 'Đẩy lệch đạn 3s' },
    shuriken: { id: 'shuriken', name: 'Phi Tiêu', damage: 25, cooldown: 1, description: 'Nhanh, ít bị gió' },
    hug_rush: { id: 'hug_rush', name: 'Ôm Chặt', damage: 30, cooldown: 10, description: 'Lao vào ôm, cả 2 thiệt' },
    honey: { id: 'honey', name: 'Mật Ong', damage: 5, cooldown: 5, description: 'Làm chậm 50%' },
    rock_rain: { id: 'rock_rain', name: 'Mưa Đá', damage: 50, cooldown: 12, description: '5 đá nhỏ từ trên' },
    triple_rock: { id: 'triple_rock', name: 'Ba Đá', damage: 45, cooldown: 3, description: '3 hòn đá fan' }
};
