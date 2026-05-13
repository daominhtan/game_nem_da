# Implementation Status - Ném Đá Online

## ✅ Completed Features (Verified from Actual Code)

### Core Systems
- [x] Colyseus Schema & Server State (PlayerSchema, ProjectileSchema, GameRoomSchema)
- [x] Turn-based system (15s timeout, auto-throw, turn switching, random first turn, max 20 turns/round)
- [x] Server authoritative physics (gravity 980, wind, ground collision at y=580, player collision 40px radius)
- [x] Network messages (move, throw, ready, taunt, emoji, turnStart/End, hit, death, roundEnd, gameEnd)
- [x] Client-side AimSystem (drag-to-aim, trajectory prediction, power bar, angle display)
- [x] Client-side ProjectileSystem (spawn, particle trails, ground hit destroy)
- [x] Client-side PlayerEntity (animations, HP bars, interpolation lerp 0.15)

### Scenes
- [x] BootScene (placeholder textures at runtime)
- [x] MenuScene (title + buttons: Tìm Trận, Tạo Phòng, Chơi Với Bot, Tham Gia Phòng)
- [x] CharacterSelect (grid 2x2, character stats, 30s timer, ready button)
- [x] GameScene (core gameplay, turn indicators, damage text, HUD)
- [x] UIScene (HP bars, timer, wind, skill bar, energy pips, round indicators)
- [x] ResultScene (Win/Lose display + Chơi Lại/Về Menu)

### Characters
- [x] Warrior (HP 120, Speed 180, skills: rock/big_rock/bomb/soap)
- [x] Mage (HP 80, Speed 200, skills: rock/fireball/pillow/wind_blade)
- [x] Samurai (HP 100, Speed 220, skills: rock/shuriken/wind_blade/triple_rock)
- [x] Bear (HP 150, Speed 140, skills: rock/hug_rush/honey/rock_rain)

### Skills System
- [x] 12 skill types on server (rock, big_rock, bomb, soap, pillow, fireball, wind_blade, shuriken, hug_rush, honey, rock_rain, triple_rock)
- [x] Basic damage values for all skills
- [x] Bomb AoE (80px radius with distance falloff)
- [x] Status effects: soap→stunned, pillow→sleeping, honey→slowed, wind_blade→wind_shield
- [x] Cooldown tracking on client
- [x] SKILL_DATA config in shared constants
- [x] Wake sleeping player on hit

### VFX & Audio
- [x] Particle trails per projectile type (bomb: fire, soap: bubbles, fireball: embers)
- [x] Explosion effects (bomb: flash+fire+smoke, soap: rainbow bubbles, pillow: feathers)
- [x] Dust particles on ground impact
- [x] Projectile rotation during flight
- [x] Procedural SoundManager (14 SFX + BGM via Web Audio API)

### Gameplay Features
- [x] Emoji system (Z/X/C/V)
- [x] Combo system (x2 = 1.1x, x3 = 1.2x damage)
- [x] Critical hit (20% chance, 1.5x damage, slow-motion 300ms)
- [x] Squash & stretch animations (idle breathing, landing, hit, throw, die, taunt)
- [x] HP bars (green current, yellow afterburn, color changes, knockback)
- [x] Ground physics fix (world bounds, enemy no gravity, local player gravity)
- [x] Status effects (stunned/sleeping/slowed) with full VFX + timer countdown

### Matchmaking & Room System
- [x] Matchmaking queue (joinQueue, leaveQueue, auto-match when ≥2 players)
- [x] 15s queue timeout → bot match fallback
- [x] Room code generation (6 characters: A-Z, 2-9)
- [x] Room creation (Tạo Phòng) with code display + clipboard copy
- [x] Room join by code (Tham Gia Phòng)
- [x] Bot match mode (Chơi Với Bot)
- [x] Room state machine: waiting → selecting → countdown → playing → roundEnd → gameEnd
- [x] Phase transitions: countdown 3s, round summary 3s, automatic next round

### Bot Player
- [x] BotPlayer class with character selection, skill rotation, cooldown tracking
- [x] Angle/power calculation (optimal angle using physics discriminant)
- [x] Weighted random skill selection
- [x] Bot dodge logic (predicts projectile, decides move/jump/crouch)
- [x] Bot defense movement (random walk + crouch)
- [x] Bot observes human throw for mirror attacks

### Wind System
- [x] Random wind per turn (-150 to 150)
- [x] Wind applied to projectile physics
- [x] Wind broadcast to client + direction indicator in HUD

