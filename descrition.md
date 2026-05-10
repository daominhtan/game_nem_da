# 🪨 GAME DESIGN DOCUMENT — NÉM ĐÁ ONLINE
### Phaser 4 + Colyseus | 2 người chơi online | Phong cách Gunny

---

## MỤC LỤC
1. [Tổng quan game](#1-tổng-quan-game)
2. [Gameplay Loop](#2-gameplay-loop)
3. [Map & Terrain](#3-map--terrain)
4. [Nhân vật (Characters)](#4-nhân-vật-characters)
5. [Hệ thống Ném & Vật lý đạn](#5-hệ-thống-ném--vật-lý-đạn)
6. [Skills & Projectiles](#6-skills--projectiles)
7. [HP & Combat](#7-hp--combat)
8. [Animations chi tiết](#8-animations-chi-tiết)
9. [Visual Effects (VFX)](#9-visual-effects-vfx)
10. [UI/HUD](#10-uihud)
11. [Âm thanh (SFX + BGM)](#11-âm-thanh-sfx--bgm)
12. [Network & Sync](#12-network--sync)
13. [Combo & Score System](#13-combo--score-system)
14. [Tính năng "Lầy"](#14-tính-năng-lầy)
15. [Luồng màn hình](#15-luồng-màn-hình)
16. [Danh sách kỹ thuật cần implement](#16-danh-sách-kỹ-thuật-cần-implement)

---

## 1. TỔNG QUAN GAME

| Mục | Nội dung |
|-----|----------|
| **Thể loại** | Turn-based artillery (ném theo lượt) |
| **Số người** | 2 người chơi online (1v1) |
| **Thời gian ván** | Best of 3 round, mỗi lượt ném có timeout riêng |
| **Góc nhìn** | Side-scroll 2D |
| **Độ phân giải** | 1280×720 (scale on mobile) |
| **Phong cách** | Cute chibi + hiệu ứng bắt mắt + hài hước |

### Mô tả cốt lõi
Hai người chơi thay nhau ném đá theo lượt (turn-based). Mỗi lượt, người đang có lượt dùng chuột kéo-thả để ngắm và ném — người còn lại chờ và được di chuyển né tránh. Đường đạn bị ảnh hưởng bởi trọng lực và gió. Người nào hạ đối thủ xuống 0 HP, hoặc còn HP nhiều hơn khi hết tổng số lượt của round, thắng round.

---

## 2. GAMEPLAY LOOP

### Luồng 1 ván đấu

```
[Màn hình chờ] → 2 người join cùng room
       ↓
[Chọn nhân vật] (30 giây, real-time, server sync)
       ↓
[Countdown 3-2-1] + hiệu ứng "FIGHT!"
       ↓
[GAMEPLAY — Turn-based, mỗi round có N lượt]
  ┌─── LƯỢT CỦA NGƯỜI A ────────────────────────────┐
  │  • Người A: ngắm + ném (timeout 15s)             │
  │  • Người B: chỉ được di chuyển né tránh          │
  │  • Đạn bay → va chạm → damage                    │
  │  • Hết timeout → tự động ném với góc hiện tại    │
  └──────────────────────────────────────────────────┘
       ↓ (đạn dừng hoặc ra ngoài màn hình)
  ┌─── LƯỢT CỦA NGƯỜI B ────────────────────────────┐
  │  • Tương tự, đổi vai                             │
  └──────────────────────────────────────────────────┘
       ↓ (lặp lại cho đến khi 1 người chết hoặc hết lượt)
[Round kết thúc] → Bảng điểm round (3 giây)
       ↓
[Round tiếp theo] (nếu chưa đủ 3 round)
       ↓
[Màn hình kết quả] → WIN/LOSE animation lớn
       ↓
[Chơi lại / Thoát]
```

### Cơ chế Turn-based chi tiết

#### Cấu trúc lượt (Turn)
- Mỗi **round** gồm tối đa **20 lượt** (10 lượt mỗi người)
- Lượt đầu tiên: random ai đi trước (server random, hiện "P1 đi trước!" / "P2 đi trước!")
- Sau mỗi lượt ném xong (đạn dừng/ra ngoài): đổi lượt ngay lập tức
- Kết thúc round khi: 1 người HP = 0, hoặc hết 20 lượt → so HP

#### Timeout tự động ném (quan trọng!)
```
Countdown timeout mỗi lượt: 15 giây

Timeline trong 1 lượt:
  0s     → Lượt bắt đầu, HUD countdown hiện "15"
  0-14s  → Người chơi ngắm, kéo chuột, chọn skill
  10s    → Cảnh báo vàng: "5 giây còn lại!"
  13s    → Cảnh báo đỏ nhấp nháy: "2... 1..."
  15s    → TIMEOUT → server tự động force throw:
             • Lấy góc ngắm hiện tại của người chơi
             • Nếu chưa kéo chuột: angle = hướng về phía địch, power = 0.5
             • Nếu đang kéo: dùng angle + power đang kéo
             • Gửi throw với skillId đang chọn
             • Hiệu ứng: "HẾT GIỜ!" + nhân vật ném luôn + sfx_timeout
```

#### Trạng thái người KHÔNG có lượt (Defender)
- **Được phép**: di chuyển trái/phải, nhảy (né đạn)
- **Không được phép**: ngắm, ném, dùng skill tấn công
- **Indicator**: border nhân vật bị dim, icon "🛡️ Đang chờ" trên đầu
- **Di chuyển**: vẫn full speed, để tạo gameplay né đạn hấp dẫn

#### Indicator lượt (Turn Indicator) — HUD
```
LƯỢT CỦA BẠN    ← text lớn giữa màn hình, hiện 1.5s khi đổi lượt
[●──────────────] countdown bar phía trên HUD
   15 → 0s       màu xanh → vàng → đỏ khi gần hết
```

#### Gió đổi mỗi lượt (không phải mỗi 10s)
- Gió thay đổi sau mỗi lượt ném xong
- Server random windForce mới: -150..+150
- Hiệu ứng "WIND CHANGED!" + icon gió animate
- Thêm chiến thuật: phải tính gió mới mỗi lần ném

#### Khi bị status effect (stun/sleep) trong lượt của mình
- Nếu trúng soap/pillow trong lượt của đối thủ và effect còn kéo dài:
  → Lượt tiếp của mình: timeout giảm còn 5s (không kiểm soát được)
  → Hiệu ứng: nhân vật lảo đảo + ném ngẫu nhiên sau 5s
  → Text: "Bị choáng! Ném tự động sau 5s..."

---

## 3. MAP & TERRAIN

### Map 1: "Đảo Hoang Vắng" (Forest Island) — map mặc định
```
[SKY BACKGROUND - mây trôi parallax]
[BIG TREE trái]         [BIG TREE phải]
 _______________________________________________
|    [Nền đất - có cỏ, bông hoa lung lay]      |
|_______________________________________________|
[Platform 1 - giữa, cao hơn]
[Platform 2 - trái]  [Platform 3 - phải]
```

**Chi tiết kỹ thuật:**
- Tilemap: Tiled JSON, kích thước 2560×720px
- Layer 1: Background (cây, núi, mây)
- Layer 2: Terrain collision (đất nền, platforms)
- Layer 3: Decoration (cỏ, hoa, bướm bay)
- Collision: Arcade physics bodies trên terrain layer
- Camera bounds: 0..2560 ngang, follow cả 2 nhân vật (lerp)

**Platforms:**
- Platform chính (nền): y=580, toàn bộ chiều ngang
- Platform giữa: x=580..700, y=450 (floating, có hiệu ứng lắc nhẹ)
- Platform trái: x=100..220, y=500
- Platform phải: x=1060..1180, y=500

**Spawn points:**
- Player 1: x=200, y=520 (bên trái)
- Player 2: x=1080, y=520 (bên phải)

**Hiệu ứng nền động:**
- Mây parallax: 3 layer mây tốc độ khác nhau (x0.1, x0.2, x0.3 so với camera)
- Lá cây rung nhẹ (CSS/tween loop sin wave)
- Bướm/chim nhỏ bay background
- Ánh nắng nhấp nháy (ánh sáng thay đổi opacity 0.8..1.0)

### Map 2: "Núi Lửa Điên" — mở khóa sau 10 ván
- Nền: dung nham chảy, màu đỏ cam
- Platforms rơi dần (sau 20 giây sẽ rơi, rebuild sau 10 giây)
- Mưa đá ngẫu nhiên từ trời (gây 5 damage nếu trúng)

### Map 3: "Đêm Huyền Bí"
- Nền tối, có sao
- Trăng lớn phát sáng
- Bóng tối che 30% màn hình — chỉ thấy quanh nhân vật mình (spotlight effect)

---

## 4. NHÂN VẬT (CHARACTERS)

### Cấu trúc data nhân vật (JSON)
```json
{
  "id": "warrior",
  "name": "Dũng Sĩ Xà Bông",
  "description": "Mạnh, chậm, thích xà phòng",
  "hp": 120,
  "moveSpeed": 180,
  "throwPowerMult": 1.1,
  "spritesheet": "char_warrior.png",
  "frameWidth": 64,
  "frameHeight": 80,
  "animations": {
    "idle": { "frames": [0,1,2,3], "frameRate": 6, "repeat": -1 },
    "run":  { "frames": [4,5,6,7,8,9], "frameRate": 12, "repeat": -1 },
    "jump": { "frames": [10,11], "frameRate": 8, "repeat": 0 },
    "aim":  { "frames": [12,13,14], "frameRate": 6, "repeat": -1 },
    "throw":{ "frames": [15,16,17], "frameRate": 16, "repeat": 0 },
    "hit":  { "frames": [18,19], "frameRate": 12, "repeat": 0 },
    "die":  { "frames": [20,21,22,23,24], "frameRate": 8, "repeat": 0 },
    "win":  { "frames": [25,26,27,28], "frameRate": 6, "repeat": -1 },
    "taunt":{ "frames": [29,30,31,32,33], "frameRate": 8, "repeat": 0 }
  },
  "hitbox": { "width": 36, "height": 64, "offsetX": 14, "offsetY": 8 },
  "skills": ["rock", "bomb", "shield"],
  "passiveEffect": "Nhận ít damage hơn 10%",
  "winQuote": "Hahaha! Tắm trước đi!",
  "loseQuote": "Để ta tắm lại cái đã..."
}
```

### 4 nhân vật launch

#### Nhân vật 1: Dũng Sĩ Xà Bông (Warrior)
- HP: 120 | Speed: 180 | màu xanh dương
- Passive: Giảm 10% damage nhận vào
- Skill đặc biệt: "Xà Bông Trượt" — ném xà bông, kẻ địch trúng bị trượt ngã, skip turn ném 2 giây
- Taunt: Giơ cục xà bông lên tự nhìn
- Câu nói: "Sạch bóng! 🫧"

#### Nhân vật 2: Phù Thủy Lười (Mage)
- HP: 80 | Speed: 200 | màu tím
- Passive: Skill cooldown giảm 20%
- Skill đặc biệt: "Ngủ Gật" — ném gối ma thuật, địch trúng ngủ 2 giây (không di chuyển/ném được)
- Taunt: Đọc sách và ngáp
- Câu nói: "Zzz... à trúng rồi à?"

#### Nhân vật 3: Samurai Tấu Hài (Samurai)
- HP: 100 | Speed: 220 | màu đỏ
- Passive: +20% damage khi HP < 30%
- Skill đặc biệt: "Chém Gió" — tạo cơn gió đẩy đạn đối thủ lệch hướng 3 giây
- Taunt: Rút kiếm nhìn bóng mình
- Câu nói: "HA-MEN! (trượt hết)"

#### Nhân vật 4: Gấu Bông Hung Hãn (Bear)
- HP: 150 | Speed: 140 | màu nâu
- Passive: Hồi 3HP/giây
- Skill đặc biệt: "Ôm Chặt" — đột ngột lao tới địch, nếu chạm thì ôm và cả hai cùng thiệt hại 30
- Taunt: Vỗ bụng phình phịch
- Câu nói: "Ôm cái nào! 🐻"

---

## 5. HỆ THỐNG NÉM & VẬT LÝ ĐẠN

### Input (kéo-thả)
```
MOUSE DOWN trên nhân vật mình:
  → Bắt đầu kéo (drag)
  → Vẽ mũi tên chỉ hướng (màu vàng, đậm dần theo lực)
  → Vẽ đường dự đoán quỹ đạo (dotted arc, 30 điểm)
  → Hiện power bar bên cạnh

MOUSE UP:
  → Tính angle = atan2(dragDY, dragDX)
  → power = clamp(dragDistance / MAX_DRAG, 0, 1)
  → Nếu power < 0.05 → bỏ qua (chống click nhầm)
  → Gửi MSG.THROW lên server
  → Play animation THROW
```

### Vật lý đường đạn (server authoritative)
```typescript
// Mỗi tick server (60fps):
proj.velocityY += GRAVITY * dtSec;   // GRAVITY = 980
proj.x += proj.velocityX * dtSec;
proj.y += proj.velocityY * dtSec;

// Gió (đổi mỗi 10 giây):
proj.velocityX += windForce * dtSec; // windForce = -150..+150
```

### Đường dự đoán quỹ đạo (client-side)
```typescript
// Vẽ 30 điểm, mỗi điểm cách nhau 0.05s giả lập
// Điểm càng xa càng nhỏ và mờ dần (opacity: 1.0 → 0.1)
// Dừng vẽ khi chạm đất (y > groundY)
// Màu: skill thường = trắng, skill đặc biệt = màu skill đó
```

### Hiển thị gió
- Icon gió ở giữa top HUD
- Mũi tên quay theo chiều gió, to nhỏ theo lực gió
- Cỏ và lá trên map nghiêng theo chiều gió
- Hạt bụi bay theo chiều gió

---

## 6. SKILLS & PROJECTILES

### Bảng skill

| Skill ID | Tên | Nhân vật | Damage | Cooldown | Mô tả |
|----------|-----|----------|--------|----------|-------|
| `rock` | Hòn Đá | Tất cả | 20 | 0.5s | Đạn cơ bản, rơi theo trọng lực |
| `big_rock` | Đá To | Warrior | 35 | 2s | Nặng hơn, rơi nhanh hơn |
| `bomb` | Bom Nổ | Tất cả | 50 | 4s | Nổ tung, AoE radius 80px |
| `soap` | Xà Bông | Warrior | 15+stun | 5s | Trúng → địch trượt 2s |
| `pillow` | Gối Ngủ | Mage | 10+sleep | 6s | Trúng → địch ngủ 2s |
| `fireball` | Cầu Lửa | Mage | 40 | 4s | Bay thẳng, không bị gió |
| `wind_blade`| Chém Gió | Samurai | 0+debuff | 8s | Tạo gió local 3s |
| `shuriken` | Phi Tiêu | Samurai | 25 | 1s | Nhanh, bị gió ảnh hưởng ít |
| `hug_rush` | Ôm Chặt | Bear | 30 (both) | 10s | Lao vào địch |
| `honey` | Mật Ong | Bear | 5+slow | 5s | Trúng → địch bị chậm 50% |
| `rock_rain` | Mưa Đá | Tất cả | 10×5 | 12s | 5 đá nhỏ rải từ trên xuống |
| `triple_rock`| Ba Đá | Tất cả | 15×3 | 3s | Ném 3 hòn đá fan ra |

### Chi tiết từng projectile

#### `rock` (Đá thường)
- Sprite: hòn đá xám, xoay liên tục 360°/s
- Particle trail: bụi nhỏ màu xám (opacity 0.3, tắt dần)
- Va chạm: hiệu ứng bụi nổ + rung màn hình nhẹ (intensity: 2, duration: 150ms)
- Âm thanh: `sfx_rock_fly` + `sfx_rock_hit`

#### `bomb` (Bom)
- Sprite: bom đen có tim cháy (animate tim cháy ngắn dần)
- Timer hiển thị trên bom (đếm ngược 2s)
- Nổ: vòng lửa bán kính 80px, particle lửa + khói
- AoE damage: 50 nếu tâm, 25 nếu rìa (distance falloff)
- Rung màn hình mạnh (intensity: 8, duration: 400ms)
- Âm thanh: `sfx_bomb_fly`, `sfx_bomb_explode` (bass nặng)

#### `soap` (Xà Bông Trượt)
- Sprite: cục xà bông trắng, có bọt bay ra liên tục
- Particle: bong bóng xà phòng cầu vồng nhỏ
- Trúng địch: địch bị animation SLIDE (trượt liên tục 2s, không kiểm soát)
- Âm thanh: `sfx_soap_squeak` (tiếng cút kít vui nhộn)

#### `bomb` AoE check (server):
```typescript
// Khi bom nổ tại (bx, by):
for (const player of alivePlayers) {
  const dist = distance(bx, by, player.x, player.y);
  if (dist < 80) {
    const damage = 50 * (1 - dist/80); // falloff
    player.hp -= damage;
  }
}
```

---

## 7. HP & COMBAT

### HP System
- HP hiển thị: thanh HP trên đầu nhân vật + thanh HP lớn ở HUD
- HP animate: tụt xuống mượt mà (tween 0.5s) khi mất máu
- Màu thanh HP:
  - 100% → 60%: Xanh lá (#22dd22)
  - 60% → 30%: Cam (#ffaa00)
  - 30% → 0%: Đỏ nhấp nháy (#ff2222, blink 0.5s)
- Khi HP < 30%: nhân vật hiện hiệu ứng khói nhẹ (bị thương)

### Nhận sát thương
```
1. Server xác nhận va chạm → gửi event HIT đến cả 2 client
2. Client victim:
   a. Flash trắng nhân vật (tint 0xffffff, 0.1s rồi về bình thường)
   b. Knockback: đẩy lùi 50px theo hướng đạn bay tới (tween 0.15s)
   c. Play animation "hit" (2 frame)
   d. Hiện damage text bay lên (+font đỏ đậm, scale up rồi fade out)
   e. Rung màn hình (camera shake)
   f. Phát sfx_hit
3. Nếu HP = 0:
   a. Play animation "die" (ngã xuống, kịch tính)
   b. Hiện ký hiệu ★ hoặc 💀 trên đầu
   c. Nhân vật chìm xuống đất (tween y+100)
   d. Sau 2s: respawn (nếu còn round)
```

### Damage Numbers (floating text)
```typescript
// Spawn tại vị trí trúng đòn:
const dmgText = scene.add.text(x, y, `-${damage}`, {
  fontSize: "28px",
  color: "#ff3333",
  fontStyle: "bold",
  stroke: "#000",
  strokeThickness: 4,
});
scene.tweens.add({
  targets: dmgText,
  y: y - 80,         // bay lên 80px
  alpha: 0,
  scaleX: 1.5,       // phình to rồi mờ
  scaleY: 1.5,
  duration: 1200,
  ease: "Power2",
  onComplete: () => dmgText.destroy(),
});
```

### Critical Hit (20% chance)
- Damage × 1.5
- Text màu vàng + lớn hơn + icon ⚡ kèm theo
- SFX đặc biệt: `sfx_critical`
- Hiệu ứng màn hình: flash vàng 0.1s

---

## 8. ANIMATIONS CHI TIẾT

### Tất cả animation states của nhân vật

| State | Trigger | Mô tả | Loop |
|-------|---------|-------|------|
| `idle` | Đứng yên | Thở lên xuống nhẹ, chớp mắt | Yes |
| `run` | Nhấn A/D hoặc ←/→ | Chạy bước chân, tóc bay | Yes |
| `jump` | Nhấn Space | Nhảy lên, thu chân | No |
| `fall` | Sau đỉnh jump | Rơi xuống, tóc bay lên | Yes |
| `land` | Chạm đất | Landing squash (squish nhanh) | No (→ idle) |
| `aim` | Đang kéo chuột | Tay giơ lên ngắm, người hơi cúi | Yes |
| `throw` | Nhả chuột | Vung tay ném mạnh | No (→ idle) |
| `hit` | Trúng đòn | Giật lùi, mặt nhăn | No (→ idle) |
| `die` | HP = 0 | Ngã xuống kịch tính | No (stay) |
| `win` | Thắng round | Nhảy múa ăn mừng | Yes |
| `lose` | Thua round | Cúi đầu, khóc | Yes |
| `taunt` | Nhấn T | Animation riêng từng nhân vật | No |
| `stunned` | Trúng soap | Đi vòng tròn lảo đảo (★★★) | Yes (duration) |
| `sleeping` | Trúng pillow | Ngủ gật ZZZ | Yes (duration) |
| `slide` | Trúng xà bông | Trượt té không kiểm soát | Yes (duration) |

### Squash & Stretch (tạo cảm giác vui nhộn)
```typescript
// Khi nhảy:
onJumpStart: scaleX = 0.8, scaleY = 1.2 (squish)
onPeak:      scaleX = 1.0, scaleY = 1.0
onLand:      scaleX = 1.3, scaleY = 0.7 (squash) → tween về 1,1 trong 0.15s

// Khi ném:
onThrow:     scaleX = 1.2, scaleY = 0.9 (windup) → 0.9, 1.1 (release) → 1,1

// Khi trúng đòn:
onHit:       scaleX = 1.4, scaleY = 0.7 → tween về 1,1 trong 0.2s
```

### Parallax trong màn hình game
- Background xa: tốc độ × 0.05 theo camera
- Mid background: × 0.2
- Cây gần: × 0.5
- Nhân vật: × 1.0 (normal)

### Idle animation chi tiết
- Thở: tween scaleY 1.0 → 1.03 → 1.0, loop mỗi 2s
- Chớp mắt: frame đặc biệt mỗi 3-5s (random)
- Lá tóc/áo: sin wave nhẹ theo thời gian

---

## 9. VISUAL EFFECTS (VFX)

### Particle Systems

#### Khi đạn bay
```typescript
// Rock trail:
emitter = scene.add.particles(0, 0, "fx_spark", {
  follow: rockSprite,
  speed: { min: 10, max: 30 },
  angle: { min: 160, max: 200 },  // phía sau
  scale: { start: 0.3, end: 0 },
  alpha: { start: 0.6, end: 0 },
  lifespan: 200,
  quantity: 2,
  tint: [0xcccccc, 0xaaaaaa],
});

// Bomb trail (lửa + khói):
emitter_fire = particles("fx_fire") { tint: 0xff6600, lifespan: 300, quantity: 3 }
emitter_smoke = particles("fx_smoke") { tint: 0x555555, lifespan: 500, quantity: 1 }
```

#### Khi đạn nổ/va chạm
```typescript
// Rock hit dust:
{ texture: "fx_dust", quantity: 8, speed: 80..150, angle: 0..360,
  scale: 0.5..1.2, lifespan: 400, gravityY: 300 }

// Bomb explosion:
// Layer 1: flash trắng tròn (scale 0→3, alpha 1→0, duration 300ms)
// Layer 2: particles lửa (quantity: 20, speed: 100..300, tint: 0xff4400..0xffcc00)
// Layer 3: particles khói (quantity: 10, speed: 40..80, tint: 0x555555, lifespan: 1000)
// Layer 4: debris (3-5 mảnh đá nhỏ bay ra với gravity)
// Camera shake: intensity 8, duration 400ms
```

#### Hiệu ứng trúng đòn nhân vật
```typescript
// Hit spark:
{ texture: "fx_star", quantity: 5, speed: 60..120, lifespan: 300,
  tint: [0xffff00, 0xff8800, 0xffffff] }

// Nhân vật flash trắng:
victim.setTint(0xffffff);
scene.time.delayedCall(100, () => victim.clearTint());
```

#### Hiệu ứng đặc biệt

**Soap (xà bông):**
- Bong bóng cầu vồng bay ra liên tục khi đang fly
- Khi trúng: bong bóng vỡ + ngôi sao quay quanh đầu địch
- Màu sắc: gradient 7 màu cầu vồng

**Bomb:**
- Shockwave ring: vòng tròn trắng mở rộng nhanh (scale 0→5, alpha 1→0, 300ms)
- Screen flash: toàn màn hình flash trắng 0.1s
- Debris: 4-6 mảnh vỡ văng với physics gravity

**Critical hit:**
- Lightning bolt effect tại điểm trúng
- Screen flash vàng 0.1s
- Extra camera shake

### Camera Effects
```typescript
// Khi trúng đòn thường:
camera.shake(150, 0.003);

// Khi bom nổ:
camera.shake(400, 0.008);

// Khi nhân vật chết:
camera.shake(200, 0.005);

// Slow motion khi crit:
scene.time.timeScale = 0.3; // chậm 0.3s
scene.time.delayedCall(300, () => scene.time.timeScale = 1.0);
```

### Hiệu ứng môi trường liên tục
- **Floating dust**: 10-15 hạt bụi nhỏ bay lơ lửng trên màn hình
- **Leaf particles**: lá vàng rơi từ cây (mỗi 3-5s spawn 1 lá)
- **Cloud movement**: 3-5 đám mây chậm rãi trôi
- **Gió thấy được**: hạt bụi bay theo chiều windForce

---

## 10. UI/HUD

### Layout HUD (luôn ở top layer, không scroll)

```
┌─────────────────────────────────────────────────┐
│  [P1 Avatar] [═══════HP═══   ] [HP số]  TIMER  [HP số] [   ══HP══════] [P2 Avatar] │
│  [Tên P1]    [SKILL 1][2][3]    [WIND→]         [SKILL 1][2][3]         [Tên P2]   │
│  [ROUND ●○○]                                                    [ROUND ○○●]         │
└─────────────────────────────────────────────────┘
```

### HP Bar chi tiết
```typescript
// Thanh HP với animation mượt mà
// Có 2 lớp: lớp xanh (HP thật) + lớp vàng (HP vừa mất, tụt chậm hơn)
// Tạo hiệu ứng "afterburn" rất đẹp

const hpBarGreen = scene.add.graphics();  // HP hiện tại
const hpBarYellow = scene.add.graphics(); // HP vừa mất (lag 0.5s)

// Update:
onHpChange(newHp) {
  // Green bar: update ngay
  hpBarGreen.fillRect(0, 0, (newHp/maxHp) * BAR_WIDTH, 12);
  
  // Yellow bar: delay 0.5s rồi tween xuống
  scene.time.delayedCall(500, () => {
    scene.tweens.add({
      targets: yellowBarValue,
      value: newHp/maxHp,
      duration: 600,
      ease: "Power2",
      onUpdate: () => redrawYellowBar()
    });
  });
}
```

### Skill Icons HUD
```
[ICON][CD]  hiện cooldown countdown
[1]   khi ready: sáng + bounce nhẹ
[1]   khi cooldown: tối + vòng tròn đếm ngược
```

```typescript
// Cooldown hiệu ứng:
// Vẽ arc từ đỉnh, màu xám, che phủ icon theo % cooldown còn lại
graphics.fillStyle(0x000000, 0.6);
graphics.slice(cx, cy, radius, startAngle, endAngle);

// Khi cooldown xong: icon bounce lên xuống + flash xanh nhẹ
scene.tweens.add({
  targets: skillIcon,
  y: skillIcon.y - 5,
  duration: 100,
  yoyo: true,
  repeat: 2,
});
```

### Timer HUD
- Số đếm ngược lớn ở giữa trên
- Khi < 10 giây: đỏ + to dần + blink + sfx tick
- Khi = 0: hiệu ứng TIME'S UP! lớn giữa màn hình

### Wind Indicator
```
[← ═══ ●] nhẹ    [← ══════ ●] mạnh
[● ═══ →] nhẹ    [● ══════ →] mạnh
```
- Cập nhật mỗi 10s với animation tween
- Hạt bụi nhỏ bay theo chiều gió trên HUD

### Round Indicator
- 3 vòng tròn (best of 3)
- Win: vòng filled + màu team
- Lose: vòng empty

### Damage Feed (góc trên)
```
[💥 Player1 → Player2: 35 damage]
[⚡ CRITICAL HIT! 52 damage]
```
- Log 3 dòng gần nhất, fade out sau 3s

---

## 11. ÂM THANH (SFX + BGM)

### Background Music
| File | Scene | Mô tả |
|------|-------|-------|
| `bgm_lobby.ogg` | Menu | Vui tươi, bắt tai |
| `bgm_game_forest.ogg` | Map Forest | Năng động, hơi hài hước |
| `bgm_game_volcano.ogg` | Map Volcano | Căng thẳng, sôi động |
| `bgm_result_win.ogg` | Thắng | Khải hoàn, ngắn |
| `bgm_result_lose.ogg` | Thua | Buồn hài hước |

### Sound Effects
| ID | Mô tả | Ghi chú |
|----|-------|---------|
| `sfx_throw_rock` | Vụt nhẹ | Khi ném đá |
| `sfx_rock_fly` | Tiếng gió nhẹ | Loop khi đá bay |
| `sfx_rock_hit_ground` | Bụm | Đá trúng đất |
| `sfx_rock_hit_player` | Boink vui | Trúng người |
| `sfx_bomb_fuse` | Xì xì | Khi bom bay |
| `sfx_bomb_explode` | BOOM nặng | Nổ bom |
| `sfx_soap_squeak` | Cút kít | Xà bông |
| `sfx_soap_hit` | Ploop | Xà bông trúng |
| `sfx_pillow_hit` | Poof | Gối trúng |
| `sfx_snore` | Khò khò | Đang ngủ |
| `sfx_hit_light` | Ugh | Đòn nhẹ |
| `sfx_hit_heavy` | Ooof | Đòn nặng |
| `sfx_critical` | CRACK! + jingle | Critical hit |
| `sfx_die` | Dramatic plop | Chết |
| `sfx_win_jingle` | Ta-da! | Thắng |
| `sfx_countdown_tick` | Tick | Đếm ngược |
| `sfx_fight` | Voice: "FIGHT!" | Bắt đầu |
| `sfx_jump` | Boing | Nhảy |
| `sfx_land` | Thud nhẹ | Đáp xuống |
| `sfx_taunt_warrior` | "Sạch bóng!" | Taunt W |
| `sfx_taunt_mage` | Ngáp to | Taunt M |
| `sfx_wind` | Whoosh | Gió thổi |
| `sfx_ui_click` | Click nhẹ | Button |
| `sfx_ui_hover` | Tick nhẹ | Hover |

### Audio Manager
```typescript
class AudioManager {
  // Spatial audio: volume giảm theo khoảng cách đến màn hình
  playSfxAt(key: string, x: number, y: number) {
    const dist = Math.abs(x - SCREEN_CENTER_X);
    const vol  = Math.max(0.1, 1 - dist/800);
    const pan  = Phaser.Math.Clamp((x - SCREEN_CENTER_X) / 400, -1, 1);
    this.scene.sound.play(key, { volume: vol });
    // Note: Phaser 4 hỗ trợ Web Audio API panning
  }
}
```

---

## 12. NETWORK & SYNC

### State được sync qua Colyseus

```typescript
// Server Schema (Colyseus @Schema):
class PlayerSchema extends Schema {
  @type("string")  id: string;
  @type("string")  name: string;
  @type("string")  characterId: string;
  @type("float32") x: number;
  @type("float32") y: number;
  @type("float32") velocityX: number;
  @type("float32") velocityY: number;
  @type("uint16")  hp: number;
  @type("uint16")  maxHp: number;
  @type("string")  animState: string;  // "idle","run","jump","aim","throw","hit","die"
  @type("boolean") facingLeft: boolean;
  @type("string")  statusEffect: string; // "","stunned","sleeping","sliding"
  @type("float32") statusDuration: number;
  @type("uint8")   kills: number;
  @type("uint8")   deaths: number;
  @type("boolean") isAlive: boolean;
}

class ProjectileSchema extends Schema {
  @type("string")  id: string;
  @type("string")  ownerId: string;
  @type("string")  type: string;
  @type("float32") x: number;
  @type("float32") y: number;
  @type("float32") velocityX: number;
  @type("float32") velocityY: number;
  @type("float32") rotation: number;
}

class GameRoomSchema extends Schema {
  @type("string")  phase: string;  // "waiting","selecting","countdown","playing","roundEnd","gameEnd"
  @type("uint8")   timeLeft: number;
  @type("int8")    windForce: number;  // -150..150
  @type("string")  mapId: string;
  @type("uint8")   p1RoundsWon: number;
  @type("uint8")   p2RoundsWon: number;
  @type({ map: PlayerSchema })     players: MapSchema<PlayerSchema>;
  @type({ map: ProjectileSchema }) projectiles: MapSchema<ProjectileSchema>;
}
```

### Client-Side Prediction & Interpolation
```typescript
// Nhân vật địch: interpolate vị trí để mượt
// Không dùng vị trí server trực tiếp mà lerp dần
onServerStateChange(serverState) {
  const enemy = players.get(opponentId);
  enemy.targetX = serverState.x;
  enemy.targetY = serverState.y;
  enemy.targetAnimState = serverState.animState;
}

// Mỗi frame:
update() {
  enemy.sprite.x += (enemy.targetX - enemy.sprite.x) * 0.15; // lerp factor
  enemy.sprite.y += (enemy.targetY - enemy.sprite.y) * 0.15;
  
  // Anim chỉ đổi khi state thật sự khác
  if (enemy.currentAnim !== enemy.targetAnimState) {
    enemy.sprite.play(enemy.targetAnimState, true);
    enemy.currentAnim = enemy.targetAnimState;
  }
}
```

### Messages (Client → Server)

```typescript
// Di chuyển (gửi mỗi frame nếu có thay đổi)
room.send("move", { x, y, velocityX, velocityY, facingLeft, animState });

// Ném
room.send("throw", { angle: number, power: number, skillId: string });

// Taunt
room.send("taunt");

// Sẵn sàng (character select)
room.send("ready", { characterId: string });

// Chat (emoji only, không text)
room.send("emoji", { emoji: "😂" | "😡" | "👍" | "💀" | "🔥" });
```

### Messages (Server → Client)

```typescript
// Sự kiện quan trọng gửi thêm ngoài state:
room.broadcast("hit", { targetId, damage, isCritical, projectileType });
room.broadcast("death", { targetId, killerId });
room.broadcast("roundEnd", { winnerId, p1Hp, p2Hp });
room.broadcast("gameEnd", { winnerId, p1Score, p2Score });
room.broadcast("windChange", { force: number, direction: string });
room.broadcast("emoji", { senderId, emoji: string });
```

### Latency Handling
- Target: < 100ms latency
- Nếu > 200ms: hiện indicator "📶 Mạng yếu"
- Projectile client-side: vẽ ngay khi người chơi mình ném (không chờ server echo)
  nhưng vẫn để server làm trọng tài collision
- Nếu server disagree với client (position quá lệch > 50px): snap về server position

---

## 13. COMBO & SCORE SYSTEM

### Combo
- Gây damage 2 lần trong 3 giây = COMBO x2 (damage × 1.1)
- 3 lần = COMBO x3 (damage × 1.2) + hiệu ứng đặc biệt
- Text "COMBO x3!" bay lên giữa màn hình

### Điểm trong round
- Mỗi damage 1 = 1 điểm
- Kill: +100 điểm bonus
- Critical: +20 điểm bonus
- Hiển thị điểm realtime góc dưới

### Kết quả
- Thắng round: HP còn nhiều hơn khi hết giờ, hoặc kill địch
- Best of 3: ai thắng 2 round trước thắng game
- Nếu hòa round (cùng HP): sudden death 20s

---

## 14. TÍNH NĂNG "LẦY"

### Emoji System (Quick Reaction)
- 4 phím tắt: Z/X/C/V → tương ứng 4 emoji
- Emoji hiện nổi bự trên đầu nhân vật 2s
- Preset emoji: 😂 😡 👍 💀 🔥 😭 🤡 👻
- Gửi lên server, cả 2 đều thấy
- Cooldown 3s/lần (chống spam)

### Taunt Animations (nhấn T)
- Mỗi nhân vật có taunt riêng với SFX riêng
- Trong lúc taunt có thể bị đánh (punishable) → cố ý thiết kế để "lầy" nhau

### Tên ngẫu nhiên hài hước (nếu không điền tên)
```
["Bé Ném Đá", "Siêu Nhân Không Nhà", "Gấu Bông Điên",
 "Đá Bay Về Quê", "Thảm Họa Quốc Gia", "Pro Never Die",
 "Lag Thắng Skill", "Giật Mình Té Ngã", ...]
```

### Câu thoại khi thắng/thua (hiện bubble trên nhân vật)
- Random 1 trong 5 câu mỗi nhân vật
- Font vui, có icon
- Hiển thị 3s sau khi kết thúc

### "Nhục Nhã" Combo
- Nếu thắng với margin > 80% HP còn lại: hiện banner "THẢM BẠI!" với confetti
- Nếu cả 2 cùng chết (last đòn cùng lúc): "CÙNG CHẾT LOL!" + explosion cả 2

### Easter Egg
- Nếu ném đá 3 lần liên tiếp trượt hết: nhân vật tự nhìn tay mình, lắc đầu
- Nếu 2 người cùng ném đúng lúc và 2 đá chạm nhau giữa không trung: nổ nhỏ + "PING!" + cả 2 đá rơi xuống

---

## 15. LUỒNG MÀN HÌNH

### MenuScene
- Nền animated (parallax)
- Logo game + tagline hài hước
- Nút "CHƠI NGAY" (auto match) + "TẠO PHÒNG" + "THAM GIA PHÒNG"
- Nhân vật demo idle animation ở hai bên logo

### CharacterSelectScene
- 2 panel (P1 trái, P2 phải)
- Grid 2×2 nhân vật, có preview animation
- Stats bar: HP, Speed, Power
- "READY" button — cả 2 ready → countdown bắt đầu
- Timer 30s, nếu không chọn → random character

### GameScene (core gameplay — xem các section trên)

### ResultScene
- Winner hiện animation WIN lớn giữa màn hình
- Loser hiện animation LOSE nhỏ một góc
- Bảng stats: damage dealt/received, kills, accuracy %
- Nút: "ROUND TIẾP" / "CHƠI LẠI" / "VỀ MENU"
- Confetti mưa nếu thắng

---

## 16. DANH SÁCH KỸ THUẬT CẦN IMPLEMENT

### Priority 1 — Core (implement trước)
- [ ] Tilemap load + collision (Phaser 4 Arcade)
- [ ] Player movement (keyboard, server sync)
- [ ] Aim system (kéo chuột + vẽ trajectory)
- [ ] Projectile spawn + physics (server authoritative)
- [ ] HP system + damage + floating text
- [ ] Colyseus room + state sync
- [ ] Basic animations (idle/run/throw/hit/die)

### Priority 2 — Polish
- [ ] Squash & stretch animations
- [ ] Particle system (trails, explosions, dust)
- [ ] Camera shake + slow motion
- [ ] HP bar with afterburn effect
- [ ] Wind system
- [ ] Sound effects + BGM
- [ ] Skill cooldown UI

### Priority 3 — Content
- [ ] 4 nhân vật với skills riêng
- [ ] 3 maps
- [ ] Character select screen
- [ ] Emoji system
- [ ] Taunt animations
- [ ] Status effects (stun, sleep, slide)

### Priority 4 — Fun Features
- [ ] Combo system
- [ ] Critical hits + slow motion
- [ ] Easter eggs
- [ ] Win/lose quotes
- [ ] Confetti
- [ ] Random funny names

---

## 17. ROOM & MATCHMAKING

### Luồng tạo/join phòng

```
[MenuScene]
  ├── "CHƠI NGAY" → Auto match (tìm phòng ngẫu nhiên)
  ├── "TẠO PHÒNG" → Tạo room private/public, nhận room code
  └── "THAM GIA PHÒNG" → Nhập room code → join room cụ thể
```

### Auto Match (CHƠI NGAY)

```typescript
// Client gửi yêu cầu match:
room.send("joinQueue", { characterId: string });

// Server duy trì queue:
class MatchmakingQueue {
  private queue: Array<{ sessionId: string, characterId: string, joinedAt: number }> = [];

  // Mỗi khi có người vào queue:
  onPlayerJoin(player) {
    this.queue.push(player);
    if (this.queue.length >= 2) {
      const p1 = this.queue.shift()!;
      const p2 = this.queue.shift()!;
      this.createMatch(p1, p2);
    }
  }

  // Timeout: nếu sau 15s không tìm được đối thủ → tạo phòng với bot
  onQueueTimeout(player) {
    if (stillInQueue(player)) {
      this.createBotMatch(player);
    }
  }
}
```

### Trạng thái phòng

| State | Mô tả | Actions |
|-------|-------|---------|
| `waiting` | Chờ người chơi thứ 2 | Hiển thị room code, chờ join |
| `selecting` | Cả 2 đã vào, đang chọn nhân vật | Timer 30s, ready check |
| `countdown` | Đếm ngược 3-2-1 FIGHT | Mọi người đã lock character |
| `playing` | Đang trong trận | Turn-based gameplay |
| `paused` | Tạm dừng (disconnect) | Chờ reconnect 30s |
| `roundEnd` | Kết thúc 1 round | Show round summary 5s |
| `gameEnd` | Kết thúc trận đấu | Show result screen |

### Xử lý disconnect / reconnect

```typescript
// Server:
class GameRoom {
  onPlayerDisconnect(sessionId) {
    const player = this.players.get(sessionId);
    if (!player) return;

    // Nếu đang ở màn hình chờ hoặc chọn nhân vật:
    if (this.state.phase === "waiting" || this.state.phase === "selecting") {
      this.broadcast("playerLeft", { playerId: player.id });
      this.state.phase = "waiting";
      return;
    }

    // Nếu đang chơi dở:
    player.disconnectedAt = Date.now();
    player.isDisconnected = true;
    this.state.phase = "paused";
    this.broadcast("playerDisconnected", {
      playerId: player.id,
      reconnectTimeout: 30,
    });

    // Chờ reconnect 30s:
    this.clock.setTimeout(() => {
      if (player.isDisconnected) {
        // Không reconnect kịp → người kia thắng
        this.endGame(player.isDisconnected ? opponentId : player.id);
      }
    }, 30000);
  }

  onPlayerReconnect(sessionId, newSessionId) {
    const player = this.players.get(sessionId);
    if (!player) return;

    player.isDisconnected = false;
    player.disconnectedAt = 0;
    this.state.phase = "playing";

    // Gửi full state hiện tại cho player reconnect
    this.sendFullState(newSessionId);

    this.broadcast("playerReconnected", { playerId: player.id });
  }
}
```

### Cấu trúc Room trên server

```typescript
// Mỗi phòng là 1 Colyseus Room instance
import { Room, Client } from "colyseus";

class GameRoom extends Room<GameRoomSchema> {
  maxClients = 2;
  roomCode: string;     // 6 ký tự, dễ nhập
  isPublic: boolean;     // true = auto match, false = private

  onCreate(options: { isPublic: boolean }) {
    this.roomCode = generateRoomCode(); // "ABCD12"
    this.isPublic = options.isPublic;
    this.setState(new GameRoomSchema());
    this.state.phase = "waiting";
  }

  onJoin(client: Client, options: { characterId?: string }) {
    if (this.clients.length === 1) {
      // Người đầu tiên: set làm P1
      this.state.phase = "waiting";
    } else if (this.clients.length === 2) {
      // Đủ 2 người: chuyển sang selecting
      this.state.phase = "selecting";
      this.state.timeLeft = 30;
      // Bắt đầu timer chọn nhân vật
      this.clock.setTimeout(() => this.onSelectTimeout(), 30000);
    }
  }

  onLeave(client: Client) {
    this.handleDisconnect(client.sessionId);
  }
}
```

### Bot (khi không tìm được người)

```typescript
class BotPlayer {
  // Bot đơn giản:
  // 1. Tính góc ngắm về phía địch
  // 2. Tính lực ném (random 0.6..0.9)
  // 3. Có 30% chance dùng skill đặc biệt
  // 4. Có 10% chance dùng taunt (để tạo cảm giác "người thật")
  
  getBotAction(enemyPos: { x: number, y: number }): BotAction {
    const angle = Math.atan2(
      enemyPos.y - this.y,
      enemyPos.x - this.x
    );
    const power = 0.6 + Math.random() * 0.3;
    const skillId = Math.random() < 0.3
      ? this.getRandomSkill()
      : "rock";
    
    return { angle, power, skillId };
  }
}
```

---

## 18. MOBILE SUPPORT

### Responsive Scaling Strategy

```typescript
// Game được thiết kế ở 1280×720, scale xuống mobile
// Dùng Phaser 4 Scale Manager với FIT mode:

const config: Phaser.Types.Core.GameConfig = {
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // ...
};
```

### Touch Controls

#### Aiming (Ngắm bắn)

```
Trên mobile: thay vì kéo-thả chuột, dùng touch-drag
  TOUCH START → bắt đầu ngắm (vẽ trajectory)
  TOUCH MOVE  → cập nhật angle + power
  TOUCH END   → ném

Vị trí touch trên màn hình:
  - Touch bắt đầu từ vị trí nhân vật hoặc bất kỳ đâu
  - Kéo từ điểm touch đến vị trí hiện tại
  - Hướng ngược: từ nhân vật đến điểm touch

Joystick ảo cho di chuyển:
  - Bên trái màn hình: joystick di chuyển (trái/phải)
  - Vuốt lên: nhảy
  - Bên phải màn hình: dùng để ngắm/ném
```

#### Virtual Joystick

```typescript
class VirtualJoystick {
  // Hiển thị khi touch vào 1/3 trái màn hình
  // Base: vòng tròn trong suốt opacity 0.3
  // Thumb: chấm trắng di chuyển trong base
  
  baseX: number;
  baseY: number;
  thumbX: number;
  thumbY: number;
  radius: number = 60;
  
  onTouchMove(pointer: Phaser.Input.Pointer) {
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), this.radius);
    const angle = Math.atan2(dy, dx);
    
    this.thumbX = this.baseX + Math.cos(angle) * dist;
    this.thumbY = this.baseY + Math.sin(angle) * dist;
    
    // Trả về hướng di chuyển (normalized)
    return {
      horizontal: dist > 20 ? Math.cos(angle) * (dist / this.radius) : 0,
      vertical: dist > 20 ? Math.sin(angle) * (dist / this.radius) : 0,
    };
  }
}
```

#### Skill Buttons

```
Mobile layout (bottom của màn hình):
┌──────────────────────────────────┐
│                                  │
│                                  │
│                                  │
│                                  │
│  [Joystick]             [Skill1] │
│                        [Skill2] │
│                        [Skill3] │
│  [Move]                [Taunt]  │
│  [Jump]                [Emoji]  │
└──────────────────────────────────┘

- Skill buttons: to hơn (64×64px), có touch feedback
- Khoảng cách giữa các button tối thiểu 16px (tránh touch miss)
```

### UI Adaptations cho Mobile

| Element | Desktop | Mobile |
|---------|---------|--------|
| HP Bar | 200px | 120px (scale xuống) |
| Skill Icons | 48×48 | 56×56 (dễ bấm) |
| Timer | Font 48px | Font 36px |
| Damage Text | Font 28px | Font 22px |
| Button size | 32px height | 44px height (touch target) |
| Damage Feed | Góc trên phải | Góc trên trái (dễ đọc) |

### Portrait Mode Detection

```typescript
// Phát hiện xoay dọc → cảnh báo
class OrientationManager {
  checkOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    if (!isLandscape) {
      // Hiển thị overlay "Xoay ngang màn hình để chơi!"
      this.showRotateOverlay();
    } else {
      this.hideRotateOverlay();
    }
  }
}
```

### Performance tối ưu trên mobile

```typescript
// Giảm particle trên mobile:
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const particleConfig = {
  quantity: isMobile ? 2 : 5,         // Giảm 60% particle
  lifespan: isMobile ? 150 : 300,
};

// Giảm quality shadow/physics:
if (isMobile) {
  scene.physics.world.setFPS(30);    // Physics tick 30fps thay vì 60
  scene.renderer.setTextureBias(2);  // Texture mipmap lower quality
}

// Tắt parallax layer xa trên mobile yếu:
if (isMobile && devicePerformance === "low") {
  bgLayerFar.setVisible(false);
}
```

### Touch Gesture Map

| Gesture | Khu vực | Action |
|---------|---------|--------|
| Single tap | 1/3 trái màn hình | Di chuyển đến chạm |
| Touch & hold + drag | 1/3 trái | Joystick di chuyển |
| Touch & drag | 2/3 phải | Ngắm (kéo-thả) |
| Tap skill icon | Góc dưới phải | Chọn skill |
| Double tap | Bất kỳ | Taunt |
| Swipe up | Toàn màn hình | Jump |
| Long press | Trên nhân vật địch | Xem thông tin |

---

## 19. ERROR HANDLING & EDGE CASES

### Network Errors

```typescript
class NetworkErrorHandler {
  // Các loại lỗi network cần xử lý:
  
  // 1. Mất kết nối (WebSocket disconnect)
  onDisconnect() {
    // Lưu state hiện tại vào cache
    this.cacheState();
    
    // Hiển thị overlay "ĐANG KẾT NỐI LẠI..."
    this.showReconnectOverlay();
    
    // Tự động reconnect mỗi 2s, tối đa 15 lần
    this.attemptReconnect({
      maxRetries: 15,
      retryInterval: 2000,
      onSuccess: () => {
        this.hideReconnectOverlay();
        this.syncFullState();
      },
      onFail: () => {
        this.showDisconnectScreen();
        // Cho phép người chơi về menu
      },
    });
  }

  // 2. Timeout request
  onRequestTimeout(action: string, timeout: number = 5000) {
    console.warn(`Request timeout: ${action}`);
    // Retry 1 lần
    if (!this.retryTracker[action]) {
      this.retryTracker[action] = true;
      this.retryRequest(action);
    } else {
      this.showError(`Không thể ${action}. Vui lòng thử lại.`);
    }
  }

  // 3. Server error response
  onServerError(code: string, message: string) {
    switch (code) {
      case "ROOM_FULL":
        this.showToast("Phòng đã đầy! 😅");
        break;
      case "INVALID_MOVE":
        // Silent ignore (có thể do lag/duplicate)
        break;
      case "GAME_ALREADY_STARTED":
        this.showToast("Trận đấu đã bắt đầu!");
        break;
      case "RATE_LIMIT":
        this.showToast("Chậm thôi bạn ơi! ⏰");
        break;
      default:
        console.error("Server error:", code, message);
        this.showToast("Có lỗi xảy ra! Mã: " + code);
    }
  }
}
```

### Edge Cases trong Gameplay

```typescript
// 1. Cả 2 cùng chết trong 1 lượt (đòn AoE)
handleBothDeath() {
  // Server kiểm tra: nếu cả 2 HP <= 0 sau 1 lượt
  if (p1.hp <= 0 && p2.hp <= 0) {
    // Tính damage chính xác, ai chết trước
    if (p1.damageTick < p2.damageTick) {
      // P1 chết trước → P2 thắng
      this.endRound(p2.id);
    } else if (p2.damageTick < p1.damageTick) {
      this.endRound(p1.id);
    } else {
      // Cùng lúc → hòa, cả 2 được 1 điểm round
      this.state.p1RoundsWon += 1;
      this.state.p2RoundsWon += 1;
      this.broadcast("roundEnd", { 
        winnerId: "draw", 
        message: "CÙNG CHẾT LOL! 💥" 
      });
    }
  }
}

// 2. Người chơi ở ngoài map (rơi xuống)
handleFallOutOfMap(player) {
  if (player.y > MAP_BOTTOM_BOUNDARY) {
    player.hp = 0;
    player.isAlive = false;
    this.broadcast("death", { 
      targetId: player.id, 
      killerId: "fall", 
      message: "Rơi xuống vực! 💀" 
    });
  }
}

// 3. Đạn bay mãi không dừng (never hit ground)
handleProjectileStuck(projectile) {
  // Nếu đạn bay quá 10s hoặc ra khỏi map bounds
  if (projectile.lifetime > 10000 || 
      projectile.x < -500 || projectile.x > 3500 ||
      projectile.y < -500 || projectile.y > 1500) {
    this.removeProjectile(projectile.id);
    this.endTurn();
  }
}

// 4. Double input (người chơi gửi 2 throw cùng lúc)
handleDoubleThrow(sessionId) {
  const lastThrowTime = this.playerLastThrow.get(sessionId) || 0;
  const now = Date.now();
  
  if (now - lastThrowTime < 100) {
    // Bỏ qua throw thứ 2 (anti-spam)
    console.warn(`Double throw from ${sessionId}`);
    return;
  }
  this.playerLastThrow.set(sessionId, now);
  this.processThrow(sessionId, data);
}

// 5. Người chơi cố tình AFK nhiều lượt
handleRepeatedAfk(player) {
  player.afkCount = (player.afkCount || 0) + 1;
  if (player.afkCount >= 3) {
    // Tự động force throw mỗi lượt với power thấp
    player.autoPlay = true;
    this.broadcast("afkWarning", { 
      playerId: player.id, 
      message: "AFK quá 3 lượt! Tự động ném..." 
    });
  }
}
```

### Validation Layer (Server-side)

```typescript
class ServerValidator {
  // Validate tất cả input từ client trước khi xử lý

  validateMove(player: PlayerSchema, data: any): boolean {
    // Chỉ cho phép di chuyển nếu đang trong phase playing
    if (this.state.phase !== "playing") return false;

    // Không cho di chuyển nếu đang bị stun/sleep
    if (player.statusEffect === "stunned" || player.statusEffect === "sleeping") return false;

    // Giới hạn speed (chống hack client)
    const dx = data.x - player.x;
    const dy = data.y - player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > player.moveSpeed * 0.1) return false; // 100ms interval

    return true;
  }

  validateThrow(player: PlayerSchema, data: any): boolean {
    // Chỉ người đang có lượt mới được ném
    if (this.state.currentTurn !== player.id) return false;

    // Validate angle (0..360)
    if (typeof data.angle !== "number" || data.angle < 0 || data.angle > 360) return false;

    // Validate power (0..1)
    if (typeof data.power !== "number" || data.power < 0.05 || data.power > 1) return false;

    // Validate skillId
    const validSkills = ["rock", "big_rock", "bomb", "soap", "pillow", "fireball", 
                         "wind_blade", "shuriken", "hug_rush", "honey", "rock_rain", "triple_rock"];
    if (!validSkills.includes(data.skillId)) return false;

    // Check cooldown
    const playerSkills = this.playerSkills.get(player.id)!;
    if (playerSkills.isOnCooldown(data.skillId)) return false;

    return true;
  }

  validateEmoji(player: PlayerSchema, data: any): boolean {
    const validEmojis = ["😂", "😡", "👍", "💀", "🔥", "😭", "🤡", "👻"];
    if (!validEmojis.includes(data.emoji)) return false;

    // Cooldown 3s
    const lastEmoji = this.playerLastEmoji.get(player.id) || 0;
    if (Date.now() - lastEmoji < 3000) return false;

    return true;
  }
}
```

### Client-side Fallbacks

```typescript
class ClientFallbackHandler {
  // 1. Khi server không phản hồi trong 5s
  onServerSilent() {
    this.showToast("Đang chờ server... ⏳");
    // Tạm thời cho phép client tự simulate đạn (dự phòng)
    this.enableClientPrediction(true);
  }

  // 2. Khi nhận state không hợp lệ
  onInvalidState(state: any) {
    console.warn("Invalid state received, requesting full sync");
    this.room.send("requestFullSync");
  }

  // 3. Khi animation bị desync
  onAnimationDesync(playerId: string) {
    // Force reset animation về idle
    const player = this.players.get(playerId);
    if (player) {
      player.sprite.play("idle", true);
    }
  }

  // 4. Fallback textures (khi asset load thất bại)
  onAssetLoadFail(key: string) {
    console.error(`Failed to load asset: ${key}`);
    // Dùng texture placeholder
    this.scene.textures.addCanvas(key, (canvas) => {
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(0, 0, 64, 64);
      ctx.fillStyle = "#ffffff";
      ctx.font = "32px monospace";
      ctx.fillText("?", 20, 44);
    });
  }

  // 5. Khi WebSocket không support (trình duyệt cũ)
  onWebSocketUnsupported() {
    this.showErrorScreen(
      "Trình duyệt của bạn không hỗ trợ WebSocket.\n" +
      "Vui lòng dùng Chrome/Firefox/Edge mới nhất."
    );
  }
}
```

### Logging & Debug

```typescript
class GameLogger {
  logLevel: "debug" | "info" | "warn" | "error" = "info";

  log(level: string, category: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}][${level.toUpperCase()}][${category}]`;
    
    switch (level) {
      case "debug":
        if (this.logLevel === "debug") console.debug(prefix, message, data);
        break;
      case "info":
        console.info(prefix, message, data);
        break;
      case "warn":
        console.warn(prefix, message, data);
        break;
      case "error":
        console.error(prefix, message, data);
        // Gửi error report lên server nếu là production
        if (process.env.NODE_ENV === "production") {
          this.sendErrorReport({ category, message, data });
        }
        break;
    }
  }

  sendErrorReport(error: any) {
    // POST error report (non-blocking)
    fetch("/api/log/error", {
      method: "POST",
      body: JSON.stringify(error),
      headers: { "Content-Type": "application/json" },
    }).catch(() => {}); // Fire and forget
  }
}
```

### Race Conditions & Consistency

```typescript
// Server dùng transaction lock cho critical sections:
class CriticalSection {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

// Sử dụng cho turn management:
const turnLock = new CriticalSection();

async function handleThrow(playerId, data) {
  await turnLock.acquire();
  try {
    // Process throw logic...
    // Đảm bảo không có 2 throw xử lý cùng lúc
  } finally {
    turnLock.release();
  }
}
```

---

*GDD Version 2.0 — Bổ sung Room & Matchmaking, Mobile Support, Error Handling*
*Cập nhật khi cần thêm chi tiết*
