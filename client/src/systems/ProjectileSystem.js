import { GAME_CONFIG } from '@nem-da/shared/constants';
export default class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = new Map();
        this.particles = new Map();
    }
    createProjectile(projectileId, projData) {
        const texture = this.getTextureForKey(projData.type) || 'rock';
        console.log(`[ProjectileSystem] Spawn ${projectileId}: type=${projData.type}, pos=(${projData.x}, ${projData.y}), vel=(${projData.velocityX}, ${projData.velocityY})`);
        const proj = this.scene.physics.add.sprite(projData.x, projData.y, texture);
        proj.setVelocity(projData.velocityX, projData.velocityY);
        proj.setData('ownerId', projData.ownerId);
        proj.setData('projectileId', projectileId);
        proj.setData('type', projData.type);
        // Match server gravity (world gravity is 300, add 680 to reach 980)
        const body = proj.body;
        if (body)
            body.setGravityY(680);
        // Add trail
        this.addTrail(proj, projData.type);
        this.projectiles.set(projectileId, proj);
        // Cleanup when out of bounds
        this.timeEventCheck(projectileId);
    }
    getTextureForKey(type) {
        const keys = ['rock', 'bomb', 'soap', 'pillow', 'big_rock', 'fireball', 'wind_blade', 'shuriken', 'hug_rush', 'honey', 'rock_rain', 'triple_rock'];
        return keys.includes(type) ? type : undefined;
    }
    addTrail(proj, type) {
        let texture = 'fx_spark';
        let tintColor = type === 'bomb' ? [0xff6600, 0xffcc00] : [0xcccccc, 0xaaaaaa];
        if (type === 'bomb') {
            texture = 'fx_fire';
        }
        const particles = this.scene.add.particles(0, 0, texture, {
            follow: proj,
            speed: { min: 10, max: 30 },
            angle: { min: 160, max: 200 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 200,
            quantity: 2,
            tint: tintColor
        });
        this.particles.set(proj.getData('projectileId'), particles);
    }
    timeEventCheck(projectileId) {
        this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                const proj = this.projectiles.get(projectileId);
                if (proj) {
                    if (proj.y > GAME_CONFIG.groundLevel + 50 || proj.x < -100 || proj.x > 2600) {
                        this.destroyProjectile(projectileId);
                    }
                }
            },
            repeat: -1
        });
    }
    update() { }
    syncProjectiles(serverProjectiles) {
        const activeIds = new Set(serverProjectiles.keys());
        this.projectiles.forEach((_, id) => {
            if (!activeIds.has(id)) {
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
