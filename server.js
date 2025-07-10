/**
 * 센서 게임 허브 v3.0 - 메인 서버
 * 완벽한 세션 매칭과 멀티플레이어 지원
 */

const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');

// 포트 설정
const HTTP_PORT = process.env.PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const HOST = process.env.HOST || '0.0.0.0';

// Express 앱 설정
const app = express();

// 미들웨어 설정
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ========== 핵심 데이터 구조 ==========

// 세션 코드 관리 (4자리 숫자)
const sessionCodes = new Map(); // sessionCode -> sessionData
const usedCodes = new Set(); // 중복 방지용

// 멀티플레이어 룸 관리 (4자리 비밀번호)
const gameRooms = new Map(); // roomId -> roomData
const roomPasswords = new Map(); // password -> roomId

// 클라이언트 연결 관리
const clients = new Map(); // clientId -> clientData
const gameSessions = new Map(); // sessionId -> sessionData

// 게임 레지스트리
const gameRegistry = new Map(); // gameId -> gameMetadata

console.log('🚀 센서 게임 허브 v3.0 시작');

// ========== 세션 코드 생성 알고리즘 (중복 방지) ==========

/**
 * 중복되지 않는 4자리 세션 코드 생성
 */
function generateUniqueSessionCode() {
    let attempts = 0;
    const maxAttempts = 9000; // 1000-9999 범위에서 최대 시도 횟수
    
    while (attempts < maxAttempts) {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        
        // 현재 사용 중이거나 최근 사용된 코드 확인
        if (!sessionCodes.has(code) && !usedCodes.has(code)) {
            // 사용된 코드 기록 (메모리 관리를 위해 1000개까지만)
            usedCodes.add(code);
            if (usedCodes.size > 1000) {
                const firstCode = usedCodes.values().next().value;
                usedCodes.delete(firstCode);
            }
            
            console.log(`✅ 새 세션 코드 생성: ${code}`);
            return code;
        }
        attempts++;
    }
    
    // 모든 코드가 사용 중인 경우 (극히 드문 상황)
    throw new Error('사용 가능한 세션 코드가 없습니다. 잠시 후 다시 시도해주세요.');
}

/**
 * 세션 코드 생성 및 등록
 */
