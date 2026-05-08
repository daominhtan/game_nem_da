import Phaser from 'phaser';
export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }
    preload() { }
    create() {
        this.createCharacterTextures();
        this.createProjectileTextures();
        this.createFxTextures();
        this.createBackgroundTextures();
        this.createGroundTexture();
        this.time.delayedCall(100, () => {
            this.scene.start('MenuScene');
        });
    }
    createCharacterTextures() {
        const characters = [
            { key: 'warrior', color: '#2196F3', darkColor: '#1565C0', darkerColor: '#0D47A1' },
            { key: 'mage', color: '#9C27B0', darkColor: '#7B1FA8', darkerColor: '#4A148C' },
            { key: 'samurai', color: '#F44336', darkColor: '#D32F2F', darkerColor: '#B71C1C' },
            { key: 'bear', color: '#795548', darkColor: '#5D4037', darkerColor: '#3E2723' }
        ];
        characters.forEach(char => {
            if (this.textures.exists(char.key))
                return;
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 80;
            const ctx = canvas.getContext('2d');
            if (!ctx)
                return;
            ctx.fillStyle = char.color;
            ctx.fillRect(16, 10, 32, 30);
            ctx.fillStyle = char.darkColor;
            ctx.fillRect(12, 40, 40, 25);
            ctx.fillStyle = char.darkerColor;
            ctx.fillRect(16, 65, 12, 12);
            ctx.fillRect(36, 65, 12, 12);
            ctx.fillStyle = '#fff';
            ctx.fillRect(22, 18, 8, 8);
            ctx.fillRect(34, 18, 8, 8);
            ctx.fillStyle = '#000';
            ctx.fillRect(24, 20, 4, 4);
            ctx.fillRect(36, 20, 4, 4);
            this.textures.addCanvas(char.key, canvas);
        });
    }
    createProjectileTextures() {
        const projectiles = [
            { key: 'rock', color: '#9E9E9E', size: 32 },
            { key: 'bomb', color: '#212121', size: 32 },
            { key: 'soap', color: '#E1F5FE', size: 32 },
            { key: 'pillow', color: '#FFF9C4', size: 32 },
            { key: 'big_rock', color: '#757575', size: 40 },
            { key: 'fireball', color: '#FF5722', size: 32 },
            { key: 'wind_blade', color: '#B3E5FC', size: 32 },
            { key: 'shuriken', color: '#607D8B', size: 32 },
            { key: 'hug_rush', color: '#8D6E63', size: 32 },
            { key: 'honey', color: '#FFC107', size: 32 },
            { key: 'rock_rain', color: '#9E9E9E', size: 24 },
            { key: 'triple_rock', color: '#9E9E9E', size: 28 }
        ];
        projectiles.forEach(p => this.createCircleTexture(p.key, p.color, p.size));
    }
    createFxTextures() {
        this.createCircleTexture('fx_spark', '#ffffff', 8);
        this.createCircleTexture('fx_dust', '#b0b0b0', 12);
        this.createCircleTexture('fx_star', '#ffeb3b', 16);
        this.createCircleTexture('fx_fire', '#ff6600', 12);
        this.createCircleTexture('fx_smoke', '#555555', 16);
    }
    createBackgroundTextures() {
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 1280;
        bgCanvas.height = 720;
        const bgCtx = bgCanvas.getContext('2d');
        if (!bgCtx)
            return;
        const grad = bgCtx.createLinearGradient(0, 0, 0, 720);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(0.6, '#B0E0E6');
        grad.addColorStop(0.8, '#98FB98');
        grad.addColorStop(1, '#228B22');
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, 1280, 720);
        bgCtx.fillStyle = 'rgba(255,255,255,0.8)';
        bgCtx.beginPath();
        bgCtx.arc(200, 100, 40, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.beginPath();
        bgCtx.arc(250, 110, 30, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.beginPath();
        bgCtx.arc(800, 80, 50, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.beginPath();
        bgCtx.arc(860, 90, 35, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.fillStyle = '#2E7D32';
        bgCtx.fillRect(50, 400, 30, 180);
        bgCtx.beginPath();
        bgCtx.arc(65, 380, 60, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.fillRect(1100, 380, 30, 200);
        bgCtx.beginPath();
        bgCtx.arc(1115, 360, 70, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.fillStyle = '#4CAF50';
        bgCtx.fillRect(0, 570, 1280, 10);
        this.textures.addCanvas('bg_game', bgCanvas);
        const menuBg = document.createElement('canvas');
        menuBg.width = 1280;
        menuBg.height = 720;
        const mCtx = menuBg.getContext('2d');
        if (!mCtx)
            return;
        const menuGrad = mCtx.createLinearGradient(0, 0, 0, 720);
        menuGrad.addColorStop(0, '#1a237e');
        menuGrad.addColorStop(1, '#4a148c');
        mCtx.fillStyle = menuGrad;
        mCtx.fillRect(0, 0, 1280, 720);
        mCtx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            mCtx.beginPath();
            mCtx.arc(Math.random() * 1280, Math.random() * 500, Math.random() * 2 + 1, 0, Math.PI * 2);
            mCtx.fill();
        }
        this.textures.addCanvas('bg_menu', menuBg);
    }
    createGroundTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, 1280, 120);
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, 1280, 15);
        ctx.fillStyle = '#388E3C';
        for (let i = 0; i < 40; i++) {
            ctx.fillRect(i * 32 + 10, 10, 3, 12);
            ctx.fillRect(i * 32 + 18, 8, 3, 14);
        }
        this.textures.addCanvas('ground', canvas);
    }
    createCircleTexture(key, color, size) {
        if (this.textures.exists(key))
            return;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        this.textures.addCanvas(key, canvas);
    }
}
