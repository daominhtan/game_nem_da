import { Room, Client, matchMaker } from '@colyseus/core'

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6
const QUEUE_TIMEOUT = 15000

const roomCodeMap = new Map<string, string>()

export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

export function getRoomIdByCode(code: string): string | undefined {
  return roomCodeMap.get(code.toUpperCase())
}

export function removeRoomCode(code: string) {
  roomCodeMap.delete(code.toUpperCase())
}

export class MatchmakingRoom extends Room {
  private joinQueue: Client[] = []
  private queueTimer?: NodeJS.Timeout

  onCreate() {
    this.maxClients = 100

    this.onMessage('leaveQueue', (client) => {
      this.removeFromQueue(client)
    })

    this.onMessage('joinByCode', (client, { code }) => {
      this.handleJoinByCode(client, code)
    })

    this.onMessage('createRoom', (client) => {
      this.handleCreateRoom(client)
    })
  }

  onJoin(client: Client, options: any) {
    if (options?.action === 'create') {
      this.handleCreateRoom(client)
    } else if (options?.action === 'joinByCode' && options?.code) {
      this.handleJoinByCode(client, options.code)
    } else if (options?.action === 'playBot') {
      this.createBotMatchForClient(client)
    } else {
      this.addToQueue(client)
      client.send('queueUpdate', { position: this.joinQueue.length })
    }
  }

  onLeave(client: Client) {
    this.removeFromQueue(client)
  }

  onDispose() {
    clearTimeout(this.queueTimer)
  }

  private addToQueue(client: Client) {
    this.joinQueue.push(client)

    if (this.joinQueue.length >= 2) {
      this.createMatch()
    } else {
      this.queueTimer = setTimeout(() => {
        if (this.joinQueue.length >= 1) {
          this.createBotMatch()
        }
      }, QUEUE_TIMEOUT)
    }
  }

  private removeFromQueue(client: Client) {
    this.joinQueue = this.joinQueue.filter(c => c.sessionId !== client.sessionId)
    if (this.joinQueue.length === 0) {
      clearTimeout(this.queueTimer)
    }
  }

  private async createMatch() {
    const [client1, client2] = this.joinQueue.splice(0, 2)
    clearTimeout(this.queueTimer)

    try {
      const reservation = await matchMaker.create('game_room', {})
      const roomId = reservation.room.roomId
      client1.send('matchFound', { roomId })
      client2.send('matchFound', { roomId })
    } catch (err) {
      console.error('[Matchmaking] Failed to create game room:', err)
      this.addToQueue(client1)
      this.addToQueue(client2)
    }
  }

  private async createBotMatch() {
    const client = this.joinQueue.shift()
    if (!client) return
    clearTimeout(this.queueTimer)

    try {
      const reservation = await matchMaker.create('game_room', { botMode: true })
      const roomId = reservation.room.roomId
      client.send('matchFound', { roomId, isBotMatch: true })
    } catch (err) {
      console.error('[Matchmaking] Failed to create bot match:', err)
      if (client) this.addToQueue(client)
    }
  }

  private async createBotMatchForClient(client: Client) {
    try {
      const reservation = await matchMaker.create('game_room', { botMode: true })
      const roomId = reservation.room.roomId
      client.send('matchFound', { roomId, isBotMatch: true })
    } catch (err) {
      console.error('[Matchmaking] Failed to create bot match:', err)
      client.send('error', { message: 'Không thể tạo bot match!' })
    }
  }

  private async handleCreateRoom(client: Client) {
    let code = generateRoomCode()
    while (roomCodeMap.has(code)) {
      code = generateRoomCode()
    }

    try {
      const reservation = await matchMaker.create('game_room', { roomCode: code })
      const roomId = reservation.room.roomId
      roomCodeMap.set(code, roomId)
      client.send('roomCreated', { roomId, code })
    } catch (err) {
      console.error('[Matchmaking] Failed to create private room:', err)
      client.send('error', { message: 'Không thể tạo phòng!' })
    }
  }

  private async handleJoinByCode(client: Client, code: string) {
    const roomId = roomCodeMap.get(code.toUpperCase())
    if (roomId) {
      client.send('matchFound', { roomId })
    } else {
      client.send('error', { message: 'Mã phòng không hợp lệ!' })
    }
  }
}
