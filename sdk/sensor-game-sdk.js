/**
 * 센서 게임 SDK v3.0
 * 완벽한 세션 매칭과 멀티플레이어 지원
 * 
 * 사용법:
 * 1. HTML에서 로드: <script src="sdk/sensor-game-sdk.js"></script>
 * 2. SensorGameSDK 클래스를 상속받아 게임 개발
 * 3. 콜백 함수들을 등록하여 센서 데이터 처리
 */

class SensorGameSDK {
    constructor(gameConfig = {}) {
        // 게임 설정
        this.gameConfig = {
            gameId: gameConfig.gameId || 'unnamed-game',
            gameName: gameConfig.gameName || 'Unnamed Game',
            gameType: gameConfig.gameType || 'single', // single, multiplayer
            version: gameConfig.version || '1.0.0',
            
            // 센서 설정
            requestedSensors: gameConfig.requestedSensors || ['orientation'],
            sensorSensitivity: gameConfig.sensorSensitivity || {
                orientation: 1.0,
                accelerometer: 1.0,
                gyroscope: 1.0
            },
            
            // 데이터 처리 설정
            smoothingFactor: gameConfig.smoothingFactor || 3,
            deadzone: gameConfig.deadzone || 0.1,
            updateRate: gameConfig.updateRate || 60, // FPS
            
            // 멀티플레이어 설정
            maxPlayers: gameConfig.maxPlayers || 4,
            minPlayers: gameConfig.minPlayers || 2,
            
            ...gameConfig
        };
        
        // 연결 상태
        this.socket = null;
        this.isConnected = false;
        this.clientId = null;
        this.connectionState = 'disconnected'; // disconnected, connecting, connected
        
        // 세션 관리
        this.sessionId = null;
        this.sessionCode = null;
        this.sensorDeviceId = null;
        this.isSensorConnected = false;
        
        // 멀티플레이어 상태
        this.isMultiplayerMode = false;
        this.roomId = null;
        this.roomPassword = null;
        this.playerId = null;
        this.isHost = false;
        this.players = new Map(); // playerId -> playerData
        this.roomSettings = {};
        
        // 센서 데이터
        this.sensorData = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 },
            gyroscope: { alpha: 0, beta: 0, gamma: 0 },
            timestamp: 0
        };
        
        // 처리된 게임 입력
        this.gameInput = {
            tilt: { x: 0, y: 0 },
            movement: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            shake: { intensity: 0, detected: false },
            gesture: { type: 'none', confidence: 0 }
        };
        
        // 데이터 히스토리 (스무싱용)
        this.dataHistory = {
            orientation: [],
            accelerometer: [],
            gyroscope: []
        };
        
        // 보정값
        this.calibration = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 }
        };
        
        // 콜백 함수들
        this.callbacks = {
            // 기본 콜백
            onReady: [],
            onSensorData: [],
            onConnectionChange: [],
            onCalibration: [],
            onError: [],
            
            // 세션 관리 콜백
            onSessionCodeCreated: [],
            onSensorConnected: [],
            onSensorDisconnected: [],
            
            // 멀티플레이어 콜백
            onRoomCreated: [],
            onRoomJoined: [],
            onRoomLeft: [],
            onPlayerJoined: [],
            onPlayerLeft: [],
            onPlayerReady: [],
            onGameStart: [],
            onGameEnd: [],
            onMultiplayerEvent: []
        };
        
        // 시뮬레이션 모드 (센서 없을 때)
        this.simulationMode = false;
        this.simulationKeys = {};
        this.simulationInterval = null;
        
        // 성능 통계
        this.stats = {
            packetsReceived: 0,
            packetsPerSecond: 0,
            averageLatency: 0,
            connectionUptime: 0,
            lastUpdateTime: 0
        };
        
        // 자동 초기화
        this.init();
    }
    
    /**
     * SDK 초기화
     */
    init() {
        console.log(`🎮 센서 게임 SDK v3.0 초기화: ${this.gameConfig.gameName}`);
        
        // URL 파라미터로 멀티플레이어 모드 확인
        this.checkMultiplayerMode();
        
        // 서버 연결
        this.connectToServer();
        
        // 시뮬레이션 모드 설정
        this.setupSimulationMode();
        
        // 자동 보정 설정
        this.setupAutoCalibration();
        
        // 성능 모니터링 시작
        this.startPerformanceMonitoring();
    }
    
    /**
     * 멀티플레이어 모드 확인
     */
    checkMultiplayerMode() {
        const urlParams = new URLSearchParams(window.location.search);
        this.isMultiplayerMode = urlParams.has('multiplayer') || this.gameConfig.gameType === 'multiplayer';
        
        if (this.isMultiplayerMode) {
            console.log('🎮 멀티플레이어 모드 활성화');
        }
    }
    
    /**
     * 서버 연결
     */
    connectToServer() {
        try {
            this.connectionState = 'connecting';
            
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log(`🔗 서버 연결 시도: ${wsUrl}`);
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.connectionState = 'connected';
                this.stats.connectionUptime = Date.now();
                
                console.log(`✅ 서버 연결 성공`);
                this.triggerCallback('onConnectionChange', true);
                
                // 게임 클라이언트로 등록
                this.registerGameClient();
                
                // 1초 후 세션 코드 생성 (싱글플레이어) 또는 대기 (멀티플레이어)
                setTimeout(() => {
                    if (!this.isMultiplayerMode) {
                        this.createSessionCode();
                    }
                }, 1000);
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                } catch (error) {
                    console.error('메시지 처리 오류:', error);
                }
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
                this.connectionState = 'disconnected';
                console.log('🔌 서버 연결 끊김');
                this.triggerCallback('onConnectionChange', false);
                
                // 3초 후 재연결 시도
                setTimeout(() => {
                    if (this.connectionState === 'disconnected') {
                        this.connectToServer();
                    }
                }, 3000);
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                this.enableSimulationMode();
                this.triggerCallback('onError', { type: 'connection', error: error });
            };
            
        } catch (error) {
            console.error('서버 연결 실패:', error);
            this.enableSimulationMode();
            this.triggerCallback('onError', { type: 'connection', error: error });
        }
    }
    
    /**
     * 게임 클라이언트 등록
     */
    registerGameClient() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'register_game_client',
                gameId: this.gameConfig.gameId,
                gameName: this.gameConfig.gameName,
                gameType: this.gameConfig.gameType,
                version: this.gameConfig.version,
                requestedSensors: this.gameConfig.requestedSensors,
                maxPlayers: this.gameConfig.maxPlayers,
                minPlayers: this.gameConfig.minPlayers,
                timestamp: Date.now()
            }));
        }
    }
    
    /**
     * 서버 메시지 처리
     */
    handleServerMessage(data) {
        this.stats.packetsReceived++;
        
        switch (data.type) {
            case 'registration_success':
                this.clientId = data.clientId;
                console.log(`✅ 게임 클라이언트 등록 완료: ${this.clientId}`);
                this.triggerCallback('onReady');
                break;
                
            case 'session_code_created':
                this.sessionCode = data.sessionCode;
                console.log(`🎯 세션 코드 생성: ${data.sessionCode}`);
                this.triggerCallback('onSessionCodeCreated', {
                    sessionCode: data.sessionCode,
                    expiresAt: data.expiresAt,
                    gameId: data.gameId
                });
                break;
                
            case 'sensor_matched':
                this.sessionId = data.sessionId;
                this.sensorDeviceId = data.deviceId;
                this.isSensorConnected = true;
                console.log(`🎯 센서 매칭 성공: ${data.deviceId}`);
                this.triggerCallback('onSensorConnected', {
                    sessionId: data.sessionId,
                    deviceId: data.deviceId,
                    sessionCode: data.sessionCode
                });
                break;
                
            case 'sensor_data':
                if (data.sessionId === this.sessionId) {
                    this.processSensorData(data.sensorData);
                }
                break;
                
            case 'room_created':
                this.roomId = data.roomId;
                this.roomPassword = data.password;
                this.isHost = true;
                console.log(`🏠 룸 생성 완료: ${data.roomId} (비밀번호: ${data.password})`);
                this.triggerCallback('onRoomCreated', {
                    roomId: data.roomId,
                    password: data.password,
                    maxPlayers: data.maxPlayers
                });
                break;
                
            case 'room_joined':
                this.roomId = data.roomId;
                this.playerId = data.playerId;
                console.log(`🎮 룸 참가 완료: ${data.roomId}`);
                this.triggerCallback('onRoomJoined', data.roomData);
                break;
                
            case 'player_joined':
                console.log(`👤 새 플레이어 참가: ${data.nickname}`);
                this.triggerCallback('onPlayerJoined', data);
                break;
                
            case 'player_left':
                console.log(`👤 플레이어 퇴장: ${data.nickname}`);
                this.triggerCallback('onPlayerLeft', data);
                break;
                
            case 'room_closed':
                console.log(`🏠 룸 종료: ${data.reason}`);
                this.triggerCallback('onRoomLeft', data);
                this.resetMultiplayerState();
                break;
                
            case 'multiplayer_event':
                this.triggerCallback('onMultiplayerEvent', data);
                break;
                
            case 'pong':
                this.updateLatencyStats(data);
                break;
                
            default:
                console.log(`알 수 없는 메시지: ${data.type}`);
        }
    }
    
    /**
     * 센서 데이터 처리
     */
    processSensorData(data) {
        if (!data) return;
        
        this.stats.lastUpdateTime = Date.now();
        
        // 원본 센서 데이터 저장
        if (data.orientation) {
            this.addToHistory('orientation', data.orientation);
            this.sensorData.orientation = data.orientation;
        }
        
        if (data.accelerometer) {
            this.addToHistory('accelerometer', data.accelerometer);
            this.sensorData.accelerometer = data.accelerometer;
        }
        
        if (data.gyroscope) {
            this.addToHistory('gyroscope', data.gyroscope);
            this.sensorData.gyroscope = data.gyroscope;
        }
        
        this.sensorData.timestamp = data.timestamp || Date.now();
        
        // 데이터 처리 파이프라인
        const smoothedData = this.getSmoothedData();
        const calibratedData = this.applyCalibration(smoothedData);
        this.convertToGameInput(calibratedData);
        
        // 콜백 호출
        this.triggerCallback('onSensorData', {
            gameInput: { ...this.gameInput },
            calibratedData: calibratedData,
            rawData: { ...this.sensorData }
        });
    }
    
    /**
     * 게임 입력으로 변환
     */
    convertToGameInput(calibratedData) {
        const { orientation, accelerometer, gyroscope } = calibratedData;
        const sensitivity = this.gameConfig.sensorSensitivity;
        
        // 기울기 입력
        if (orientation) {
            this.gameInput.tilt.x = this.applyDeadzone(
                (orientation.gamma / 45) * sensitivity.orientation
            );
            this.gameInput.tilt.y = this.applyDeadzone(
                (orientation.beta / 45) * sensitivity.orientation
            );
        }
        
        // 움직임 입력 (가속도계)
        if (accelerometer) {
            this.gameInput.movement.x = accelerometer.x * sensitivity.accelerometer;
            this.gameInput.movement.y = accelerometer.y * sensitivity.accelerometer;
            this.gameInput.movement.z = accelerometer.z * sensitivity.accelerometer;
            
            // 흔들기 감지
            const magnitude = Math.sqrt(
                accelerometer.x ** 2 + 
                accelerometer.y ** 2 + 
                accelerometer.z ** 2
            );
            this.gameInput.shake.intensity = magnitude;
            this.gameInput.shake.detected = magnitude > 15;
        }
        
        // 회전 입력 (자이로스코프)
        if (gyroscope) {
            this.gameInput.rotation.x = gyroscope.alpha * sensitivity.gyroscope;
            this.gameInput.rotation.y = gyroscope.beta * sensitivity.gyroscope;
            this.gameInput.rotation.z = gyroscope.gamma * sensitivity.gyroscope;
        }
    }
    
    /**
     * 데이터 히스토리 관리
     */
    addToHistory(type, data) {
        if (!this.dataHistory[type]) this.dataHistory[type] = [];
        
        this.dataHistory[type].push({ ...data, timestamp: Date.now() });
        
        const maxSize = this.gameConfig.smoothingFactor;
        if (this.dataHistory[type].length > maxSize) {
            this.dataHistory[type].shift();
        }
    }
    
    /**
     * 스무싱된 데이터 계산
     */
    getSmoothedData() {
        return {
            orientation: this.calculateAverage('orientation'),
            accelerometer: this.calculateAverage('accelerometer'),
            gyroscope: this.calculateAverage('gyroscope')
        };
    }
    
    /**
     * 평균값 계산
     */
    calculateAverage(type) {
        const history = this.dataHistory[type];
        if (!history || history.length === 0) return null;
        
        const keys = Object.keys(history[0]).filter(key => key !== 'timestamp');
        const result = {};
        
        keys.forEach(key => {
            result[key] = history.reduce((sum, data) => sum + (data[key] || 0), 0) / history.length;
        });
        
        return result;
    }
    
    /**
     * 보정값 적용
     */
    applyCalibration(data) {
        const result = {};
        
        if (data.orientation && this.calibration.orientation) {
            result.orientation = {
                alpha: data.orientation.alpha - this.calibration.orientation.alpha,
                beta: data.orientation.beta - this.calibration.orientation.beta,
                gamma: data.orientation.gamma - this.calibration.orientation.gamma
            };
        }
        
        if (data.accelerometer && this.calibration.accelerometer) {
            result.accelerometer = {
                x: data.accelerometer.x - this.calibration.accelerometer.x,
                y: data.accelerometer.y - this.calibration.accelerometer.y,
                z: data.accelerometer.z - this.calibration.accelerometer.z
            };
        }
        
        if (data.gyroscope) {
            result.gyroscope = data.gyroscope;
        }
        
        return result;
    }
    
    /**
     * 데드존 적용
     */
    applyDeadzone(value) {
        const deadzone = this.gameConfig.deadzone;
        if (Math.abs(value) < deadzone) return 0;
        
        const sign = Math.sign(value);
        const absValue = Math.abs(value);
        return sign * Math.max(0, (absValue - deadzone) / (1 - deadzone));
    }
    
    // ========== 공개 API 메서드들 ==========
    
    /**
     * 세션 코드 생성 요청
     */
    createSessionCode() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'create_session_code',
                gameId: this.gameConfig.gameId,
                timestamp: Date.now()
            }));
            console.log('🎯 세션 코드 생성 요청');
        }
    }
    
    /**
     * 멀티플레이어 룸 생성
     */
    createRoom(settings = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'create_room',
                gameId: this.gameConfig.gameId,
                settings: {
                    maxPlayers: settings.maxPlayers || this.gameConfig.maxPlayers,
                    ...settings
                },
                timestamp: Date.now()
            }));
            console.log('🏠 룸 생성 요청');
        }
    }
    
    /**
     * 센서 보정
     */
    calibrate() {
        const currentData = this.getSmoothedData();
        
        if (currentData.orientation) {
            this.calibration.orientation = { ...currentData.orientation };
        }
        
        if (currentData.accelerometer) {
            this.calibration.accelerometer = { ...currentData.accelerometer };
        }
        
        console.log('🎯 센서 보정 완료');
        this.triggerCallback('onCalibration', this.calibration);
    }
    
    /**
     * 멀티플레이어 이벤트 전송
     */
    sendMultiplayerEvent(eventType, eventData = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN && this.isMultiplayerMode) {
            this.socket.send(JSON.stringify({
                type: 'multiplayer_event',
                roomId: this.roomId,
                playerId: this.playerId,
                eventType: eventType,
                eventData: eventData,
                timestamp: Date.now()
            }));
        }
    }
    
    /**
     * 지연시간 측정
     */
    measureLatency() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
            }));
        }
    }
    
    // ========== 시뮬레이션 모드 ==========
    
    /**
     * 시뮬레이션 모드 설정
     */
    setupSimulationMode() {
        document.addEventListener('keydown', (e) => {
            this.simulationKeys[e.code] = true;
            this.updateSimulation();
        });
        
        document.addEventListener('keyup', (e) => {
            this.simulationKeys[e.code] = false;
            this.updateSimulation();
        });
        
        // R키로 보정
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR') {
                this.calibrate();
            }
        });
    }
    
    /**
     * 시뮬레이션 모드 활성화
     */
    enableSimulationMode() {
        if (this.simulationMode) return;
        
        this.simulationMode = true;
        console.log('🎮 시뮬레이션 모드 활성화 (WASD/화살표 키 + R:보정)');
        
        this.simulationInterval = setInterval(() => {
            this.updateSimulation();
        }, 1000 / this.gameConfig.updateRate);
        
        this.triggerCallback('onConnectionChange', false);
    }
    
    /**
     * 시뮬레이션 업데이트
     */
    updateSimulation() {
        if (!this.simulationMode) return;
        
        let tiltX = 0, tiltY = 0;
        let moveX = 0, moveY = 0, moveZ = 0;
        let shake = 0;
        
        // WASD 이동
        if (this.simulationKeys['KeyA'] || this.simulationKeys['ArrowLeft']) tiltX = -1;
        if (this.simulationKeys['KeyD'] || this.simulationKeys['ArrowRight']) tiltX = 1;
        if (this.simulationKeys['KeyW'] || this.simulationKeys['ArrowUp']) tiltY = -1;
        if (this.simulationKeys['KeyS'] || this.simulationKeys['ArrowDown']) tiltY = 1;
        
        // QE로 Z축 이동
        if (this.simulationKeys['KeyQ']) moveZ = -1;
        if (this.simulationKeys['KeyE']) moveZ = 1;
        
        // 스페이스로 흔들기
        if (this.simulationKeys['Space']) shake = 20;
        
        // 게임 입력 업데이트
        this.gameInput.tilt.x = tiltX;
        this.gameInput.tilt.y = tiltY;
        this.gameInput.movement.x = moveX;
        this.gameInput.movement.y = moveY;
        this.gameInput.movement.z = moveZ;
        this.gameInput.shake.intensity = shake;
        this.gameInput.shake.detected = shake > 0;
        
        // 콜백 호출
        this.triggerCallback('onSensorData', {
            gameInput: { ...this.gameInput },
            calibratedData: null,
            rawData: null
        });
    }
    
    // ========== 유틸리티 함수들 ==========
    
    /**
     * 자동 보정 설정
     */
    setupAutoCalibration() {
        setTimeout(() => {
            if (this.dataHistory.orientation.length > 0) {
                this.calibrate();
            }
        }, 5000);
    }
    
    /**
     * 성능 모니터링 시작
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            const now = Date.now();
            const timeDiff = now - this.stats.lastUpdateTime;
            
            if (timeDiff < 60000) { // 1분 이내 업데이트가 있었다면
                this.stats.packetsPerSecond = Math.round(this.stats.packetsReceived / (timeDiff / 1000));
            } else {
                this.stats.packetsPerSecond = 0;
            }
        }, 1000);
    }
    
    /**
     * 지연시간 통계 업데이트
     */
    updateLatencyStats(data) {
        const latency = Date.now() - data.timestamp;
        this.stats.averageLatency = (this.stats.averageLatency + latency) / 2;
    }
    
    /**
     * 멀티플레이어 상태 초기화
     */
    resetMultiplayerState() {
        this.roomId = null;
        this.roomPassword = null;
        this.playerId = null;
        this.isHost = false;
        this.players.clear();
        this.roomSettings = {};
    }
    
    /**
     * 콜백 등록
     */
    on(eventType, callback) {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].push(callback);
        } else {
            console.warn(`알 수 없는 이벤트 타입: ${eventType}`);
        }
    }
    
    /**
     * 콜백 제거
     */
    off(eventType, callback) {
        if (this.callbacks[eventType]) {
            const index = this.callbacks[eventType].indexOf(callback);
            if (index > -1) {
                this.callbacks[eventType].splice(index, 1);
            }
        }
    }
    
    /**
     * 콜백 호출
     */
    triggerCallback(eventType, ...args) {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`콜백 오류 (${eventType}):`, error);
                }
            });
        }
    }
    
    // ========== 정보 조회 메서드들 ==========
    
    /**
     * 현재 게임 입력 반환
     */
    getGameInput() {
        return { ...this.gameInput };
    }
    
    /**
     * 현재 센서 데이터 반환
     */
    getSensorData() {
        return { ...this.sensorData };
    }
    
    /**
     * 성능 통계 반환
     */
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            isSensorConnected: this.isSensorConnected,
            simulationMode: this.simulationMode,
            connectionUptime: this.stats.connectionUptime ? Date.now() - this.stats.connectionUptime : 0
        };
    }
    
    /**
     * 현재 상태 반환
     */
    getState() {
        return {
            isConnected: this.isConnected,
            isSensorConnected: this.isSensorConnected,
            isMultiplayerMode: this.isMultiplayerMode,
            simulationMode: this.simulationMode,
            sessionId: this.sessionId,
            sessionCode: this.sessionCode,
            roomId: this.roomId,
            roomPassword: this.roomPassword,
            playerId: this.playerId,
            isHost: this.isHost,
            playerCount: this.players.size
        };
    }
    
    /**
     * 설정 업데이트
     */
    updateConfig(newConfig) {
        this.gameConfig = { ...this.gameConfig, ...newConfig };
        console.log('⚙️ 게임 설정 업데이트됨');
    }
    
    /**
     * SDK 정리
     */
    destroy() {
        if (this.socket) {
            this.socket.close();
        }
        
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        
        // 모든 콜백 정리
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = [];
        });
        
        console.log('🗑️ 센서 게임 SDK 정리 완료');
    }
}