### Crouch & Energy System
- [x] Defender crouch mechanic (down arrow, 3s duration, tint + squash)
- [x] Energy pips (HP-based, max 8, decremented per defense)
- [x] Crouch reduces hit radius by 50%
- [x] UI energy display

### Parallax & Environment
- [x] 3-layer parallax (far ×0.05, mid ×0.2, near ×0.5) with procedural textures
- [x] Cloud movement (3-5 clouds, random speed/drift)
- [x] Floating dust particles + leaf particles
- [x] Day sky gradient background (mountains, hills, trees, bushes)

### Platforms & Collision
- [x] Main ground (y=580, grass+dirt texture, width=2560)
- [x] Floating platforms (left, center, right)
- [x] Camera bounds 0..2560, lerp follow (factor 0.08)
- [x] Spawn points (P1: x=800, P2: x=1760)
- [x] Platform collision for local player (Arcade physics)

### Bug Fixes
- [x] Multi-throw spam (hasThrownThisTurn flag)
- [x] Replay cleanup (scene shutdown + leaveRoom + recreate systems)
- [x] Camera scroll + aim position recalculation

### UI
- [x] Skill selection bar (bottom, colored, number keys 1-4, cooldown arc overlay)
- [x] Turn indicator (countdown bar, text "LƯỢT CỦA BẠN!")
- [x] Wind indicator (text + direction arrow)
- [x] Damage floating text (red, fly up + fade, crit bigger yellow)
- [x] Round indicator (3 circles, best of 3)
- [x] HP bars with color thresholds (green/orange/red)
- [x] Timer with color change + blink at 5s
- [x] Defender label + player names + energy pips
- [x] Name input overlay (up to 20 chars)
- [x] Room code display with copy button

---

## ⚠️ Known Gaps

### Skill Unique Mechanics Missing (6/12 skills)
- [ ] `big_rock` — Không rơi nhanh hơn (same gravity as all projectiles)
- [ ] `fireball` — Không khỏi gió (affected by wind same as rock)
- [ ] `shuriken` — Không ít bị gió (same wind sensitivity)
- [ ] `hug_rush` — Không lao vào ôm (acts as standard projectile, no self-damage/rush)
- [ ] `rock_rain` — Không 5 đá nhỏ (fires single projectile)
- [ ] `triple_rock` — Không 3 hòn đá fan (fires single projectile)
- [ ] Server-side cooldown enforcement — **MISSING** (cooldown only tracked on client, no server validation)
- [ ] Server-side character-skill validation — **MISSING** (warrior can throw fireball)

### Server Validation Gaps
- [ ] Move handler doesn't check `player.statusEffect` — stunned/sleeping players can still move
- [ ] No speed limit check (client positions blindly accepted)
- [ ] No emoji whitelist or cooldown (any emoji data broadcast as-is)
- [ ] No angle/power validation on throw (trusts client 100%)
- [ ] No rate limiting (max messages/second)

---

## 📋 Implementation Roadmap (Next Phases)

### Phase 2: Room & Matchmaking Polish

#### Room System Improvements
- [ ] Public/Private room toggle (currently code-based private only)
- [ ] 30s character select timer (currently waits indefinitely)
- [ ] Auto-random character if timer expires

#### Bot System Improvements
- [ ] Bot difficulty levels (easy: random 0.4-0.7, hard: precise aim 0.8-1.0)
- [ ] Bot taunt/emoji random (feel more human)
- [ ] Bot disconnect handling

#### Reconnect System (Not Started)
- [ ] Server detect disconnect (WebSocket close)
- [ ] 30s reconnect window with game pause
- [ ] Full state sync on reconnect
- [ ] Auto-win if reconnect fails

---

### Phase 3: Mobile Support

#### Responsive Scaling
- [ ] Phaser Scale.FIT mode (1280×720 base, scale to any screen)
- [ ] autoCenter: CENTER_BOTH
- [ ] Portrait mode detection + "Xoay ngang" overlay
- [ ] UI element scaling (HP bar, skill icons, timer, buttons)

#### Touch Controls
- [ ] Virtual joystick (left 1/3 screen, move + jump)
- [ ] Touch drag aiming (right 2/3 screen)
- [ ] Touch-to-throw (release = ném)
- [ ] Skill/taunt/emoji buttons bottom-right (56×56px min)
- [ ] Touch feedback (visual press state)
- [ ] Minimum touch target 44px (Apple HIG)

#### Performance Optimization
- [ ] Reduce particle quantity 60% on mobile
- [ ] Physics tick 30fps on mobile (vs 60)
- [ ] Texture bias 2 (lower mipmap quality)
- [ ] Disable far parallax layer on low-end devices
- [ ] Device performance detection (high/medium/low)

