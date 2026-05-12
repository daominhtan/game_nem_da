import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { createServer } from 'http'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { GameRoom } from './rooms/GameRoom.js'
import { MatchmakingRoom } from './rooms/MatchmakingRoom.js'
import { monitor } from '@colyseus/monitor'

const port = process.env.PORT ? parseInt(process.env.PORT) : 2567
const vitePort = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 3000
const app = express()
const server = createServer(app)
const gameServer = new Server({
  transport: new WebSocketTransport({ server })
})

gameServer.define('game_room', GameRoom)
gameServer.define('matchmaking_room', MatchmakingRoom)

app.use('/colyseus', monitor())

// Proxy all other requests to Vite dev server
app.use(
  createProxyMiddleware({
    target: `http://localhost:${vitePort}`,
    changeOrigin: true,
    ws: false
  })
)

gameServer.listen(port)
console.log(`Server running on ws://localhost:${port}`)
console.log(`Proxying frontend requests to Vite on http://localhost:${vitePort}`)
