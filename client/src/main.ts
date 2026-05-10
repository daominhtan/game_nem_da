import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import MenuScene from './scenes/MenuScene'
import CharacterSelectScene from './scenes/CharacterSelectScene'
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
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 300 },
      debug: false
    }
  },
  scene: [BootScene, MenuScene, CharacterSelectScene, GameScene, UIScene, ResultScene]
}

new Phaser.Game(config)
