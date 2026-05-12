import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { createServer } from 'http'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { GameRoom } from './rooms/GameRoom.js'
import { MatchmakingRoom } from './rooms/MatchmakingRoom.js'
import { monitor } from '@colyseus/monitor'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const port = process.env.PORT ? parseInt(process.env.PORT) : 2567
const vitePort = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 3000
const isProduction = process.env.NODE_ENV === 'production'
const app = express()
const server = createServer(app)
const gameServer = new Server({
  transport: new WebSocketTransport({ server })
})

gameServer.define('game_room', GameRoom)
gameServer.define('matchmaking_room', MatchmakingRoom)

app.use('/colyseus', monitor())

if (isProduction) {
  app.use(express.static(path.join(__dirname, '../../client/dist')))
} else {
  app.use(
    createProxyMiddleware({
      target: `http://localhost:${vitePort}`,
      changeOrigin: true,
      ws: false
    })
  )
}

const host = process.env.HOST || (isProduction ? '0.0.0.0' : 'localhost')
gameServer.listen(port, host)
console.log(`Server running on ws://${host}:${port}`)