---

### Phase 4: Content & Maps

#### Map 2: "Núi Lửa Điên"
- [ ] Dung nham chảy background (màu đỏ cam, animated)
- [ ] Platforms rơi dần (20s rơi → 10s rebuild)
- [ ] Mưa đá ngẫu nhiên (5 damage, có cảnh báo trước)
- [ ] Map unlock system (after 10 games)

#### Map 3: "Đêm Huyền Bí"
- [ ] Dark background + stars
- [ ] Moon light effect (phát sáng)
- [ ] Fog of war (spotlight quanh nhân vật, 70% tối)
- [ ] Ambient firefly particles

#### Taunt Animations
- [ ] Warrior: giơ cục xà bông + "Sạch bóng! 🫧"
- [ ] Mage: đọc sách + ngáp + "Zzz..."
- [ ] Samurai: rút kiếm soi bóng + "HA-MEN!"
- [ ] Bear: vỗ bụng + "Ôm cái nào! 🐻"
- [ ] Taunt SFX riêng từng nhân vật
- [ ] Taunt có thể bị đánh (punishable)

---

### Phase 5: Error Handling & Edge Cases

#### Network Error Handling
- [ ] Disconnect detection + auto-reconnect (max 15 retries, 2s interval)
- [ ] Request timeout (5s) + retry 1 lần
- [ ] Server error responses (ROOM_FULL, INVALID_MOVE, RATE_LIMIT)
- [ ] Toast notification system cho lỗi
- [ ] Full state cache on client (reconnect sync)

#### Gameplay Edge Cases
- [ ] Cả 2 cùng chết (AoE tick timing → draw hoặc phân định)
- [ ] Rơi xuống map (y > MAP_BOTTOM_BOUNDARY → death)
- [ ] Đạn bay mãi không dừng (lifetime > 10s hoặc out of bounds → force remove)
- [ ] Double throw spam (ignore nếu < 100ms)
- [ ] AFK detection (3 lượt liên tiếp timeout → auto-play mode)

#### Server Validation
- [ ] Validate moves (phase check, status effect check, speed limit)
- [ ] Validate throw (current turn, angle 0-360, power 0.05-1, skillId, cooldown)
- [ ] Validate emoji (whitelist, cooldown 3s)
- [ ] Rate limiting (max messages/s per client)
- [ ] Anti-speed hack (distance check per tick)

#### Client Fallbacks
- [ ] Server silent 5s → enable client prediction
- [ ] Invalid state → requestFullSync
- [ ] Animation desync → force reset to idle
- [ ] Asset load fail → placeholder texture (magenta ? box)
- [ ] WebSocket unsupported → error screen

#### Logging & Debug
- [ ] GameLogger (debug/info/warn/error levels, timestamp, category)
- [ ] Error report to server (production, fire-and-forget POST)
- [ ] Race condition handling (CriticalSection lock cho turn management)

---

### Phase 6: Fun Features & Polish

#### Easter Eggs
- [ ] 3 lần ném trượt liên tiếp → nhân vật nhìn tay lắc đầu
- [ ] 2 đá chạm nhau giữa không trung → "PING!" + nổ nhỏ
- [ ] Hidden animation khi idling lâu (>10s)

#### Win/Lose Quotes
- [ ] 5 quotes random mỗi nhân vật
- [ ] Speech bubble trên nhân vật (3s)
- [ ] SFX quotes

#### Confetti & Celebrations
- [ ] Confetti particles khi thắng (ResultScene)
- [ ] "THẢM BẠI!" banner khi thắng với >80% HP còn lại
- [ ] "CÙNG CHẾT LOL!" khi double KO
- [ ] Screen shake kết hợp

#### Random Funny Names
- [ ] 20+ random names trong danh sách
- [ ] Auto-assign nếu không nhập tên
- [ ] Hiển thị trên HUD + scoreboard

#### Critical Hit Polish
- [ ] Lightning bolt VFX tại điểm trúng
- [ ] Screen flash vàng 0.1s
- [ ] Extra camera shake

---

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
│       └── config/         # characters.ts
├── server/                 # Colyseus 0.15
│   └── src/
│       ├── rooms/          # GameRoom (server authoritative)
│       └── schema.ts       # PlayerSchema, ProjectileSchema
└── shared/                 # Common types
    └── src/
        ├── types/          # TypeScript interfaces
        └── constants/      # GAME_CONFIG, PHYSICS, MSG
```
