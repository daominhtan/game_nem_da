# Implementation Status - Ném Đá Online

## ✅ Completed Features (Priority 1 - Core)

### 1. Colyseus Schema & Server State
- `PlayerSchema`: id, name, characterId, x, y, velocity, hp, maxHp, animState, facingLeft, statusEffect, kills, deaths, isAlive
- `ProjectileSchema`: id, ownerId, type, x, y, velocityX, velocityY, rotation
- `GameRoomSchema`: phase, timeLeft, windForce, mapId, rounds, players map, projectiles map, currentTurn, turnNumber

### 2. Turn-Based System
- 2 players per room (maxClients: 2)
- 15-second timeout per turn with auto-throw
- Turn switching after each throw
- Random first turn
- Max 20 turns per round (10 per player)
- Wind changes every turn (-150 to +150)

### 3. Server Authoritative Physics
- Projectile simulation at 60fps on server
- Gravity: 980 pixels/s²
- Wind force affects projectile X velocity
- Ground collision at y=580
- Player collision detection (40px radius)

### 4. Network Messages
- Client → Server: `move`, `throw`, `ready`, `taunt`, `emoji`
- Server → Client: `turnStart`, `turnEnd`, `hit`, `death`, `roundEnd`, `gameEnd`, `timeout`, `windChange`

### 5. Client-Side Systems
- **AimSystem**: Drag-to-aim with trajectory prediction (30 points), power bar, angle display
- **ProjectileSystem**: Spawns projectiles, adds particle trails, destroys on ground hit
- **PlayerEntity**: Handles animations, HP bars, interpolation (lerp 0.15)

### 6. Scenes
- **BootScene**: Generates placeholder textures at runtime (characters, projectiles, backgrounds)
- **MenuScene**: Title screen with "Bắt Đầu" button
- **CharacterSelect**: Grid 2x2 with character stats (HP, Speed, Power)
- **GameScene**: Core gameplay with turn indicators, damage text, HUD
- **ResultScene**: Win/Lose display

### 7. Characters
- **Warrior**: HP 120, Speed 180, Skills: rock, big_rock, bomb, soap
- **Mage**: HP 80, Speed 200, Skills: rock, fireball, pillow, wind_blade
- **Samurai**: HP 100, Speed 220, Skills: rock, shuriken, wind_blade, triple_rock
- **Bear**: HP 150, Speed 140, Skills: rock, hug_rush, honey, rock_rain

### 8. Skills System
- `rock`: 20 damage, basic projectile
- `bomb`: 50 damage, AoE radius 80px
- `soap`: 15 damage + stun effect
- (Other skills defined in config, ready for implementation)

## 🚧 Partially Implemented

### Animations
- Basic structure in place (idle, run, jump, aim, throw, hit, die)
- Animation playback based on server state
- Squash & stretch: TODO
- Parallax backgrounds: TODO

### HP System
- Green bar (current HP): ✅
- Yellow "afterburn" bar (delayed): TODO
- Color changes (green→orange→red): TODO
- Knockback on hit: TODO

## ❌ Not Yet Implemented (Priority 2-4)

### Polish
- [ ] Squash & stretch animations
- [ ] Particle systems (trails, explosions, dust)
- [ ] Camera shake + slow motion
- [ ] Sound effects + BGM
- [ ] Skill cooldown UI

### Content
- [ ] 3 Maps (only Forest Island placeholder)
- [ ] Status effects (stun, sleep, slide)
- [ ] Emoji system (Z/X/C/V shortcuts)
- [ ] Taunt animations

### Fun Features
- [ ] Combo system
- [ ] Critical hits + slow motion
- [ ] Easter eggs
- [ ] Win/lose quotes
- [ ] Confetti
- [ ] Random funny names

## 🎮 How to Play

1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Open http://localhost:3000
4. Second player opens another browser tab
5. Both select characters → Game starts automatically
6. Drag mouse to aim, release to throw
7. Defend when it's opponent's turn!

## 📁 Project Structure

```
nem-da-game/
├── client/                 # Phaser 4 + Vite
│   └── src/
│       ├── scenes/         # Boot, Menu, Game, UI, Result
│       ├── entities/       # PlayerEntity
│       ├── systems/        # AimSystem, ProjectileSystem
│       ├── network/        # NetworkManager (Colyseus client)
│       └── config/        # characters.ts
├── server/                 # Colyseus 0.15
│   └── src/
│       ├── rooms/         # GameRoom (server authoritative)
│       └── schema.ts      # PlayerSchema, ProjectileSchema
└── shared/                 # Common types
    └── src/
        ├── types/          # TypeScript interfaces
        └── constants/      # GAME_CONFIG, PHYSICS, MSG
```

## 🏃 Next Steps

1. Add real sprite assets (replace placeholders)
2. Implement status effects (stun, sleep, slide)
3. Add sound effects and BGM
4. Polish animations (squash & stretch)
5. Add particle effects for projectiles
6. Implement emoji system
7. Add more maps
