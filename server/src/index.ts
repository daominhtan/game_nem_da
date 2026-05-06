import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { createServer } from 'http'
import express from 'express'
import { GameRoom } from './rooms/GameRoom.js'
import { monitor } from '@colyseus/monitor'

const port = process.env.PORT ? parseInt(process.env.PORT) : 2567
const app = express()
const server = createServer(app)
const gameServer = new Server({
  transport: new WebSocketTransport({ server })
})

gameServer.define('game_room', GameRoom)

app.use('/colyseus', monitor())

gameServer.listen(port)
console.log(`Server running on ws://localhost:${port}`)
