export default class PlayerEntity {
    constructor(scene, state) {
        this.playerState = state;
        this.targetX = state.x;
        this.targetY = state.y;
        this.yellowTargetPercent = state.hp / state.maxHp;
        this.sprite = scene.physics.add.sprite(state.x, state.y, state.characterId || 'warrior');
        this.sprite.setScale(2);
        this.sprite.setDepth(50);
        const body = this.sprite.body;
        body.setSize(36, 64);
        body.setOffset(14, 8);
        body.setCollideWorldBounds(true);
        body.setBounce(0.2);
        this.hpBarGreen = scene.add.graphics().setDepth(100);
        this.hpBarYellow = scene.add.graphics().setDepth(99);
        this.debugRect = scene.add.rectangle(state.x, state.y, 64, 80, 0xff0000, 0.3).setDepth(49);
        const initialFacingLeft = (state.x || 0) > 640;
        this.sprite.setFlipX(initialFacingLeft);
        this.playerState.facingLeft = initialFacingLeft;
        this.updateHPBar();
    }
    update(time, delta) {
        this.sprite.x += (this.targetX - this.sprite.x) * 0.15;
        this.sprite.y += (this.targetY - this.sprite.y) * 0.15;
        this.targetX = this.playerState.x;
        this.targetY = this.playerState.y;
        this.updateHPBar();
        this.debugRect.setPosition(this.sprite.x, this.sprite.y);
        if (this.statusText) {
            this.statusText.setPosition(this.sprite.x, this.sprite.y - 100);
        }
    }
    updatePositionFromServer(x, y, _animState, facingLeft) {
        this.targetX = x;
        this.targetY = y;
        this.playerState.facingLeft = facingLeft;
        this.sprite.setFlipX(facingLeft);
    }
    updateHPFromServer(hp, maxHp, isAlive) {
        const oldHp = this.playerState.hp;
        this.playerState.hp = hp;
        this.playerState.maxHp = maxHp;
        this.playerState.isAlive = isAlive;
        this.sprite.setAlpha(isAlive ? 1 : 0.3);
        // Afterburn: yellow bar catches up slowly
        if (hp < oldHp) {
            this.yellowTargetPercent = hp / maxHp;
            const scene = this.sprite.scene;
            scene.tweens.add({
                targets: this,
                yellowTargetPercent: hp / maxHp,
                duration: 600,
                ease: 'Power2',
                onUpdate: () => this.updateHPBar()
            });
        }
    }
    showStatusEffect(effect) {
        if (this.statusText) {
            this.statusText.destroy();
        }
        const labels = {
            stunned: '😵 Choáng!',
            sleeping: '😴 Ngủ!',
            slowed: '🐢 Chậm!'
        };
        this.statusText = this.sprite.scene.add.text(this.sprite.x, this.sprite.y - 100, labels[effect] || effect, { fontSize: '20px', color: '#ffff00', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(101);
        this.sprite.scene.time.delayedCall(3000, () => {
            if (this.statusText) {
                this.statusText.destroy();
                this.statusText = undefined;
            }
        });
    }
    playAnimation(animName) {
        const scene = this.sprite.scene;
        if (animName === 'hit') {
            scene.tweens.add({ targets: this.sprite, alpha: 0.5, duration: 50, yoyo: true, repeat: 2 });
            scene.tweens.add({ targets: this.sprite, scaleX: 1.4, scaleY: 0.7, duration: 80, yoyo: true, ease: 'Power2' });
        }
        else if (animName === 'die') {
            scene.tweens.add({
                targets: this.sprite, alpha: 0, y: this.sprite.y + 100, duration: 1000, ease: 'Power2'
            });
        }
        else if (animName === 'throw') {
            scene.tweens.add({
                targets: this.sprite, scaleX: 1.2, scaleY: 0.9, duration: 80,
                yoyo: true, ease: 'Power2'
            });
        }
        else if (animName === 'taunt') {
            scene.tweens.add({
                targets: this.sprite, y: this.sprite.y - 20, duration: 200,
                yoyo: true, repeat: 2, ease: 'Bounce'
            });
        }
        else {
            scene.tweens.add({
                targets: this.sprite, alpha: 0.5, duration: 50, yoyo: true,
                repeat: animName === 'hit' ? 2 : 0
            });
        }
    }
    showEmoji(emoji) {
        const emojiText = this.sprite.scene.add.text(this.sprite.x, this.sprite.y - 80, emoji, {
            fontSize: '32px', color: '#fff', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(101);
        this.sprite.scene.tweens.add({
            targets: emojiText, y: this.sprite.y - 120, alpha: 0, duration: 2000,
            onComplete: () => emojiText.destroy()
        });
    }
    isAlive() { return this.playerState.isAlive; }
    getBody() {
        return this.sprite.body;
    }
    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    get flipX() { return this.sprite.flipX; }
    set flipX(v) { this.sprite.flipX = v; }
    updateHPBar() {
        const hpPercent = this.playerState.hp / this.playerState.maxHp;
        const yellowPercent = this.yellowTargetPercent;
        const barW = 60;
        const barX = this.sprite.x - 30;
        const barY = this.sprite.y - 70;
        // Background
        this.hpBarGreen.clear();
        this.hpBarGreen.fillStyle(0x000000, 0.7);
        this.hpBarGreen.fillRect(barX, barY, barW, 8);
        // HP bar color
        const color = hpPercent > 0.6 ? 0x22dd22 : hpPercent > 0.3 ? 0xffaa00 : 0xff2222;
        this.hpBarGreen.fillStyle(color, 1);
        this.hpBarGreen.fillRect(barX, barY, barW * hpPercent, 8);
        // Afterburn yellow bar
        this.hpBarYellow.clear();
        if (yellowPercent > hpPercent) {
            this.hpBarYellow.fillStyle(0xffaa00, 0.5);
            this.hpBarYellow.fillRect(barX + barW * hpPercent, barY, barW * (yellowPercent - hpPercent), 8);
        }
    }
    getPlayerState() { return this.playerState; }
    destroy() {
        this.sprite.destroy();
        this.hpBarGreen.destroy();
        this.hpBarYellow.destroy();
        this.debugRect.destroy();
        if (this.statusText)
            this.statusText.destroy();
    }
}
