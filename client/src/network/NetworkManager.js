import { Client } from 'colyseus.js';
import { GAME_CONFIG } from '@nem-da/shared/constants';
export default class NetworkManager {
    constructor() {
        this.messageHandlers = new Map();
        this._isBotMatch = false;
        this.playerName = '';
        const envUrl = import.meta.env.VITE_SERVER_URL;
        const serverUrl = envUrl || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
        this.client = new Client(serverUrl);
    }
    static getInstance() {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }
    get isBotMatch() {
        return this._isBotMatch;
    }
    setupRoomHandlers() {
        if (!this.room)
            return;
        this.room.state.players.onAdd((player, key) => {
            this.emit('playerJoin', { player, key });
        });
        this.room.state.players.onRemove((player, key) => {
            this.emit('playerLeave', { player, key });
        });
        // Listen for phase changes on game rooms
        if (typeof this.room.state.listen === 'function') {
            try {
                ;
                this.room.state.listen('phase', (currentValue) => {
                    this.emit('phaseChange', { current: currentValue });
                });
            }
            catch (e) {
                // not a game room with schema state, ignore
            }
        }
        this.room.onMessage('turnStart', (data) => this.emit('turnStart', data));
        this.room.onMessage('turnEnd', (data) => this.emit('turnEnd', data));
        this.room.onMessage('hit', (data) => this.emit('hit', data));
        this.room.onMessage('death', (data) => this.emit('death', data));
        this.room.onMessage('roundEnd', (data) => this.emit('roundEnd', data));
        this.room.onMessage('gameEnd', (data) => this.emit('gameEnd', data));
        this.room.onMessage('timeout', (data) => this.emit('timeout', data));
        this.room.onMessage('throw', (data) => this.emit('throw', data));
        this.room.onMessage('taunt', (data) => this.emit('taunt', data));
        this.room.onMessage('emoji', (data) => this.emit('emoji', data));
        this.room.onMessage('windChange', (data) => this.emit('windChange', data));
        this.room.onMessage('statusEffect', (data) => this.emit('statusEffect', data));
        this.room.onMessage('combo', (data) => this.emit('combo', data));
    }
    async joinRoom() {
        this.room = await this.client.joinOrCreate('game_room', {
            maxClients: GAME_CONFIG.maxPlayers
        });
        this.setupRoomHandlers();
        return this.room;
    }
    async joinRoomById(roomId) {
        this.leaveRoom();
        this.room = await this.client.joinById(roomId, { playerName: this.playerName });
        this.setupRoomHandlers();
        return this.room;
    }
    async joinMatchmaking() {
        this.leaveRoom();
        this._isBotMatch = false;
        this.room = await this.client.joinOrCreate('matchmaking_room');
        this.room.onMessage('matchFound', async (data) => {
            this._isBotMatch = data.isBotMatch || false;
            try {
                await this.joinRoomById(data.roomId);
                this.emit('matchFound', data);
            }
            catch (err) {
                this.emit('networkError', { message: err?.message || 'Không vào được trận!' });
            }
        });
        this.room.onMessage('queueUpdate', (data) => {
            this.emit('queueUpdate', data);
        });
        this.room.onMessage('roomCreated', (data) => {
            this.emit('roomCreated', data);
        });
        this.room.onMessage('error', (data) => {
            this.emit('networkError', data);
        });
        return this.room;
    }
    async createPrivateRoom() {
        this.leaveRoom();
        this._isBotMatch = false;
        this.room = await this.client.joinOrCreate('matchmaking_room', {
            action: 'create'
        });
        this.room.onMessage('roomCreated', async (data) => {
            try {
                await this.joinRoomById(data.roomId);
                this.emit('roomCreated', data);
            }
            catch (err) {
                this.emit('networkError', { message: err?.message || 'Không thể vào phòng!' });
            }
        });
        this.room.onMessage('error', (data) => {
            this.emit('networkError', data);
        });
        return this.room;
    }
    async joinByCode(code) {
        this.leaveRoom();
        this._isBotMatch = false;
        this.room = await this.client.joinOrCreate('matchmaking_room', {
            action: 'joinByCode',
            code
        });
        this.room.onMessage('matchFound', async (data) => {
            try {
                await this.joinRoomById(data.roomId);
                this.emit('matchFound', data);
            }
            catch (err) {
                this.emit('networkError', { message: err?.message || 'Mã phòng không hợp lệ!' });
            }
        });
        this.room.onMessage('error', (data) => {
            this.emit('networkError', data);
        });
        return this.room;
    }
    on(event, handler) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, []);
        }
        this.messageHandlers.get(event).push(handler);
    }
    off(event, handler) {
        const handlers = this.messageHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1)
                handlers.splice(index, 1);
        }
    }
    emit(event, data) {
        const handlers = this.messageHandlers.get(event);
        if (handlers) {
            handlers.forEach(h => h(data));
        }
    }
    sendMove(x, y, velocityX, velocityY, facingLeft, animState, isCrouching) {
        this.room?.send('move', { x, y, velocityX, velocityY, facingLeft, animState, isCrouching });
    }
    sendThrow(angle, power, skillId) {
        this.room?.send('throw', { angle, power, skillId });
    }
    sendReady(characterId) {
        this.room?.send('ready', { characterId });
    }
    sendTaunt() {
        this.room?.send('taunt');
    }
    sendEmoji(emoji) {
        this.room?.send('emoji', { emoji });
    }
    leaveRoom() {
        if (this.room) {
            this.room.leave();
            this.room = undefined;
        }
    }
    getRoom() {
        return this.room;
    }
    getState() {
        return this.room?.state;
    }
}
