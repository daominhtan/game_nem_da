# Implementation Status - Ném Đá Online

## ✅ Completed Features

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
- [x] MenuScene (title + "Bắt Đầu" button)
- [x] CharacterSelect (grid 2x2, character stats)
- [x] GameScene (core gameplay, turn indicators, damage text, HUD)
- [x] ResultScene (Win/Lose display)

### Characters
- [x] Warrior (HP 120, Speed 180, skills: rock/big_rock/bomb/soap)
- [x] Mage (HP 80, Speed 200, skills: rock/fireball/pillow/wind_blade)
- [x] Samurai (HP 100, Speed 220, skills: rock/shuriken/wind_blade/triple_rock)
- [x] Bear (HP 150, Speed 140, skills: rock/hug_rush/honey/rock_rain)

### Skills System
- [x] 12 skill types on server (rock, big_rock, bomb, soap, pillow, fireball, wind_blade, shuriken, hug_rush, honey, rock_rain, triple_rock)
- [x] All skills with correct damage, AoE, status effects
- [x] Cooldown tracking on client
- [x] SKILL_DATA config

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

### Bug Fixes
- [x] Multi-throw spam (hasThrownThisTurn flag on server + client)
- [x] "Chơi lại" render nhân vật (scene shutdown cleanup + leaveRoom)
- [x] "Chơi lại" render lực/hướng (recreate AimSystem/ProjectileSystem in create())

### UI
- [x] Skill selection bar (bottom, colored icons, number keys 1-4, cooldown overlay)
- [x] Turn indicator (countdown bar, texto lớn giữa màn hình)
- [x] Wind indicator (icon + direction)
- [x] Damage floating text (font đỏ, bay lên, fade out)
- [x] Round indicator (best of 3 circles)

---

## 📋 Implementation Roadmap

### Phase 1: Status Effects & Polish (Current)

#### Status Effects (Server + Client) — ✅ DONE
- [x] `stunned` effect (soap hit → 2s không kiểm soát, trượt ngã)
  - Server: set statusEffect + statusDuration, block move/throw
  - Client: dizzy rotation + shake + yellow spark particles + timer countdown
- [x] `sleeping` effect (pillow hit → 2s ngủ, không làm gì được)
  - Server: set statusEffect, turn shortened to 5s
  - Client: ZZZ floating text + tint + bob animation
- [x] `slowed` effect (honey hit → 50% speed trong 3s)
  - Server: giảm moveSpeed (client-side 50% speed)
  - Client: tint xanh + trailing ice particles
- [x] UI status indicator trên đầu nhân vật (icon + timer countdown)
- [x] Turn auto-shorten (5s) when defender stunned/sleeping

#### Parallax Backgrounds
- [x] 3-layer parallax (far ×0.05, mid ×0.2, near ×0.5)
- [x] Cloud movement (3-5 đám mây trôi)
- [x] Floating dust particles (10-15 hạt bụi)
- [x] Leaf particles (rơi mỗi 3-5s)
- [ ] Wind-affected particles (bụi bay theo windForce)

#### Platform Tilemaps
- [x] Tiled JSON map support → procedural tilemap textures (2560×720)
- [x] Layer 1: Background (cây, núi, mây) → parallax far + mid layers
- [x] Layer 2: Terrain collision (đất nền, platforms)
- [x] Layer 3: Decoration (cỏ, hoa, bướm) → parallax near layer
- [x] Main ground (y=580, full width 2560px)
- [x] Floating platforms (giữa: y=450, trái: y=500, phải: y=500)
- [x] Camera bounds 0..2560, lerp follow cả 2 players
- [x] Spawn points (P1: x=800, P2: x=1760)

---

### Phase 2: Room & Matchmaking

#### Auto Match Queue
- [ ] Server matchmaking queue (joinQueue, leaveQueue)
- [ ] Auto-match khi có 2 players trong queue
- [ ] 15s timeout → tạo bot match nếu không tìm thấy người
- [ ] Queue position indicator trên client

#### Room System
- [ ] Room code generation (6 ký tự, dễ nhập: "ABCD12")
- [ ] Public/Private room toggle
- [ ] "TẠO PHÒNG" → tạo room, hiển thị code
- [ ] "THAM GIA PHÒNG" → nhập code → join
- [ ] Room states: waiting → selecting → countdown → playing → roundEnd → gameEnd
- [ ] 30s character select timer
- [ ] Ready check (cả 2 ready → countdown)
- [ ] Auto-random character nếu hết giờ chưa chọn

#### Bot System
- [ ] BotPlayer class (tính góc + power, random skill)
- [ ] Bot difficulty levels (dễ: random 0.4-0.7, khó: aim chính xác 0.8-1.0)
- [ ] Bot taunt/emoji ngẫu nhiên (tạo cảm giác người thật)
- [ ] Bot disconnect handling

#### Reconnect System
- [ ] Server detect disconnect (WebSocket close)
- [ ] 30s reconnect window
- [ ] Pause game khi có người disconnect
- [ ] Gửi full state khi reconnect thành công
- [ ] Auto-win nếu không reconnect kịp

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