function createSessionCode(gameClientId, gameId) {
    try {
        const sessionCode = generateUniqueSessionCode();
        const sessionData = {
            sessionCode: sessionCode,
            gameClientId: gameClientId,
            gameId: gameId,
            sensorDeviceId: null,
            status: 'waiting', // waiting, matched, expired
            createdAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000), // 10분 후 만료
            lastActivity: Date.now()
        };
        
        sessionCodes.set(sessionCode, sessionData);
        
        console.log(`🎯 세션 코드 등록: ${sessionCode} (게임: ${gameId})`);
        return {
            success: true,
            sessionCode: sessionCode,
            expiresAt: sessionData.expiresAt,
            gameId: gameId
        };
    } catch (error) {
        console.error('❌ 세션 코드 생성 실패:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 세션 코드로 매칭 시도
 */
function matchSessionCode(sessionCode, sensorDeviceId) {
    const sessionData = sessionCodes.get(sessionCode);
    
    if (!sessionData) {
        return { success: false, error: '존재하지 않는 세션 코드입니다.' };
    }
    
    if (sessionData.expiresAt < Date.now()) {
        sessionCodes.delete(sessionCode);
        return { success: false, error: '만료된 세션 코드입니다.' };
    }
    
    if (sessionData.status !== 'waiting') {
        return { success: false, error: '이미 매칭된 세션 코드입니다.' };
    }
    
    // 매칭 성공
    sessionData.sensorDeviceId = sensorDeviceId;
    sessionData.status = 'matched';
    sessionData.lastActivity = Date.now();
    
    // 게임 세션 생성
    const sessionId = uuidv4();
    gameSessions.set(sessionId, {
        sessionId: sessionId,
        sessionCode: sessionCode,
        gameClientId: sessionData.gameClientId,
        sensorDeviceId: sensorDeviceId,
        gameId: sessionData.gameId,
        createdAt: Date.now(),
        lastActivity: Date.now()
    });
    
    console.log(`✅ 세션 매칭 성공: ${sessionCode} (센서: ${sensorDeviceId})`);
    return {
        success: true,
        sessionId: sessionId,
        gameId: sessionData.gameId,
        gameClientId: sessionData.gameClientId
    };
}

// ========== 멀티플레이어 룸 시스템 ==========

/**
 * 중복되지 않는 4자리 룸 비밀번호 생성
 */
function generateUniqueRoomPassword() {
    let attempts = 0;
    const maxAttempts = 9000;
    
    while (attempts < maxAttempts) {
        const password = Math.floor(1000 + Math.random() * 9000).toString();
        
        if (!roomPasswords.has(password)) {
            console.log(`🔐 새 룸 비밀번호 생성: ${password}`);
            return password;
        }
        attempts++;
    }
    
    throw new Error('사용 가능한 룸 비밀번호가 없습니다. 잠시 후 다시 시도해주세요.');
}

/**
 * 멀티플레이어 룸 생성
 */
function createGameRoom(hostClientId, gameId, settings = {}) {
    try {
        const roomId = uuidv4();
        const password = generateUniqueRoomPassword();
        
        const game = gameRegistry.get(gameId);
        if (!game) {
            return { success: false, error: '존재하지 않는 게임입니다.' };
        }
        
        const roomData = {
            roomId: roomId,
            password: password,
            gameId: gameId,
            hostClientId: hostClientId,
            maxPlayers: settings.maxPlayers || game.maxPlayers || 4,
            currentPlayers: 0,
            players: new Map(), // playerId -> playerData
            status: 'waiting', // waiting, playing, finished
            createdAt: Date.now(),
            settings: settings
        };
        
        gameRooms.set(roomId, roomData);
        roomPasswords.set(password, roomId);
        
        console.log(`🏠 멀티플레이어 룸 생성: ${roomId} (비밀번호: ${password})`);
        return {
            success: true,
            roomId: roomId,
            password: password,
            gameId: gameId,
            maxPlayers: roomData.maxPlayers
        };
    } catch (error) {
        console.error('❌ 룸 생성 실패:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 룸 참가
 */
function joinGameRoom(password, playerData) {
    const roomId = roomPasswords.get(password);
    if (!roomId) {
        return { success: false, error: '잘못된 룸 비밀번호입니다.' };
    }
    
    const roomData = gameRooms.get(roomId);
    if (!roomData) {
        return { success: false, error: '존재하지 않는 룸입니다.' };
    }
    
    if (roomData.currentPlayers >= roomData.maxPlayers) {
        return { success: false, error: '룸이 가득 찼습니다.' };
    }
    
    if (roomData.status !== 'waiting') {
        return { success: false, error: '이미 시작된 게임입니다.' };
    }
    
    // 플레이어 추가
    const playerId = uuidv4();
    roomData.players.set(playerId, {
        playerId: playerId,
        ...playerData,
        joinedAt: Date.now(),
        isReady: false
    });
    roomData.currentPlayers++;
    
    console.log(`👤 플레이어 룸 참가: ${playerId} → ${roomId}`);
    return {
        success: true,
        roomId: roomId,
        playerId: playerId,
        roomData: {
            roomId: roomData.roomId,
            gameId: roomData.gameId,
            currentPlayers: roomData.currentPlayers,
            maxPlayers: roomData.maxPlayers,
            players: Array.from(roomData.players.values())
        }
    };
}

// ========== 정리 작업 ==========

/**
 * 만료된 세션 및 룸 정리
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    
    // 만료된 세션 코드 정리
    for (const [code, sessionData] of sessionCodes.entries()) {
        if (sessionData.expiresAt < now) {
            sessionCodes.delete(code);
            console.log(`🗑️ 만료된 세션 코드 삭제: ${code}`);
        }
    }
    
    // 비활성 룸 정리 (1시간 이상 비활성)
    for (const [roomId, roomData] of gameRooms.entries()) {
        if (now - roomData.createdAt > 60 * 60 * 1000) { // 1시간
            gameRooms.delete(roomId);
            roomPasswords.delete(roomData.password);
            console.log(`🗑️ 비활성 룸 삭제: ${roomId}`);
        }
    }
}

// 5분마다 정리 작업 실행
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

// ========== 게임 레지스트리 로드 ==========

/**
 * 게임 폴더 스캔 및 레지스트리 구축
 */
function loadGameRegistry() {
    console.log('🔍 게임 폴더 스캔 중...');
    
    const gamesDir = path.join(__dirname, 'games');
    if (!fs.existsSync(gamesDir)) {
        console.log('⚠️ games 폴더가 없습니다. 생성합니다.');
        fs.mkdirSync(gamesDir, { recursive: true });
        return;
    }
    
    const gameList = fs.readdirSync(gamesDir);
    console.log(`📋 발견된 게임 폴더: ${gameList.length}개`);
    
    for (const gameFolder of gameList) {
        const gamePath = path.join(gamesDir, gameFolder);
        const gameJsonPath = path.join(gamePath, 'game.json');
        
        if (fs.existsSync(gameJsonPath)) {
            try {
                const gameData = JSON.parse(fs.readFileSync(gameJsonPath, 'utf8'));
                gameData.isActive = true;
                gameData.playCount = 0;
                gameData.createdAt = Date.now();
                
                gameRegistry.set(gameData.id, gameData);
                console.log(`🎮 게임 등록됨: ${gameData.name} (${gameData.id})`);
            } catch (error) {
                console.error(`❌ 게임 로드 실패 (${gameFolder}):`, error.message);
            }
        }
    }
    
    console.log(`✅ 총 ${gameRegistry.size}개 게임이 등록되었습니다.`);
}

// ========== API 라우트 ==========

// 헬스체크 엔드포인트 (Render 배포용)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        uptime: process.uptime(),
        sessions: sessionCodes.size,
        rooms: gameRooms.size,
        clients: clients.size
    });
});

// 게임 목록 API
app.get('/api/games', (req, res) => {
    const games = Array.from(gameRegistry.values())
        .filter(game => game.isActive)
        .sort((a, b) => b.playCount - a.playCount);
    
    res.json({
        success: true,
        games: games,
        total: games.length
    });
});

// 특정 게임 정보 API
app.get('/api/games/:gameId', (req, res) => {
    const game = gameRegistry.get(req.params.gameId);
    if (!game) {
        return res.status(404).json({
            success: false,
            error: '게임을 찾을 수 없습니다.'
        });
    }
    
    res.json({
        success: true,
        game: game
    });
});

// 멀티플레이어 룸 목록 API
app.get('/api/rooms', (req, res) => {
    const rooms = Array.from(gameRooms.values())
        .filter(room => room.status === 'waiting')
        .map(room => ({
            roomId: room.roomId,
            gameId: room.gameId,
            currentPlayers: room.currentPlayers,
            maxPlayers: room.maxPlayers,
            createdAt: room.createdAt
        }));
    
    res.json({
        success: true,
        rooms: rooms,
        total: rooms.length
    });
});

// 서버 상태 API
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        status: {
            uptime: process.uptime(),
            totalGames: gameRegistry.size,
            activeSessions: sessionCodes.size,
            activeRooms: gameRooms.size,
            connectedClients: clients.size,
            memoryUsage: process.memoryUsage(),
            timestamp: Date.now()
        }
    });
});

