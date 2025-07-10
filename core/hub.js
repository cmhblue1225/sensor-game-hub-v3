/**
 * 센서 게임 허브 v3.0 - 메인 클라이언트 JavaScript
 * 완벽한 허브 UI 관리, 게임 목록, 룸 관리 등을 처리
 */

class SensorGameHub {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.clientId = null;
        this.deviceType = null; // desktop, mobile
        
        // 데이터 저장소
        this.games = new Map();
        this.rooms = new Map();
        this.currentFilter = 'all';
        
        // 상태 관리
        this.stats = {
            totalGames: 0,
            activeSessions: 0,
            activeRooms: 0,
            connectedClients: 0
        };
        
        // 재연결 관리
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        
        this.init();
    }
    
    /**
     * 허브 초기화
     */
    init() {
        console.log('🏠 센서 게임 허브 v3.0 초기화');
        
        // 디바이스 감지 및 UI 설정
        this.detectDevice();
        this.setupEventListeners();
        
        // 서버 연결
        this.connectToServer();
        
        // 데이터 로드
        this.loadGames();
        this.loadRooms();
        
        // 주기적 업데이트
        this.startPeriodicUpdates();
    }
    
    /**
     * 디바이스 감지
     */
    detectDevice() {
        const userAgent = navigator.userAgent;
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        
        // URL 파라미터로 강제 설정 가능
        const urlParams = new URLSearchParams(window.location.search);
        const forceDevice = urlParams.get('device');
        
        if (forceDevice) {
            this.deviceType = forceDevice;
        } else {
            this.deviceType = isMobile ? 'mobile' : 'desktop';
        }
        
        console.log(`📱 디바이스 감지: ${this.deviceType}`);
        this.showDeviceSelector();
    }
    
    /**
     * 디바이스 선택기 표시
     */
    showDeviceSelector() {
        const deviceOptions = document.querySelectorAll('.device-option');
        
        deviceOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedDevice = option.dataset.device;
                this.selectDevice(selectedDevice);
            });
            
            // 감지된 디바이스 하이라이트
            if (option.dataset.device === this.deviceType) {
                option.classList.add('selected');
            }
        });
    }
    
    /**
     * 디바이스 선택
     */
    selectDevice(deviceType) {
        this.deviceType = deviceType;
        
        // 선택 상태 업데이트
        document.querySelectorAll('.device-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-device="${deviceType}"]`).classList.add('selected');
        
        // 인터페이스 전환
        setTimeout(() => {
            this.showInterface(deviceType);
        }, 500);
    }
    
    /**
     * 인터페이스 표시
     */
    showInterface(deviceType) {
        document.getElementById('deviceDetector').classList.add('hidden');
        
        if (deviceType === 'desktop') {
            document.getElementById('desktopInterface').classList.remove('hidden');
        } else {
            document.getElementById('mobileInterface').classList.remove('hidden');
        }
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 게임 타입 탭
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                this.setGameFilter(filter);
                
                // 활성 탭 업데이트
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // 룸 관련 버튼
        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => this.showCreateRoomModal());
        }
        
        const refreshRoomsBtn = document.getElementById('refreshRoomsBtn');
        if (refreshRoomsBtn) {
            refreshRoomsBtn.addEventListener('click', () => this.loadRooms());
        }
        
        // 룸 생성 폼
        const createRoomForm = document.getElementById('createRoomForm');
        if (createRoomForm) {
            createRoomForm.addEventListener('submit', (e) => this.handleCreateRoom(e));
        }
    }
    
    /**
     * 서버 연결
     */
    connectToServer() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log(`🔗 서버 연결 시도: ${wsUrl}`);
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('✅ 허브 서버 연결 성공');
                
                // 허브 클라이언트로 등록
                this.registerHubClient();
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
                console.log('🔌 서버 연결 끊김');
                this.handleDisconnection();
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
            };
            
        } catch (error) {
            console.error('서버 연결 실패:', error);
        }
    }
    
    /**
     * 허브 클라이언트 등록
     */
    registerHubClient() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'register_hub_client',
                deviceType: this.deviceType,
                userAgent: navigator.userAgent,
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
                console.log(`✅ 허브 클라이언트 등록: ${this.clientId}`);
                break;
                
            case 'room_created':
                console.log('🏠 룸 생성 완료:', data);
                this.closeModal('createRoomModal');
                this.loadRooms();
                break;
                
            case 'room_list_updated':
                this.updateRoomList(data.rooms);
                break;
                
            case 'stats_update':
                this.updateStats(data.stats);
                break;
                
            default:
                console.log(`허브 메시지: ${data.type}`, data);
        }
    }
    
    /**
     * 연결 해제 처리
     */
    handleDisconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
                this.connectToServer();
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    }
    
    /**
     * 게임 목록 로드
     */
    async loadGames() {
        try {
            const response = await fetch('/api/games');
            const data = await response.json();
            
            if (data.success) {
                this.games.clear();
                data.games.forEach(game => {
                    this.games.set(game.id, game);
                });
                
                this.renderGames();
                this.updateStats({ totalGames: data.games.length });
                
                console.log(`📋 게임 목록 로드 완료: ${data.games.length}개`);
            }
        } catch (error) {
            console.error('게임 목록 로드 실패:', error);
        }
    }
    
    /**
     * 룸 목록 로드
     */
    async loadRooms() {
        try {
            const response = await fetch('/api/rooms');
            const data = await response.json();
            
            if (data.success) {
                this.updateRoomList(data.rooms);
                this.updateStats({ activeRooms: data.rooms.length });
                
                console.log(`🏠 룸 목록 로드 완료: ${data.rooms.length}개`);
            }
        } catch (error) {
            console.error('룸 목록 로드 실패:', error);
        }
    }
    
    /**
     * 게임 렌더링
     */
    renderGames() {
        this.renderSinglePlayerGames();
        this.renderMultiPlayerGames();
        this.updateRoomGameSelect();
    }
    
    /**
     * 싱글플레이어 게임 렌더링
     */
    renderSinglePlayerGames() {
        const container = document.getElementById('singlePlayerGames');
        if (!container) return;
        
        container.innerHTML = '';
        
        const singlePlayerGames = Array.from(this.games.values())
            .filter(game => game.gameType !== 'multiplayer')
            .filter(game => this.currentFilter === 'all' || game.category === this.currentFilter);
        
        singlePlayerGames.forEach(game => {
            const gameCard = this.createGameCard(game, 'single');
            container.appendChild(gameCard);
        });
        
        if (singlePlayerGames.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">해당 카테고리에 게임이 없습니다.</p>';
        }
    }
    
    /**
     * 멀티플레이어 게임 렌더링
     */
    renderMultiPlayerGames() {
        const container = document.getElementById('multiPlayerGames');
        if (!container) return;
        
        container.innerHTML = '';
        
        const multiPlayerGames = Array.from(this.games.values())
            .filter(game => game.gameType === 'multiplayer');
        
        multiPlayerGames.forEach(game => {
            const gameCard = this.createGameCard(game, 'multi');
            container.appendChild(gameCard);
        });
        
        if (multiPlayerGames.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">멀티플레이어 게임이 없습니다.</p>';
        }
    }
    
    /**
     * 게임 카드 생성
     */
    createGameCard(game, type) {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        const difficulty = this.getDifficultyDisplay(game.difficulty);
        const features = game.features || [];
        
        card.innerHTML = `
            <div class="game-header">
                <div class="game-icon">${game.icon || '🎮'}</div>
                <div class="game-info">
                    <h3>${game.name}</h3>
                    <div class="game-meta">
                        <span>카테고리: ${game.category || '일반'}</span>
                        <span>난이도: ${difficulty}</span>
                        ${game.maxPlayers ? `<span>최대 ${game.maxPlayers}명</span>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="game-description">
                ${game.description || '게임 설명이 없습니다.'}
            </div>
            
            <div class="game-features">
                ${features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
            </div>
            
            <div class="game-actions">
                ${type === 'single' ? 
                    `<button class="btn btn-primary" onclick="hub.playGame('${game.id}')">
                        <span>🎯</span> 게임 시작
                    </button>` :
                    `<button class="btn btn-primary" onclick="hub.createGameRoom('${game.id}')">
                        <span>🏠</span> 룸 생성
                    </button>`
                }
                <button class="btn btn-secondary" onclick="hub.showGameInfo('${game.id}')">
                    <span>ℹ️</span> 정보
                </button>
            </div>
        `;
        
        return card;
    }
    
    /**
     * 난이도 표시 변환
     */
    getDifficultyDisplay(difficulty) {
        const difficultyMap = {
            easy: '⭐ 쉬움',
            medium: '⭐⭐ 보통',
            hard: '⭐⭐⭐ 어려움',
            expert: '⭐⭐⭐⭐ 전문가'
        };
        return difficultyMap[difficulty] || '⭐ 알 수 없음';
    }
    
    /**
     * 게임 필터 설정
     */
    setGameFilter(filter) {
        this.currentFilter = filter;
        this.renderSinglePlayerGames();
    }
    
    /**
     * 룸 목록 업데이트
     */
    updateRoomList(rooms) {
        const container = document.getElementById('roomList');
        if (!container) return;
        
        this.rooms.clear();
        container.innerHTML = '';
        
        if (rooms.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">현재 활성 룸이 없습니다.</p>';
            return;
        }
        
        rooms.forEach(room => {
            this.rooms.set(room.roomId, room);
            const roomCard = this.createRoomCard(room);
            container.appendChild(roomCard);
        });
    }
    
    /**
     * 룸 카드 생성
     */
    createRoomCard(room) {
        const card = document.createElement('div');
        card.className = 'room-card';
        
        const game = this.games.get(room.gameId);
        const gameName = game ? game.name : '알 수 없는 게임';
        const gameIcon = game ? game.icon : '🎮';
        
        const timeAgo = this.getTimeAgo(room.createdAt);
        
        card.innerHTML = `
            <div class="room-info">
                <h4>${gameIcon} ${gameName}</h4>
                <div class="room-meta">
                    ${room.currentPlayers}/${room.maxPlayers}명 • ${timeAgo}
                </div>
            </div>
            <div>
                <button class="btn btn-secondary" onclick="hub.showRoomInfo('${room.roomId}')">
                    참가하기
                </button>
            </div>
        `;
        
        return card;
    }
    
    /**
     * 시간 경과 표시
     */
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전`;
        
        const days = Math.floor(hours / 24);
        return `${days}일 전`;
    }
    
    /**
     * 룸 게임 선택 업데이트
     */
    updateRoomGameSelect() {
        const select = document.getElementById('roomGameSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">게임을 선택하세요</option>';
        
        const multiPlayerGames = Array.from(this.games.values())
            .filter(game => game.gameType === 'multiplayer');
        
        multiPlayerGames.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = `${game.icon || '🎮'} ${game.name}`;
            select.appendChild(option);
        });
    }
    
    /**
     * 통계 업데이트
     */
    updateStats(newStats) {
        Object.assign(this.stats, newStats);
        
        const elements = {
            totalGames: document.getElementById('totalGames'),
            activeSessions: document.getElementById('activeSessions'),
            activeRooms: document.getElementById('activeRooms'),
            connectedClients: document.getElementById('connectedClients')
        };
        
        Object.entries(elements).forEach(([key, element]) => {
            if (element && this.stats[key] !== undefined) {
                element.textContent = this.stats[key];
            }
        });
    }
    
    /**
     * 주기적 업데이트 시작
     */
    startPeriodicUpdates() {
        // 30초마다 룸 목록 갱신
        setInterval(() => {
            if (this.isConnected) {
                this.loadRooms();
            }
        }, 30000);
        
        // 60초마다 서버 상태 확인
        setInterval(() => {
            this.loadServerStats();
        }, 60000);
    }
    
    /**
     * 서버 상태 로드
     */
    async loadServerStats() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.success) {
                this.updateStats({
                    totalGames: data.status.totalGames,
                    activeSessions: data.status.activeSessions,
                    activeRooms: data.status.activeRooms,
                    connectedClients: data.status.connectedClients
                });
            }
        } catch (error) {
            console.error('서버 상태 로드 실패:', error);
        }
    }
    
    // ========== 공개 메서드들 ==========
    
    /**
     * 게임 시작 (싱글플레이어)
     */
    playGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            console.error('게임을 찾을 수 없습니다:', gameId);
            return;
        }
        
        console.log(`🎯 게임 시작: ${game.name}`);
        window.open(`/game/${gameId}`, '_blank');
    }
    
    /**
     * 게임 룸 생성 (멀티플레이어)
     */
    createGameRoom(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            console.error('게임을 찾을 수 없습니다:', gameId);
            return;
        }
        
        // 룸 생성 모달에서 게임 선택
        const select = document.getElementById('roomGameSelect');
        if (select) {
            select.value = gameId;
        }
        
        this.showCreateRoomModal();
    }
    
    /**
     * 룸 생성 모달 표시
     */
    showCreateRoomModal() {
        const modal = document.getElementById('createRoomModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    /**
     * 룸 생성 처리
     */
    handleCreateRoom(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const gameId = document.getElementById('roomGameSelect').value;
        const maxPlayers = parseInt(document.getElementById('maxPlayersSelect').value);
        const roomName = document.getElementById('roomNameInput').value.trim();
        
        if (!gameId) {
            alert('게임을 선택해주세요.');
            return;
        }
        
        const roomData = {
            gameId: gameId,
            maxPlayers: maxPlayers,
            roomName: roomName || undefined
        };
        
        // 서버에 룸 생성 요청
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'create_room',
                gameId: gameId,
                settings: roomData,
                timestamp: Date.now()
            }));
        } else {
            alert('서버에 연결되어 있지 않습니다.');
        }
    }
    
    /**
     * 게임 정보 표시
     */
    showGameInfo(gameId) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        alert(`
게임: ${game.name}
카테고리: ${game.category || '일반'}
난이도: ${this.getDifficultyDisplay(game.difficulty)}
설명: ${game.description || '설명이 없습니다.'}
버전: ${game.version || '1.0.0'}
        `.trim());
    }
    
    /**
     * 룸 정보 표시 (참가 기능)
     */
    showRoomInfo(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        // 모바일 센서 클라이언트로 리다이렉트 (룸 정보와 함께)
        const url = `/sensor?room=${roomId}`;
        window.open(url, '_blank');
    }
    
    /**
     * 모달 닫기
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// 전역 함수들
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 허브 인스턴스 생성
let hub;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 센서 게임 허브 v3.0 로딩 완료');
    hub = new SensorGameHub();
    
    // 전역 접근을 위해 window 객체에 등록
    window.hub = hub;
});

// 모달 외부 클릭 시 닫기
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});