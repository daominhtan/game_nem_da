import { GAME_CONFIG } from '@nem-da/shared/constants';
import { SoundManager } from './SoundManager';
export default class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = new Map();
        this.particles = new Map();
        this.destroyedIds = new Set();
    }
    createProjectile(projectileId, projData) {
        const texture = this.getTextureForKey(projData.type) || 'rock';
        const proj = this.scene.physics.add.sprite(projData.x, projData.y, texture);
        proj.setVelocity(projData.velocityX, projData.velocityY);
        proj.setData('ownerId', projData.ownerId);
        proj.setData('projectileId', projectileId);
        proj.setData('type', projData.type);
        const body = proj.body;
        if (body)
            body.setGravityY(680);
        this.addTrail(proj, projData.type);
        this.projectiles.set(projectileId, proj);
        this.timeEventCheck(projectileId);
    }
    getTextureForKey(type) {
        const keys = ['rock', 'bomb', 'soap', 'pillow', 'big_rock', 'fireball', 'wind_blade', 'shuriken', 'hug_rush', 'honey', 'rock_rain', 'triple_rock'];
        return keys.includes(type) ? type : undefined;
    }
    addTrail(proj, type) {
        let texture = 'fx_spark';
        let tintColor = [0xcccccc, 0xaaaaaa];
        let quantity = 2;
        let lifespan = 200;
        if (type === 'bomb') {
            texture = 'fx_fire';
            tintColor = [0xff6600, 0xffcc00];
            quantity = 3;
            lifespan = 300;
        }
        else if (type === 'soap') {
            tintColor = [0x81d4fa, 0xb3e5fc, 0xe1f5fe];
            quantity = 4;
            lifespan = 250;
        }
        else if (type === 'fireball') {
            texture = 'fx_fire';
            tintColor = [0xff4400, 0xff8800, 0xffcc00];
            quantity = 4;
            lifespan = 200;
        }
        else if (type === 'shuriken') {
            tintColor = [0x90a4ae, 0xcfd8dc];
            quantity = 1;
            lifespan = 150;
        }
        else if (type === 'honey') {
            tintColor = [0xffc107, 0xffe082];
            quantity = 3;
            lifespan = 300;
        }
        else if (type === 'pillow') {
            tintColor = [0xfff9c4, 0xffffff];
            quantity = 2;
            lifespan = 300;
        }
        const particles = this.scene.add.particles(0, 0, texture, {
            follow: proj,
            speed: { min: 10, max: 30 },
            angle: { min: 160, max: 200 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan,
            quantity,
            tint: tintColor
        });
        this.particles.set(proj.getData('projectileId'), particles);
    }
    spawnExplosion(x, y, type) {
        const sfx = SoundManager.getInstance();
        if (type === 'bomb') {
            sfx.playExplosion();
            const flash = this.scene.add.circle(x, y, 10, 0xffffff, 1).setDepth(200);
            this.scene.tweens.add({
                targets: flash, scaleX: 5, scaleY: 5, alpha: 0, duration: 300,
                onComplete: () => flash.destroy()
            });
            const fireParticles = this.scene.add.particles(x, y, 'fx_fire', {
                speed: { min: 80, max: 250 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.8, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 400,
                quantity: 20,
                tint: [0xff4400, 0xff8800, 0xffcc00]
            });
            this.scene.time.delayedCall(500, () => fireParticles.destroy());
            const smoke = this.scene.add.particles(x, y, 'fx_smoke', {
                speed: { min: 30, max: 80 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.6, end: 0 },
                alpha: { start: 0.5, end: 0 },
                lifespan: 800,
                quantity: 10,
                tint: [0x555555, 0x777777]
            });
            this.scene.time.delayedCall(1000, () => smoke.destroy());
        }
        else {
            sfx.playHit();
            const dust = this.scene.add.particles(x, y, 'fx_dust', {
                speed: { min: 50, max: 150 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.6, end: 0 },
                lifespan: 400,
                quantity: 8,
                tint: [0xb0b0b0, 0xcccccc]
            });
            this.scene.time.delayedCall(500, () => dust.destroy());
        }
        if (type === 'soap') {
            const bubbles = this.scene.add.particles(x, y, 'fx_spark', {
                speed: { min: 30, max: 100 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.8, end: 0 },
                lifespan: 500,
                quantity: 10,
                tint: [0x81d4fa, 0xb3e5fc, 0xe1f5fe, 0xfff9c4]
            });
            this.scene.time.delayedCall(600, () => bubbles.destroy());
        }
        if (type === 'pillow') {
            const feathers = this.scene.add.particles(x, y, 'fx_spark', {
                speed: { min: 20, max: 80 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.4, end: 0 },
                alpha: { start: 0.8, end: 0 },
                lifespan: 600,
                quantity: 12,
                tint: [0xffffff, 0xfff9c4, 0xffe082]
            });
            this.scene.time.delayedCall(700, () => feathers.destroy());
        }
        if (type === 'fireball') {
            const embers = this.scene.add.particles(x, y, 'fx_fire', {
                speed: { min: 40, max: 120 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.4, end: 0 },
                alpha: { start: 0.8, end: 0 },
                lifespan: 300,
                quantity: 15,
                tint: [0xff4400, 0xff8800]
            });
            this.scene.time.delayedCall(400, () => embers.destroy());
        }
    }
    timeEventCheck(projectileId) {
        this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                const proj = this.projectiles.get(projectileId);
                if (proj) {
                    proj.rotation += 0.3;
                    if (proj.y > GAME_CONFIG.groundLevel + 50 || proj.x < -100 || proj.x > GAME_CONFIG.worldWidth + 100) {
                        const type = proj.getData('type') || 'rock';
                        this.spawnExplosion(proj.x, Math.min(proj.y, GAME_CONFIG.groundLevel), type);
                        this.destroyProjectile(projectileId);
                    }
                }
            },
            repeat: -1
        });
    }
    update() {
        this.projectiles.forEach((proj) => {
            if (proj.active) {
                proj.rotation += 0.2;
            }
        });
    }
    syncProjectiles(serverProjectiles) {
        const activeIds = new Set(serverProjectiles.keys());
        this.projectiles.forEach((proj, id) => {
            if (!activeIds.has(id)) {
                const type = proj.getData('type') || 'rock';
                if (!this.destroyedIds.has(id)) {
                    this.destroyedIds.add(id);
                    this.spawnExplosion(proj.x, Math.min(proj.y, GAME_CONFIG.groundLevel), type);
                }
                this.destroyProjectile(id);
            }
        });
    }
    hasProjectile(id) {
        return this.projectiles.has(id);
    }
    destroyProjectile(key) {
        const proj = this.projectiles.get(key);
        if (proj) {
            const particles = this.particles.get(key);
            if (particles) {
                particles.destroy();
                this.particles.delete(key);
            }
            proj.destroy();
            this.projectiles.delete(key);
        }
    }
    getProjectile(id) {
        return this.projectiles.get(id);
    }
}
