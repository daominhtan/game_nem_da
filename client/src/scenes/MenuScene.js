import Phaser from 'phaser';
import NetworkManager from '../network/NetworkManager';
import { CHARACTERS } from '../config/characters';
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.selectedChar = 'warrior';
        this.network = NetworkManager.getInstance();
    }
    create() {
        const { width, height } = this.cameras.main;
        // Background
        this.add.image(width / 2, height / 2, 'bg_menu');
        // Title
        this.add.text(width / 2, 80, 'NÉM ĐÁ ONLINE', {
            fontSize: '48px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.add.text(width / 2, 130, 'Chọn nhân vật rồi nhấn BẮT ĐẦU', {
            fontSize: '18px',
            color: '#ccc'
        }).setOrigin(0.5);
        // Character selection
        const charCards = this.createCharacterCards(width / 2, 280);
        // Select first character by default
        this.selectCharacter(0, charCards);
        // Status text
        const statusText = this.add.text(width / 2, height - 150, 'Đang kết nối...', {
            fontSize: '20px',
            color: '#ffaa00'
        }).setOrigin(0.5);
        // Start button
        const startBtn = this.add.text(width / 2, height - 80, 'BẮT ĐẦU', {
            fontSize: '32px',
            color: '#fff',
            backgroundColor: '#4CAF50',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive();
        startBtn.on('pointerdown', async () => {
            startBtn.setAlpha(0.5);
            statusText.setText('Đang vào phòng...');
            try {
                await this.network.joinRoom();
                this.network.sendReady(this.selectedChar);
                statusText.setText('Đã vào phòng! Chờ người chơi khác...');
                this.time.delayedCall(1000, () => {
                    this.scene.start('GameScene');
                });
            }
            catch (err) {
                statusText.setText('Lỗi kết nối! Thử lại.');
                startBtn.setAlpha(1);
            }
        });
    }
    selectCharacter(index, cards) {
        this.selectedChar = CHARACTERS[index].id;
        cards.forEach((c, i) => {
            const bg = c.first;
            if (bg) {
                bg.setStrokeStyle(i === index ? 4 : 0, i === index ? 0x00ff00 : 0x000000);
            }
        });
    }
    createCharacterCards(x, y) {
        const cards = [];
        const cardWidth = 150;
        const spacing = 170;
        const startX = x - ((CHARACTERS.length - 1) * spacing) / 2;
        CHARACTERS.forEach((char, index) => {
            const card = this.add.container(startX + index * spacing, y);
            const bg = this.add.rectangle(0, 0, cardWidth, 200, 0x333333, 0.8);
            const sprite = this.add.sprite(0, -50, char.id);
            sprite.setScale(2);
            const name = this.add.text(0, 40, char.name, { fontSize: '14px', color: '#fff', align: 'center' }).setOrigin(0.5);
            const hpText = this.add.text(0, 60, `HP: ${char.hp}`, { fontSize: '14px', color: '#4CAF50' }).setOrigin(0.5);
            const speedText = this.add.text(0, 80, `Speed: ${char.moveSpeed}`, { fontSize: '14px', color: '#2196F3' }).setOrigin(0.5);
            card.add([bg, sprite, name, hpText, speedText]);
            cards.push(card);
            bg.setInteractive(new Phaser.Geom.Rectangle(-cardWidth / 2, -100, cardWidth, 200), Phaser.Geom.Rectangle.Contains);
            bg.on('pointerdown', () => {
                this.selectCharacter(index, cards);
            });
            bg.setName('bg');
        });
        return cards;
    }
}
