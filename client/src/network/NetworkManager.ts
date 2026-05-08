import { Client, Room } from 'colyseus.js'
import { PlayerState, GameRoomState, MessageType } from '@nem-da/shared/types'
import { GAME_CONFIG } from '@nem-da/shared/constants'

type MessageHandler = (data: any) => void

export default class NetworkManager {
  private static instance: NetworkManager
  private client: Client
  private room?: Room
  private messageHandlers: Map<string, MessageHandler[]> = new Map()

  private constructor() {
    const serverUrl = (import.meta as any).env.VITE_SERVER_URL || 'ws://localhost:2567'
    this.client = new Client(serverUrl)
  }

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager()
    }
    return NetworkManager.instance
  }

  async joinRoom() {
    this.room = await this.client.joinOrCreate('game_room', {
      maxClients: GAME_CONFIG.maxPlayers
    })

    // Listen for state changes
    this.room.state.players.onAdd((player: PlayerState, key: string) => {
      this.emit('playerJoin', { player, key })
    })

    this.room.state.players.onRemove((player: PlayerState, key: string) => {
      this.emit('playerLeave', { player, key })
    })

    // Listen for messages
    this.room.onMessage('turnStart', (data) => this.emit('turnStart', data))
    this.room.onMessage('turnEnd', (data) => this.emit('turnEnd', data))
    this.room.onMessage('hit', (data) => this.emit('hit', data))
    this.room.onMessage('death', (data) => this.emit('death', data))
    this.room.onMessage('roundEnd', (data) => this.emit('roundEnd', data))
    this.room.onMessage('gameEnd', (data) => this.emit('gameEnd', data))
    this.room.onMessage('timeout', (data) => this.emit('timeout', data))
    this.room.onMessage('throw', (data) => this.emit('throw', data))
    this.room.onMessage('taunt', (data) => this.emit('taunt', data))
    this.room.onMessage('emoji', (data) => this.emit('emoji', data))
    this.room.onMessage('windChange', (data) => this.emit('windChange', data))
    this.room.onMessage('statusEffect', (data) => this.emit('statusEffect', data))

    return this.room
  }

  on(event: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, [])
    }
    this.messageHandlers.get(event)!.push(handler)
  }

  off(event: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) handlers.splice(index, 1)
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      handlers.forEach(h => h(data))
    }
  }

  sendMove(x: number, y: number, velocityX: number, velocityY: number, facingLeft: boolean, animState: string) {
    this.room?.send('move', { x, y, velocityX, velocityY, facingLeft, animState })
  }

  sendThrow(angle: number, power: number, skillId: string) {
    this.room?.send('throw', { angle, power, skillId })
  }

  sendReady(characterId: string) {
    this.room?.send('ready', { characterId })
  }

  sendTaunt() {
    this.room?.send('taunt')
  }

  sendEmoji(emoji: string) {
    this.room?.send('emoji', { emoji })
  }

  getRoom() {
    return this.room
  }

  getState(): any {
    return this.room?.state
  }
}