// ========== 유틸리티 클래스 ==========

class SensorGameUtils {
    /**
     * 각도 정규화 (-180 ~ 180)
     */
    static normalizeAngle(angle) {
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;
        return angle;
    }
    
    /**
     * 값 클램핑
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    /**
     * 선형 보간
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * 벡터 크기 계산
     */
    static magnitude(vector) {
        if (vector.x !== undefined) {
            return Math.sqrt(vector.x ** 2 + vector.y ** 2 + (vector.z || 0) ** 2);
        }
        return 0;
    }
    
    /**
     * 두 벡터 간의 거리
     */
    static distance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const dz = (v1.z || 0) - (v2.z || 0);
        return Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
    }
    
    /**
     * 디바이스 타입 감지
     */
    static detectDevice() {
        const ua = navigator.userAgent;
        return {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
            isChrome: /Chrome/.test(ua),
            isFirefox: /Firefox/.test(ua)
        };
    }
    
    /**
     * 센서 지원 여부 확인
     */
    static checkSensorSupport() {
        return {
            orientation: 'DeviceOrientationEvent' in window,
            motion: 'DeviceMotionEvent' in window,
            permissions: 'DeviceOrientationEvent' in window && 
                        typeof DeviceOrientationEvent.requestPermission === 'function'
        };
    }
    
    /**
     * 랜덤 ID 생성
     */
    static generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * 딥 클론
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    /**
     * 디바운스
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * 스로틀
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 전역 객체로 등록
if (typeof window !== 'undefined') {
    window.SensorGameSDK = SensorGameSDK;
    window.SensorGameUtils = SensorGameUtils;
}

// Node.js 모듈 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SensorGameSDK, SensorGameUtils };
}