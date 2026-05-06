# 🪨 Ném Đá Online — Phaser 4 + Colyseus

Game ném đá 2 người online, kiểu Gunny.

## Cấu trúc project

```
nem-da-game/
├── client/                 # Frontend — Phaser 4
│   └── src/
│       ├── scenes/         # Các màn hình game
│       │   ├── BootScene   # Load assets
│       │   ├── MenuScene   # Menu chính
│       │   ├── GameScene   # Gameplay chính
│       │   ├── UIScene     # HUD (chạy song song)
│       │   └── ResultScene # Kết quả
│       ├── entities/       # Object trong game
│       │   └── PlayerEntity
│       ├── systems/        # Logic / gameplay
│       │   ├── ProjectileSystem  # Quản lý đạn
│       │   └── AimSystem         # Ngắm + vẽ quỹ đạo
│       ├── network/        # Kết nối server
│       │   └── NetworkManager    # Singleton Colyseus client
│       └── config/
│           └── characters.ts     # Data nhân vật (data-driven)
│
├── server/                 # Backend — Colyseus
│   └── src/
│       ├── index.ts        # Entry point
│       └── rooms/
│           └── GameRoom    # Logic phòng chơi (server authoritative)
│
└── shared/                 # Dùng chung client + server
    └── src/
        ├── types/          # TypeScript interfaces
        └── constants/      # GAME_CONFIG, PHYSICS, MSG
```

## Bắt đầu nhanh

```bash
# 1. Cài dependencies
npm install

# 2. Copy env
cp .env.example .env

# 3. Chạy dev (client + server song song)
npm run dev
```

- Client: http://localhost:3000
- Server: ws://localhost:2567

## Thêm nhân vật mới

1. Thêm sprite vào `client/public/assets/sprites/char_TEN.png`
2. Load trong `BootScene.ts` — copy 1 dòng `load.spritesheet`, đổi key
3. Thêm định nghĩa vào `client/src/config/characters.ts`
4. Khai báo frames animation trong `entities/PlayerEntity.ts` → `CHARACTER_ANIMS`

## Thêm loại đạn / skill mới

1. Thêm asset vào `public/assets/sprites/proj_TEN.png`
2. Thêm entry vào `ProjectileSystem.ts` → `PROJECTILE_CONFIG`
3. Thêm vào character definition trong `characters.ts`

## Tech stack

| Layer | Công nghệ |
|-------|-----------|
| Game engine | Phaser 4 |
| Multiplayer server | Colyseus 0.15 |
| Language | TypeScript |
| Build tool | Vite |
| Monorepo | npm workspaces |
