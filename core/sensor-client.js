/**
 * 센서 클라이언트 v3.0 - JavaScript
 * 완벽한 4자리 세션 코드 + 멀티플레이어 지원
 */

class SensorClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.clientId = null;
        this.deviceId = 'sensor-' + Math.random().toString(36).substr(2, 9);
        
        // 연결 상태
        this.connectionState = 'disconnected'; // disconnected, connecting, connected
        this.isTransmitting = false;
        
        // 세션 관리 (4자리 코드)
        this.sessionState = {
            sessionCode: null,
            sessionId: null,
            isConnected: false,
            gameId: null,
            gameName: null
        };
        
        // 멀티플레이어 상태 (4자리 룸 비밀번호)
        this.multiplayerState = {
            roomId: null,
            roomPassword: null,
            playerId: null,
            nickname: null,
            isInRoom: false,
            isReady: false,
            players: new Map()
        };
        
        // 센서 데이터
        this.sensorData = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 },
            gyroscope: { alpha: 0, beta: 0, gamma: 0 },
            timestamp: 0
        };
        
        // 센서 지원 여부
        this.sensorSupport = {
            orientation: false,
            accelerometer: false,
            gyroscope: false,
            permissions: false
        };
        
        // 보정값
        this.calibration = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 }
        };
        
        // 성능 통계
        this.stats = {
            totalPackets: 0,
            packetsPerSecond: 0,
            lastSecondPackets: 0,
            lastSecondTime: Date.now(),
            latency: 0
        };
        
        // 재연결 관리
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        
        this.init();
    }
    
    /**
     * 클라이언트 초기화
     */
    init() {
        console.log('📱 센서 클라이언트 v3.0 초기화');
        
        // 센서 지원 여부 확인
        this.checkSensorSupport();
        
        // UI 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 탭 시스템 초기화
        this.setupTabSystem();
        
        // URL 파라미터 확인 (룸 정보가 있는 경우)
        this.checkURLParameters();
        
        // 서버 연결
        this.connectToServer();
        
        // 센서 시작 시도 (권한 요청)
        this.startSensorListening();
        
        // 성능 모니터링 시작
        this.startPerformanceMonitoring();
    }
    
    /**
     * 센서 지원 여부 확인
     */
    checkSensorSupport() {
        this.sensorSupport.orientation = 'DeviceOrientationEvent' in window;
        this.sensorSupport.accelerometer = 'DeviceMotionEvent' in window;
        this.sensorSupport.gyroscope = 'DeviceMotionEvent' in window;
        this.sensorSupport.permissions = 'DeviceOrientationEvent' in window && 
                                        typeof DeviceOrientationEvent.requestPermission === 'function';
        
        console.log('📊 센서 지원 상태:', this.sensorSupport);
        
        if (!this.sensorSupport.orientation && !this.sensorSupport.accelerometer) {
            this.showMessage('⚠️ 이 디바이스는 센서를 지원하지 않습니다.', 'error');
        }
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 세션 코드 입력
        const sessionCodeInput = document.getElementById('sessionCodeInput');
        const connectSessionBtn = document.getElementById('connectSessionBtn');
        
        if (sessionCodeInput) {
            sessionCodeInput.addEventListener('input', (e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = value;
                
                connectSessionBtn.disabled = value.length !== 4 || !this.isConnected;
                
                // 4자리 입력 완료 시 자동 연결
                if (value.length === 4 && this.isConnected) {
                    setTimeout(() => this.connectToSession(), 500);
                }
            });
            
            sessionCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && sessionCodeInput.value.length === 4) {
                    this.connectToSession();
                }
            });
        }
        
        if (connectSessionBtn) {
            connectSessionBtn.addEventListener('click', () => this.connectToSession());
        }
        
        // 멀티플레이어 입력
        const nicknameInput = document.getElementById('nicknameInput');
        const roomPasswordInput = document.getElementById('roomPasswordInput');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const leaveRoomBtn = document.getElementById('leaveRoomBtn');
        
        if (roomPasswordInput) {
            roomPasswordInput.addEventListener('input', (e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = value;
                this.updateJoinRoomButton();
            });
        }
        
        if (nicknameInput) {
            nicknameInput.addEventListener('input', () => this.updateJoinRoomButton());
        }
        
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => this.joinRoom());
        }
        
        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        }
        
        // 센서 보정
        const calibrateBtn = document.getElementById('calibrateBtn');
        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', () => this.calibrateSensors());
        }
    }
    
    /**
     * 탭 시스템 설정
     */
    setupTabSystem() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // 탭 버튼 활성화 상태 변경
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // 탭 콘텐츠 표시/숨김
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab + 'Tab') {
                        content.classList.add('active');
                    }
                });
            });
        });
    }
    
    /**
     * URL 파라미터 확인
     */
    checkURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        
        if (roomId) {
            // 멀티플레이어 탭으로 전환
            document.querySelector('[data-tab="multiplayer"]').click();
            this.showMessage('🎮 멀티플레이어 룸에 참가할 수 있습니다.', 'success');
        }
    }
    
    /**
     * 서버 연결
     */
    connectToServer() {
        try {
            this.connectionState = 'connecting';
            this.updateConnectionStatus('🔄', '서버 연결 중...', '연결을 시도하고 있습니다');
            
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log(`🔗 서버 연결 시도: ${wsUrl}`);
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.connectionState = 'connected';
                this.reconnectAttempts = 0;
                
                console.log('✅ 센서 서버 연결 성공');
                this.updateConnectionStatus('🟢', '서버 연결됨', '센서 데이터 전송 준비 완료');
                
                // 센서 클라이언트로 등록
                this.registerSensorClient();
                
                // 버튼 상태 업데이트
                this.updateButtonStates();
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
                this.updateConnectionStatus('🔴', '연결 끊김', '서버와의 연결이 끊어졌습니다');
                this.handleDisconnection();
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                this.updateConnectionStatus('❌', '연결 오류', '서버 연결에 실패했습니다');
            };
            
        } catch (error) {
            console.error('서버 연결 실패:', error);
            this.updateConnectionStatus('❌', '연결 실패', error.message);
        }
    }
    
    /**
     * 센서 클라이언트 등록
     */
    registerSensorClient() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'register_sensor_client',
                deviceId: this.deviceId,
                userAgent: navigator.userAgent,
                supportedSensors: Object.keys(this.sensorSupport).filter(key => this.sensorSupport[key]),
                version: '3.0.0',
                timestamp: Date.now()
            }));
        }
    }
    
    /**
     * 서버 메시지 처리
     */
    handleServerMessage(data) {
        switch (data.type) {
            case 'registration_success':
                this.clientId = data.clientId;
                console.log(`✅ 센서 클라이언트 등록: ${this.clientId}`);
                break;
                
            case 'session_joined':
                this.sessionState.sessionId = data.sessionId;
                this.sessionState.gameId = data.gameId;
                this.sessionState.isConnected = true;
                
                console.log(`🎯 세션 연결 성공: ${data.sessionCode}`);
                this.showMessage('🎉 게임에 성공적으로 연결되었습니다!', 'success');
                this.updateConnectedInfo('session', data.sessionCode, data.gameId);
                this.startSensorTransmission();
                break;
                
            case 'session_join_failed':
                console.log(`❌ 세션 연결 실패: ${data.error}`);
                this.showMessage(`❌ ${data.error}`, 'error');
                this.shakeInput('sessionCodeInput');
                break;
                
            case 'room_joined':
                this.multiplayerState.roomId = data.roomId;
                this.multiplayerState.playerId = data.playerId;
                this.multiplayerState.isInRoom = true;
                
                console.log(`🏠 룸 참가 성공: ${data.roomId}`);
                this.showMessage('🎉 룸에 성공적으로 참가했습니다!', 'success');
                this.updateConnectedInfo('multiplayer', this.multiplayerState.roomPassword, data.roomData.gameId);
                this.updateMultiplayerUI(data.roomData);
                break;
                
            case 'room_join_failed':
                console.log(`❌ 룸 참가 실패: ${data.error}`);
                this.showMessage(`❌ ${data.error}`, 'error');
                this.shakeInput('roomPasswordInput');
                break;
                
            case 'player_joined':
                console.log(`👤 새 플레이어 참가: ${data.nickname}`);
                this.showMessage(`👤 ${data.nickname}님이 참가했습니다`, 'success');
                break;
                
            case 'player_left':
                console.log(`👤 플레이어 퇴장: ${data.nickname}`);
                this.showMessage(`👤 ${data.nickname}님이 나갔습니다`, 'error');
                break;
                
            case 'room_closed':
                console.log(`🏠 룸 종료: ${data.reason}`);
                this.showMessage('🏠 룸이 종료되었습니다', 'error');
                this.resetMultiplayerState();
                break;
                
            case 'pong':
                this.updateLatencyStats(data);
                break;
                
            default:
                console.log(`센서 메시지: ${data.type}`, data);
        }
    }
    
    /**
     * 연결 해제 처리
     */
    handleDisconnection() {
        this.updateButtonStates();
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
                if (this.connectionState === 'disconnected') {
                    this.connectToServer();
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            this.showMessage('🔌 서버 연결에 실패했습니다. 페이지를 새로고침해주세요.', 'error');
        }
    }
    
    /**
     * 4자리 세션 코드로 연결
     */
    connectToSession() {
        const sessionCodeInput = document.getElementById('sessionCodeInput');
        const sessionCode = sessionCodeInput.value.trim();
        
        if (sessionCode.length !== 4) {
            this.showMessage('4자리 세션 코드를 입력해주세요.', 'error');
            this.shakeInput('sessionCodeInput');
            return;
        }
        
        if (!this.isConnected) {
            this.showMessage('서버에 연결되어 있지 않습니다.', 'error');
            return;
        }
        
        this.sessionState.sessionCode = sessionCode;
        
        this.socket.send(JSON.stringify({
            type: 'join_session_code',
            sessionCode: sessionCode,
            deviceId: this.deviceId,
            timestamp: Date.now()
        }));
        
        console.log(`🎯 세션 연결 요청: ${sessionCode}`);
        this.showMessage('🔄 게임에 연결 중...', 'info');
    }
    
    /**
     * 멀티플레이어 룸 참가
     */
    joinRoom() {
        const nicknameInput = document.getElementById('nicknameInput');
        const roomPasswordInput = document.getElementById('roomPasswordInput');
        
        const nickname = nicknameInput.value.trim();
        const roomPassword = roomPasswordInput.value.trim();
        
        if (!nickname) {
            this.showMessage('닉네임을 입력해주세요.', 'error');
            nicknameInput.focus();
            return;
        }
        
        if (roomPassword.length !== 4) {
            this.showMessage('4자리 룸 비밀번호를 입력해주세요.', 'error');
            this.shakeInput('roomPasswordInput');
            return;
        }
        
        if (!this.isConnected) {
            this.showMessage('서버에 연결되어 있지 않습니다.', 'error');
            return;
        }
        
        this.multiplayerState.nickname = nickname;
        this.multiplayerState.roomPassword = roomPassword;
        
        this.socket.send(JSON.stringify({
            type: 'join_room',
            password: roomPassword,
            nickname: nickname,
            deviceId: this.deviceId,
            timestamp: Date.now()
        }));
        
        console.log(`🏠 룸 참가 요청: ${roomPassword} (${nickname})`);
        this.showMessage('🔄 룸에 참가 중...', 'info');
    }
    
    /**
     * 룸 나가기
     */
    leaveRoom() {
        if (this.multiplayerState.isInRoom) {
            this.socket.send(JSON.stringify({
                type: 'leave_room',
                roomId: this.multiplayerState.roomId,
                playerId: this.multiplayerState.playerId,
                timestamp: Date.now()
            }));
        }
        
        this.resetMultiplayerState();
        this.showMessage('🚪 룸에서 나갔습니다.', 'info');
    }
    
    /**
     * 센서 듣기 시작
     */
    async startSensorListening() {
        try {
            // iOS 권한 요청
            if (this.sensorSupport.permissions) {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission !== 'granted') {
                    this.showMessage('⚠️ 센서 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.', 'error');
                    return;
                }
            }
            
            // 방향 센서 리스너
            if (this.sensorSupport.orientation) {
                window.addEventListener('deviceorientation', (event) => {
                    this.sensorData.orientation = {
                        alpha: event.alpha || 0,
                        beta: event.beta || 0,
                        gamma: event.gamma || 0
                    };
                    this.updateSensorDisplay();
                });
                console.log('📱 방향 센서 활성화');
            }
            
            // 모션 센서 리스너
            if (this.sensorSupport.accelerometer) {
                window.addEventListener('devicemotion', (event) => {
                    if (event.acceleration) {
                        this.sensorData.accelerometer = {
                            x: event.acceleration.x || 0,
                            y: event.acceleration.y || 0,
                            z: event.acceleration.z || 0
                        };
                    }
                    
                    if (event.rotationRate) {
                        this.sensorData.gyroscope = {
                            alpha: event.rotationRate.alpha || 0,
                            beta: event.rotationRate.beta || 0,
                            gamma: event.rotationRate.gamma || 0
                        };
                    }
                    
                    this.updateSensorDisplay();
                });
                console.log('📱 모션 센서 활성화');
            }
            
            this.showMessage('📱 센서가 활성화되었습니다!', 'success');
            
        } catch (error) {
            console.error('센서 시작 실패:', error);
            this.showMessage('❌ 센서 시작에 실패했습니다: ' + error.message, 'error');
        }
    }
    
    /**
     * 센서 데이터 전송 시작
     */
    startSensorTransmission() {
        if (this.isTransmitting) return;
        
        this.isTransmitting = true;
        console.log('📡 센서 데이터 전송 시작');
        
        const transmitInterval = setInterval(() => {
            if (!this.isConnected || (!this.sessionState.isConnected && !this.multiplayerState.isInRoom)) {
                clearInterval(transmitInterval);
                this.isTransmitting = false;
                console.log('📡 센서 데이터 전송 중지');
                return;
            }
            
            this.transmitSensorData();
        }, 1000 / 60); // 60 FPS
    }
    
    /**
     * 센서 데이터 전송
     */
    transmitSensorData() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        // 보정값 적용
        const calibratedData = {
            orientation: {
                alpha: this.sensorData.orientation.alpha - this.calibration.orientation.alpha,
                beta: this.sensorData.orientation.beta - this.calibration.orientation.beta,
                gamma: this.sensorData.orientation.gamma - this.calibration.orientation.gamma
            },
            accelerometer: {
                x: this.sensorData.accelerometer.x - this.calibration.accelerometer.x,
                y: this.sensorData.accelerometer.y - this.calibration.accelerometer.y,
                z: this.sensorData.accelerometer.z - this.calibration.accelerometer.z
            },
            gyroscope: this.sensorData.gyroscope,
            timestamp: Date.now()
        };
        
        if (this.sessionState.isConnected) {
            // 세션 모드
            this.socket.send(JSON.stringify({
                type: 'sensor_data',
                sessionId: this.sessionState.sessionId,
                sensorData: calibratedData,
                timestamp: Date.now()
            }));
        } else if (this.multiplayerState.isInRoom) {
            // 멀티플레이어 모드
            this.socket.send(JSON.stringify({
                type: 'multiplayer_sensor_data',
                roomId: this.multiplayerState.roomId,
                playerId: this.multiplayerState.playerId,
                sensorData: calibratedData,
                timestamp: Date.now()
            }));
        }
        
        this.stats.totalPackets++;
    }
    
    /**
     * 센서 보정
     */
    calibrateSensors() {
        this.calibration.orientation = { ...this.sensorData.orientation };
        this.calibration.accelerometer = { ...this.sensorData.accelerometer };
        
        console.log('⚖️ 센서 보정 완료:', this.calibration);
        this.showMessage('⚖️ 센서 보정이 완료되었습니다!', 'success');
    }
    
    /**
     * 센서 표시 업데이트
     */
    updateSensorDisplay() {
        // 방향 센서
        const elements = {
            orientationAlpha: document.getElementById('orientationAlpha'),
            orientationBeta: document.getElementById('orientationBeta'),
            orientationGamma: document.getElementById('orientationGamma'),
            accelerometerX: document.getElementById('accelerometerX'),
            accelerometerY: document.getElementById('accelerometerY'),
            accelerometerZ: document.getElementById('accelerometerZ'),
            gyroscopeAlpha: document.getElementById('gyroscopeAlpha'),
            gyroscopeBeta: document.getElementById('gyroscopeBeta'),
            gyroscopeGamma: document.getElementById('gyroscopeGamma')
        };
        
        if (elements.orientationAlpha) {
            elements.orientationAlpha.textContent = Math.round(this.sensorData.orientation.alpha) + '°';
            elements.orientationBeta.textContent = Math.round(this.sensorData.orientation.beta) + '°';
            elements.orientationGamma.textContent = Math.round(this.sensorData.orientation.gamma) + '°';
        }
        
        if (elements.accelerometerX) {
            elements.accelerometerX.textContent = this.sensorData.accelerometer.x.toFixed(1);
            elements.accelerometerY.textContent = this.sensorData.accelerometer.y.toFixed(1);
            elements.accelerometerZ.textContent = this.sensorData.accelerometer.z.toFixed(1);
        }
        
        if (elements.gyroscopeAlpha) {
            elements.gyroscopeAlpha.textContent = this.sensorData.gyroscope.alpha.toFixed(1);
            elements.gyroscopeBeta.textContent = this.sensorData.gyroscope.beta.toFixed(1);
            elements.gyroscopeGamma.textContent = this.sensorData.gyroscope.gamma.toFixed(1);
        }
        
        // 기울기 시각화
        this.updateTiltIndicator();
    }
    
    /**
     * 기울기 시각화 업데이트
     */
    updateTiltIndicator() {
        const tiltDot = document.getElementById('tiltDot');
        if (!tiltDot) return;
        
        const { beta, gamma } = this.sensorData.orientation;
        
        // -90 ~ 90도를 -50 ~ 50픽셀로 변환
        const x = Math.max(-50, Math.min(50, (gamma / 90) * 50));
        const y = Math.max(-50, Math.min(50, (beta / 90) * 50));
        
        tiltDot.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
    
    /**
     * 연결 상태 업데이트
     */
    updateConnectionStatus(icon, text, details) {
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        const statusDetails = document.getElementById('statusDetails');
        
        if (statusIcon) statusIcon.textContent = icon;
        if (statusText) statusText.textContent = text;
        if (statusDetails) statusDetails.textContent = details;
    }
    
    /**
     * 버튼 상태 업데이트
     */
    updateButtonStates() {
        const connectSessionBtn = document.getElementById('connectSessionBtn');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const calibrateBtn = document.getElementById('calibrateBtn');
        
        const sessionCodeLength = document.getElementById('sessionCodeInput')?.value.length || 0;
        
        if (connectSessionBtn) {
            connectSessionBtn.disabled = !this.isConnected || sessionCodeLength !== 4 || this.sessionState.isConnected;
        }
        
        if (calibrateBtn) {
            calibrateBtn.disabled = !this.sessionState.isConnected && !this.multiplayerState.isInRoom;
        }
        
        this.updateJoinRoomButton();
    }
    
    /**
     * 룸 참가 버튼 상태 업데이트
     */
    updateJoinRoomButton() {
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const leaveRoomBtn = document.getElementById('leaveRoomBtn');
        
        if (!joinRoomBtn || !leaveRoomBtn) return;
        
        const nickname = document.getElementById('nicknameInput')?.value.trim() || '';
        const roomPassword = document.getElementById('roomPasswordInput')?.value.trim() || '';
        
        joinRoomBtn.disabled = !this.isConnected || !nickname || roomPassword.length !== 4 || this.multiplayerState.isInRoom;
        leaveRoomBtn.disabled = !this.multiplayerState.isInRoom;
    }
    
    /**
     * 연결 정보 업데이트
     */
    updateConnectedInfo(mode, code, gameId) {
        const connectedInfo = document.getElementById('connectedInfo');
        const connectionMode = document.getElementById('connectionMode');
        const connectedGame = document.getElementById('connectedGame');
        const connectedCode = document.getElementById('connectedCode');
        
        if (connectedInfo) connectedInfo.classList.remove('hidden');
        if (connectionMode) connectionMode.textContent = mode === 'session' ? '🎯 세션 연결' : '🎮 멀티플레이어';
        if (connectedGame) connectedGame.textContent = gameId || '알 수 없음';
        if (connectedCode) connectedCode.textContent = code || '-';
        
        this.updateButtonStates();
    }
    
    /**
     * 멀티플레이어 UI 업데이트
     */
    updateMultiplayerUI(roomData) {
        const playerCountRow = document.getElementById('playerCountRow');
        const playerCount = document.getElementById('playerCount');
        
        if (playerCountRow) playerCountRow.style.display = 'flex';
        if (playerCount) playerCount.textContent = `${roomData.currentPlayers}/${roomData.maxPlayers}`;
        
        this.updateButtonStates();
    }
    
    /**
     * 멀티플레이어 상태 초기화
     */
    resetMultiplayerState() {
        this.multiplayerState = {
            roomId: null,
            roomPassword: null,
            playerId: null,
            nickname: null,
            isInRoom: false,
            isReady: false,
            players: new Map()
        };
        
        const connectedInfo = document.getElementById('connectedInfo');
        const playerCountRow = document.getElementById('playerCountRow');
        
        if (connectedInfo) connectedInfo.classList.add('hidden');
        if (playerCountRow) playerCountRow.style.display = 'none';
        
        this.updateButtonStates();
    }
    
    /**
     * 메시지 표시
     */
    showMessage(message, type = 'info', duration = 3000) {
        const messageArea = document.getElementById('messageArea');
        if (!messageArea) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        messageArea.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, duration);
    }
    
    /**
     * 입력 필드 흔들기 애니메이션
     */
    shakeInput(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.add('shake');
            setTimeout(() => {
                input.classList.remove('shake');
            }, 500);
        }
    }
    
    /**
     * 성능 모니터링 시작
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            const now = Date.now();
            const timeDiff = now - this.stats.lastSecondTime;
            
            if (timeDiff >= 1000) {
                this.stats.packetsPerSecond = this.stats.lastSecondPackets;
                this.stats.lastSecondPackets = 0;
                this.stats.lastSecondTime = now;
            }
        }, 1000);
    }
    
    /**
     * 지연시간 통계 업데이트
     */
    updateLatencyStats(data) {
        this.stats.latency = Date.now() - data.timestamp;
    }
}

// 센서 클라이언트 인스턴스 생성
let sensorClient;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 센서 클라이언트 v3.0 로딩 완료');
    sensorClient = new SensorClient();
    
    // 전역 접근을 위해 window 객체에 등록
    window.sensorClient = sensorClient;
});