// ========== 정적 파일 라우트 ==========

// 메인 허브
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'core', 'index.html'));
});

// 센서 클라이언트
app.get('/sensor', (req, res) => {
    res.sendFile(path.join(__dirname, 'core', 'sensor-client.html'));
});

// 게임 라우트
app.get('/game/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    const gamePath = path.join(__dirname, 'games', gameId, 'index.html');
    
    if (fs.existsSync(gamePath)) {
        res.sendFile(gamePath);
    } else {
        res.status(404).send('게임을 찾을 수 없습니다.');
    }
});

// ========== WebSocket 서버 설정 ==========

// HTTP 서버 생성
const httpServer = http.createServer(app);
const httpWss = new WebSocket.Server({ server: httpServer });

// HTTPS 서버 생성 (인증서가 있는 경우)
let httpsServer = null;
let httpsWss = null;

try {
    const certPath = path.join(__dirname, 'cert.pem');
    const keyPath = path.join(__dirname, 'key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const options = {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath)
        };
        
        httpsServer = https.createServer(options, app);
        httpsWss = new WebSocket.Server({ server: httpsServer });
        console.log('🔒 HTTPS 인증서 로드 완료');
    }
} catch (error) {
    console.log('⚠️ HTTPS 설정 건너뜀:', error.message);
}

// WebSocket 연결 처리
function handleWebSocketConnection(ws, req) {
    const clientId = uuidv4();
    const clientData = {
        id: clientId,
        ws: ws,
        type: null, // hub, game, sensor
        metadata: {},
        connectedAt: Date.now(),
        lastActivity: Date.now()
    };
    
    clients.set(clientId, clientData);
    console.log(`🔗 새 클라이언트 연결: ${clientId}`);
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleWebSocketMessage(clientId, message);
        } catch (error) {
            console.error('메시지 처리 오류:', error);
        }
    });
    
    ws.on('close', () => {
        handleClientDisconnect(clientId);
    });
    
    ws.on('error', (error) => {
        console.error(`클라이언트 ${clientId} 오류:`, error);
    });
}

// HTTP와 HTTPS WebSocket 서버에 연결 핸들러 등록
httpWss.on('connection', handleWebSocketConnection);
if (httpsWss) {
    httpsWss.on('connection', handleWebSocketConnection);
}

