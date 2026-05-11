import { Client, Room } from 'colyseus.js'
import { PlayerState, GameRoomState, MessageType } from '@nem-da/shared/types'
import { GAME_CONFIG } from '@nem-da/shared/constants'

type MessageHandler = (data: any) => void

export default class NetworkManager {
  private static instance: NetworkManager
  private client: Client
  private room?: Room
  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private _isBotMatch: boolean = false
  public playerName: string = ''

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

  get isBotMatch(): boolean {
    return this._isBotMatch
  }

  private setupRoomHandlers() {
    if (!this.room) return

    this.room.state.players.onAdd((player: PlayerState, key: string) => {
      this.emit('playerJoin', { player, key })
    })

    this.room.state.players.onRemove((player: PlayerState, key: string) => {
      this.emit('playerLeave', { player, key })
    })

    // Listen for phase changes on game rooms
    if (typeof (this.room.state as any).listen === 'function') {
      try {
        ;(this.room.state as any).listen('phase', (currentValue: string) => {
          this.emit('phaseChange', { current: currentValue })
        })
      } catch (e) {
        // not a game room with schema state, ignore
      }
    }

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
    this.room.onMessage('combo', (data) => this.emit('combo', data))
  }

  async joinRoom() {
    this.room = await this.client.joinOrCreate('game_room', {
      maxClients: GAME_CONFIG.maxPlayers
    })
    this.setupRoomHandlers()
    return this.room
  }

  async joinRoomById(roomId: string) {
    this.leaveRoom()
    this.room = await this.client.joinById(roomId, { playerName: this.playerName })
    this.setupRoomHandlers()
    return this.room
  }

  async joinMatchmaking() {
    this.leaveRoom()
    this._isBotMatch = false
    this.room = await this.client.joinOrCreate('matchmaking_room')

    this.room.onMessage('matchFound', async (data) => {
      this._isBotMatch = data.isBotMatch || false
      try {
        await this.joinRoomById(data.roomId)
        this.emit('matchFound', data)
      } catch (err) {
        this.emit('networkError', { message: (err as Error)?.message || 'Không vào được trận!' })
      }
    })

    this.room.onMessage('queueUpdate', (data) => {
      this.emit('queueUpdate', data)
    })

    this.room.onMessage('roomCreated', (data) => {
      this.emit('roomCreated', data)
    })

    this.room.onMessage('error', (data) => {
      this.emit('networkError', data)
    })

    return this.room
  }

  async createPrivateRoom() {
    this.leaveRoom()
    this._isBotMatch = false
    this.room = await this.client.joinOrCreate('matchmaking_room', {
      action: 'create'
    })

    this.room.onMessage('roomCreated', async (data) => {
      try {
        await this.joinRoomById(data.roomId)
        this.emit('roomCreated', data)
      } catch (err) {
        this.emit('networkError', { message: (err as Error)?.message || 'Không thể vào phòng!' })
      }
    })

    this.room.onMessage('error', (data) => {
      this.emit('networkError', data)
    })

    return this.room
  }

  async joinByCode(code: string) {
    this.leaveRoom()
    this._isBotMatch = false
    this.room = await this.client.joinOrCreate('matchmaking_room', {
      action: 'joinByCode',
      code
    })

    this.room.onMessage('matchFound', async (data) => {
      try {
        await this.joinRoomById(data.roomId)
        this.emit('matchFound', data)
      } catch (err) {
        this.emit('networkError', { message: (err as Error)?.message || 'Mã phòng không hợp lệ!' })
      }
    })

    this.room.onMessage('error', (data) => {
      this.emit('networkError', data)
    })

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

  leaveRoom() {
    if (this.room) {
      this.room.leave()
      this.room = undefined
    }
  }

  getRoom() {
    return this.room
  }

  getState(): any {
    return this.room?.state
  }
}
