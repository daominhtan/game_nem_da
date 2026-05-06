export interface CharacterData {
  id: string
  name: string
  spriteKey: string
  hp: number
  moveSpeed: number
  throwPowerMult: number
  skills: string[]
}

export const CHARACTERS: CharacterData[] = [
  {
    id: 'warrior',
    name: 'Dũng Sĩ Xà Bông',
    spriteKey: 'warrior',
    hp: 120,
    moveSpeed: 180,
    throwPowerMult: 1.1,
    skills: ['rock', 'big_rock', 'bomb', 'soap']
  },
  {
    id: 'mage',
    name: 'Phù Thủy Lười',
    spriteKey: 'mage',
    hp: 80,
    moveSpeed: 200,
    throwPowerMult: 1.0,
    skills: ['rock', 'fireball', 'pillow', 'wind_blade']
  },
  {
    id: 'samurai',
    name: 'Samurai Tấu Hài',
    spriteKey: 'samurai',
    hp: 100,
    moveSpeed: 220,
    throwPowerMult: 1.0,
    skills: ['rock', 'shuriken', 'wind_blade', 'triple_rock']
  },
  {
    id: 'bear',
    name: 'Gấu Bông Hung Hãn',
    spriteKey: 'bear',
    hp: 150,
    moveSpeed: 140,
    throwPowerMult: 0.9,
    skills: ['rock', 'hug_rush', 'honey', 'rock_rain']
  }
]

export function getCharacterById(id: string): CharacterData | undefined {
  return CHARACTERS.find(c => c.id === id)
}