// ========== WebSocket 메시지 처리 ==========

function handleWebSocketMessage(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;
    
    client.lastActivity = Date.now();
    
    switch (message.type) {
        case 'register_hub_client':
            handleHubClientRegister(clientId, message);
            break;
            
        case 'register_game_client':
            handleGameClientRegister(clientId, message);
            break;
            
        case 'register_sensor_client':
            handleSensorClientRegister(clientId, message);
            break;
            
        case 'create_session_code':
            handleCreateSessionCode(clientId, message);
            break;
            
        case 'join_session_code':
            handleJoinSessionCode(clientId, message);
            break;
            
        case 'sensor_data':
            handleSensorData(clientId, message);
            break;
            
        case 'create_room':
            handleCreateRoom(clientId, message);
            break;
            
        case 'join_room':
            handleJoinRoom(clientId, message);
            break;
            
        case 'ping':
            handlePing(clientId, message);
            break;

        case 'start_game':
            handleStartGame(clientId, message);
            break;
            
        default:
            console.log(`알 수 없는 메시지 타입: ${message.type}`);
    }
}

// ========== WebSocket 핸들러 함수들 ==========

function handleHubClientRegister(clientId, message) {
    const client = clients.get(clientId);
    client.type = 'hub';
    client.metadata = { version: message.version || '3.0.0' };
    
    client.ws.send(JSON.stringify({
        type: 'registration_success',
        clientId: clientId,
        serverVersion: '3.0.0'
    }));
    
    console.log(`🏠 허브 클라이언트 등록: ${clientId}`);
}

function handleGameClientRegister(clientId, message) {
    const client = clients.get(clientId);
    client.type = 'game';
    client.metadata = {
        gameId: message.gameId,
        gameName: message.gameName,
        requestedSensors: message.requestedSensors || ['orientation']
    };
    
    client.ws.send(JSON.stringify({
        type: 'registration_success',
        clientId: clientId,
        gameId: message.gameId
    }));
    
    console.log(`🎮 게임 클라이언트 등록: ${message.gameId}`);
}

function handleSensorClientRegister(clientId, message) {
    const client = clients.get(clientId);
    client.type = 'sensor';
    client.metadata = {
        deviceId: message.deviceId,
        userAgent: message.userAgent,
        supportedSensors: message.supportedSensors || []
    };
    
    client.ws.send(JSON.stringify({
        type: 'registration_success',
        clientId: clientId,
        deviceId: message.deviceId
    }));
    
    console.log(`📱 센서 클라이언트 등록: ${message.deviceId}`);
}

function handleCreateSessionCode(clientId, message) {
    const result = createSessionCode(clientId, message.gameId);
    
    const client = clients.get(clientId);
    if (client) {
        client.ws.send(JSON.stringify({
            type: 'session_code_created',
            ...result
        }));
    }
}

function handleJoinSessionCode(clientId, message) {
    const client = clients.get(clientId);
    if (!client || !client.metadata.deviceId) {
        return;
    }
    
    const result = matchSessionCode(message.sessionCode, client.metadata.deviceId);
    
    if (result.success) {
        // 센서 클라이언트에게 성공 알림
        client.ws.send(JSON.stringify({
            type: 'session_joined',
            sessionId: result.sessionId,
            gameId: result.gameId,
            sessionCode: message.sessionCode
        }));
        
        // 게임 클라이언트에게 매칭 알림
        const gameClient = clients.get(result.gameClientId);
        if (gameClient) {
            gameClient.ws.send(JSON.stringify({
                type: 'sensor_matched',
                sessionId: result.sessionId,
                deviceId: client.metadata.deviceId,
                sessionCode: message.sessionCode
            }));
        }
    } else {
        client.ws.send(JSON.stringify({
            type: 'session_join_failed',
            error: result.error
        }));
    }
}

function handleSensorData(clientId, message) {
    const session = gameSessions.get(message.sessionId);
    if (!session) return;
    
    // 게임 클라이언트에게 센서 데이터 전송
    const gameClient = clients.get(session.gameClientId);
    if (gameClient) {
        gameClient.ws.send(JSON.stringify({
            type: 'sensor_data',
            sessionId: message.sessionId,
            sensorData: message.sensorData,
            timestamp: Date.now()
        }));
    }
    
    // 세션 활동 시간 업데이트
    session.lastActivity = Date.now();
}

function handleCreateRoom(clientId, message) {
    const result = createGameRoom(clientId, message.gameId, message.settings);
    
    const client = clients.get(clientId);
    if (client) {
        client.ws.send(JSON.stringify({
            type: 'room_created',
            ...result
        }));
    }
}

