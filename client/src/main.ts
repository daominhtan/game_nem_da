import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import MenuScene from './scenes/MenuScene'
import GameScene from './scenes/GameScene'
import UIScene from './scenes/UIScene'
import ResultScene from './scenes/ResultScene'
import { GAME_CONFIG } from '@nem-da/shared/constants'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  parent: 'game-container',
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 300 },
      debug: false
    }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, ResultScene]
}

new Phaser.Game(config)
