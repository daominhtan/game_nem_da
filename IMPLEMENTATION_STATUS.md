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
- 12 skill types fully implemented on server (rock, big_rock, bomb, soap, pillow, fireball, wind_blade, shuriken, hug_rush, honey, rock_rain, triple_rock)
- All with correct damage, AoE, status effects
- Skill cooldown tracking on client side
- SKILL_DATA config with names, damage, cooldown values

### 9. Skill Selection UI (GameScene, depth 200)
- Skill bar at bottom of screen with colored icons per skill type, rendered in GameScene (UIScene overlay had rendering issues)
- Click to select or press number keys 1-4
- Green border highlights selected skill via stored rect references + `setData('skillId')`
- Cooldown overlay (semi-transparent arc + countdown text)
- "CHON DAN (phim 1-4):" title above icons

### 10. Particle VFX (ProjectileSystem)
- Unique particle trails per projectile type (bomb: fire, soap: bubbles, fireball: embers)
- Explosion effects: bomb (flash+fire+smoke), soap (rainbow bubbles), pillow (feathers), fireball (embers)
- Dust particles on ground impact / regular hits
- Projectile rotation during flight

### 11. Emoji System (Z/X/C/V)
- Z → 😂, X → 😡, C → 👍, V → 💀
- Emoji floats above player for 2s

### 12. Combo System
- 2 hits within 3s = COMBO x2 (1.1x damage)
- 3 hits within 3s = COMBO x3 (1.2x damage)  
- Combo displayed mid-screen
- Reset between rounds

### 13. Critical Slow-Motion
- 20% critical hit chance (1.5x damage)
- Slow-motion effect (timeScale 0.3 for 300ms)
- "⚡ CRITICAL!" flash + camera shake

### 14. Squash & Stretch Animations (PlayerEntity)
- Idle breathing (subtle scale oscillation)
- Landing squash
- Hit: stretch horizontally, squish vertically
- Throw: windup → release → bounce
- Die: squish → dramatic sink
- Taunt: bouncy + scale wobble

### 15. Ground Physics Fix
- Removed ground collider (`tileSprite` + `Rectangle` static body) entirely
- Uses `physics.world.setBounds(0, 0, 1280, GAME_CONFIG.groundLevel=580)` to block falling through floor
- Enemy players: `setAllowGravity(false)` — position driven purely by server interpolation, no gravity jitter
- Local player keeps gravity for natural landing on ground level
- Fixes root cause: interpolation was overriding collider position each frame, pushing enemy through ground

### 16. Procedural Sound Effects & BGM
- `SoundManager` singleton using Web Audio API — no external audio files needed
- 14 procedural sound effects: throw (whoosh), hit (thump), critical (metallic ping), combo (ascending chimes), death (descending sawtooth), emoji (pop), taunt (ascending square wave beeps), turn start (bell), timeout (alarm), explosion (rumble+noise), click (UI), jump (rising tone), win (ascending notes), lose (descending notes)
- BGM: looping triangle-wave melody with bass drone
- Sounds integrated into GameScene events, ProjectileSystem ground impacts

## 🚧 Partially Implemented

### Animations
- Basic structure in place (idle, run, jump, aim, throw, hit, die)
- Animation playback based on server state
- Squash & stretch: ✅ (detailed above)
- Parallax backgrounds: TODO

### HP System
- Green bar (current HP): ✅
- Yellow "afterburn" bar (delayed): ✅
- Color changes (green→orange→red): ✅
- Knockback on hit: ✅

## ❌ Not Yet Implemented (Priority 2-4)

### Polish
- [ ] Sound effects + BGM
- [ ] Parallax backgrounds
- [ ] Platform tilemaps (currently flat ground only)

### Content
- [ ] 3 Maps (only Forest Island placeholder)
- [ ] Taunt animations (basic tween exists, no spritesheet)

### Fun Features
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

1. Implement status effects (stun, sleep, slide)
2. Parallax backgrounds
3. Platform tilemaps (currently flat ground only)
4. 3 Maps (only Forest Island placeholder)
5. Add real sprite assets (replace placeholders)
6. Easter eggs, win/lose quotes, confetti, random funny names