function handleJoinRoom(clientId, message) {
    const result = joinGameRoom(message.password, {
        clientId: clientId,
        nickname: message.nickname,
        deviceId: message.deviceId
    });
    
    const client = clients.get(clientId);
    if (client) {
        client.ws.send(JSON.stringify({
            type: 'room_joined',
            ...result
        }));
    }
    
    // 룸의 다른 플레이어들에게 알림
    if (result.success) {
        broadcastToRoom(result.roomId, {
            type: 'player_joined',
            playerId: result.playerId,
            nickname: message.nickname
        }, clientId);
    }
}

function handleStartGame(clientId, message) {
    // 클라이언트가 속한 룸 찾기
    let roomId = null;
    for (const [id, room] of gameRooms.entries()) {
        if (room.hostClientId === clientId) {
            roomId = id;
            break;
        }
    }

    if (!roomId) {
        console.warn(`게임 시작 요청 실패: 클라이언트 ${clientId}는 호스트가 아닙니다.`);
        const client = clients.get(clientId);
        if (client) {
            client.ws.send(JSON.stringify({
                type: 'game_start_failed',
                error: '당신은 이 룸의 호스트가 아닙니다.'
            }));
        }
        return;
    }

    const room = gameRooms.get(roomId);
    if (!room) {
        console.error(`게임 시작 요청 실패: 룸 ${roomId}를 찾을 수 없습니다.`);
        return;
    }

    // 룸 상태를 'playing'으로 변경
    room.status = 'playing';
    console.log(`🎮 룸 ${roomId} 게임 시작!`);

    // 룸의 모든 플레이어에게 게임 시작 이벤트 브로드캐스트
    broadcastToRoom(roomId, {
        type: 'game_start',
        gameId: room.gameId,
        roomId: roomId
    });

    // 호스트 클라이언트에게도 시작 알림
    const hostClient = clients.get(clientId);
    if (hostClient) {
        hostClient.ws.send(JSON.stringify({
            type: 'game_start',
            gameId: room.gameId,
            roomId: roomId
        }));
    }
}

function handlePing(clientId, message) {
    const client = clients.get(clientId);
    if (client) {
        client.ws.send(JSON.stringify({
            type: 'pong',
            timestamp: message.timestamp
        }));
    }
}

function handleClientDisconnect(clientId) {
    const client = clients.get(clientId);
    if (!client) return;
    
    console.log(`🔌 클라이언트 연결 해제: ${clientId} (${client.type})`);
    
    // 세션 정리
    for (const [sessionId, session] of gameSessions.entries()) {
        if (session.gameClientId === clientId || session.sensorDeviceId === client.metadata.deviceId) {
            gameSessions.delete(sessionId);
            console.log(`🗑️ 세션 정리: ${sessionId}`);
        }
    }
    
    // 룸 정리 (호스트가 나간 경우)
    for (const [roomId, room] of gameRooms.entries()) {
        if (room.hostClientId === clientId) {
            // 룸의 모든 플레이어에게 알림
            broadcastToRoom(roomId, {
                type: 'room_closed',
                reason: 'host_disconnected'
            });
            
            gameRooms.delete(roomId);
            roomPasswords.delete(room.password);
            console.log(`🏠 룸 삭제 (호스트 퇴장): ${roomId}`);
        }
    }
    
    clients.delete(clientId);
}

// ========== 유틸리티 함수 ==========

function broadcastToRoom(roomId, message, excludeClientId = null) {
    const room = gameRooms.get(roomId);
    if (!room) return;
    
    for (const [playerId, player] of room.players.entries()) {
        if (player.clientId !== excludeClientId) {
            const client = clients.get(player.clientId);
            if (client && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(message));
            }
        }
    }
}

// ========== 서버 시작 ==========

// 게임 레지스트리 로드
loadGameRegistry();

// HTTP 서버 시작
httpServer.listen(HTTP_PORT, HOST, () => {
    console.log(`🌐 HTTP 서버: http://${HOST}:${HTTP_PORT}`);
});

// HTTPS 서버 시작 (가능한 경우)
if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, HOST, () => {
        console.log(`🔒 HTTPS 서버: https://${HOST}:${HTTPS_PORT}`);
    });
}

console.log(`
🚀 센서 게임 허브 v3.0 준비 완료!
==============================================
📱 센서 연결: http://localhost:${HTTP_PORT}/sensor
🎮 게임 허브: http://localhost:${HTTP_PORT}
📊 API: http://localhost:${HTTP_PORT}/api
==============================================
`);

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
    console.log('\n🛑 서버 종료 중...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 서버 종료 중...');
    process.exit(0);
});