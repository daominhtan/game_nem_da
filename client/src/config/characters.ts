import { CharacterAppearance } from '../systems/CharacterGenerator'

export interface CharacterData {
  id: string
  name: string
  hp: number
  moveSpeed: number
  throwPowerMult: number
  skills: string[]
  appearance: CharacterAppearance
}

export const CHARACTERS: CharacterData[] = [
  {
    id: 'warrior',
    name: 'Dũng Sĩ Xà Bông',
    hp: 120,
    moveSpeed: 180,
    throwPowerMult: 1.1,
    skills: ['rock', 'big_rock', 'bomb', 'soap'],
    appearance: {
      skinColor: '#f5d6b8', hairColor: '#1565C0', eyeColor: '#1e88e5',
      shirtColor: '#1976D2', pantsColor: '#37474F', shoesColor: '#5D4037'
    }
  },
  {
    id: 'mage',
    name: 'Phù Thủy Lười',
    hp: 80,
    moveSpeed: 200,
    throwPowerMult: 1.0,
    skills: ['rock', 'fireball', 'pillow', 'wind_blade'],
    appearance: {
      skinColor: '#f5d6b8', hairColor: '#7B1FA2', eyeColor: '#ce93d8',
      shirtColor: '#9C27B0', pantsColor: '#4A148C', shoesColor: '#311B92'
    }
  },
  {
    id: 'samurai',
    name: 'Samurai Tấu Hài',
    hp: 100,
    moveSpeed: 220,
    throwPowerMult: 1.0,
    skills: ['rock', 'shuriken', 'wind_blade', 'triple_rock'],
    appearance: {
      skinColor: '#f5d0a9', hairColor: '#212121', eyeColor: '#d32f2f',
      shirtColor: '#D32F2F', pantsColor: '#37474F', shoesColor: '#212121'
    }
  },
  {
    id: 'bear',
    name: 'Gấu Bông Hung Hãn',
    hp: 150,
    moveSpeed: 140,
    throwPowerMult: 0.9,
    skills: ['rock', 'hug_rush', 'honey', 'rock_rain'],
    appearance: {
      skinColor: '#a1887f', hairColor: '#5D4037', eyeColor: '#3e2723',
      shirtColor: '#8D6E63', pantsColor: '#4E342E', shoesColor: '#3E2723'
    }
  }
]

export function getCharacterById(id: string): CharacterData | undefined {
  return CHARACTERS.find(c => c.id === id)
}
