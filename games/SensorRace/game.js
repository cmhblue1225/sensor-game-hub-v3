/**
 * 센서 게임 템플릿 v3.0
 * 개발자들이 쉽게 확장할 수 있는 기본 게임 구조
 */

class SensorRaceGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'sensor-race',
            gameName: '🚀 센서 레이스',
            gameType: 'multiplayer', // 'single' 또는 'multiplayer'
            version: '1.0.0',
            
            // 센서 설정
            requestedSensors: ['orientation'], // 기울기 센서만 사용
            sensorSensitivity: {
                orientation: 0.8
            },
            
            // 데이터 처리 설정
            smoothingFactor: 3,
            deadzone: 0.05, // 더 민감하게 조정
            updateRate: 60,
            
            // 멀티플레이어 설정
            maxPlayers: 8,
            minPlayers: 2
        });
        
        // 게임 상태
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            score: 0,
            level: 1,
            lives: 3,
            timeLeft: 60,
            players: {}, // 모든 플레이어의 상태를 저장
            hostId: null, // 호스트 플레이어 ID
            gameStarted: false, // 게임 시작 여부
            raceTrack: [], // 레이스 트랙 정보
            finishLine: null, // 결승선 정보
            playerRank: {}, // 플레이어 순위
            playerFinishedCount: 0 // 결승선 통과 플레이어 수
        };
        
        // 현재 플레이어 객체 (자신)
        this.player = {
            id: null, // 자신의 플레이어 ID
            x: 0,
            y: 0,
            width: 40,
            height: 40,
            velocity: { x: 0, y: 0 },
            color: '#6366f1',
            finished: false,
            rank: null
        };
        
        this.collectibles = [];
        this.obstacles = [];
        this.particles = [];
        
        // 게임 설정
        this.config = {
            playerSpeed: 5,
            gravity: 0.2,
            friction: 0.95,
            boundaryBounce: 0.8
        };
        
        // 렌더링
        this.canvas = null;
        this.ctx = null;
        this.lastFrameTime = 0;
        this.gameLoopId = null;
        
        this.init();
    }
    
    /**
     * 게임 초기화
     */
    init() {
        console.log('🎮 Sensor Race 초기화');
        
        // 캔버스 설정
        this.setupCanvas();
        
        // SDK 콜백 등록
        this.setupCallbacks();
        
        // 게임 월드 초기화
        this.initializeGameWorld();
        
        // 키보드 입력 설정 (시뮬레이션 모드)
        this.setupKeyboardControls();

        // 자신의 플레이어 ID 설정 (SDK에서 할당)
        this.on('onPlayerIdAssigned', (id) => {
            this.player.id = id;
            console.log(`내 플레이어 ID: ${this.player.id}`);
        });
    }
    
    /**
     * 캔버스 설정
     */
    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('게임 캔버스를 찾을 수 없습니다.');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // 캔버스 크기를 화면에 맞춤
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    /**
     * 캔버스 크기 조정
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // 플레이어 초기 위치 설정
        this.player.x = rect.width / 2;
        this.player.y = rect.height / 2;
    }
    
    /**
     * SDK 콜백 설정
     */
    setupCallbacks() {
        // 센서 데이터 수신
        this.on('onSensorData', (data) => {
            if (this.gameState.isPlaying) {
                this.handleSensorInput(data.gameInput);
            }
        });
        
        // 연결 상태 변경
        this.on('onConnectionChange', (isConnected) => {
            this.updateSensorStatus(isConnected);
        });
        
        // 세션 코드 생성
        this.on('onSessionCodeCreated', (data) => {
            this.showSessionCode(data.sessionCode);
        });
        
        // 센서 연결
        this.on('onSensorConnected', (data) => {
            this.hideSessionCode();
            this.updateSensorStatus(true);
            this.showMessage('📱 센서 연결됨! 게임을 시작하세요.', 'success');
        });
        
        // 센서 연결 해제
        this.on('onSensorDisconnected', () => {
            this.updateSensorStatus(false);
            this.showMessage('📱 센서 연결 해제됨', 'warning');
        });
        
        // 보정 완료
        this.on('onCalibration', () => {
            this.showMessage('⚖️ 센서 보정 완료!', 'success');
        });
        
        // 오류 처리
        this.on('onError', (error) => {
            console.error('게임 오류:', error);
            this.showMessage('❌ 오류: ' + error.message, 'error');
        });

        // 멀티플레이어 콜백
        this.on('onRoomCreated', (data) => {
            this.gameState.hostId = data.playerId;
            this.player.id = data.playerId;
            this.gameState.players[data.playerId] = { ...this.player, name: '나', color: this.playerColors[0] };
            this.updatePlayerList();
            this.showMessage(`룸 생성됨! 코드: ${data.sessionCode}`, 'info');
        });

        this.on('onPlayerJoined', (data) => {
            const playerColorIndex = Object.keys(this.gameState.players).length % this.playerColors.length;
            this.gameState.players[data.playerId] = { 
                id: data.playerId, 
                x: 0, y: 0, 
                width: 40, height: 40, 
                velocity: { x: 0, y: 0 }, 
                color: this.playerColors[playerColorIndex],
                name: `플레이어 ${Object.keys(this.gameState.players).length + 1}`,
                finished: false,
                rank: null
            };
            this.updatePlayerList();
            this.showMessage(`${data.playerId}님 참가!`, 'info');
        });

        this.on('onPlayerLeft', (data) => {
            delete this.gameState.players[data.playerId];
            this.updatePlayerList();
            this.showMessage(`${data.playerId}님 퇴장!`, 'warning');
        });

        this.on('onGameStart', () => {
            this.gameState.gameStarted = true;
            this.start();
            this.showMessage('🏁 게임 시작!', 'success');
        });

        this.on('onMultiplayerEvent', (data) => {
            this.handleMultiplayerEvent(data.playerId, data.action, data.data);
        });
    }
    
    /**
     * 게임 월드 초기화
     */
    initializeGameWorld() {
        // 레이스 트랙 생성 (간단한 직사각형 트랙)
        const rect = this.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
        this.gameState.raceTrack = [
            { x: 50, y: 50, width: rect.width - 100, height: rect.height - 100, type: 'outer' },
            { x: 100, y: 100, width: rect.width - 200, height: rect.height - 200, type: 'inner' }
        ];

        // 결승선 설정 (트랙 시작 지점)
        this.gameState.finishLine = {
            x: 50,
            y: 50,
            width: 50,
            height: rect.height - 100
        };

        // 모든 플레이어 초기 위치 설정
        Object.values(this.gameState.players).forEach(player => {
            player.x = 75; // 시작 라인
            player.y = rect.height / 2 + (Math.random() - 0.5) * 50; // 시작 라인에 랜덤하게 배치
            player.velocity = { x: 0, y: 0 };
            player.finished = false;
            player.rank = null;
        });

        console.log('🌍 게임 월드 초기화 완료');
    }
    
    /**
     * 키보드 컨트롤 설정
     */
    setupKeyboardControls() {
        this.keys = {};
        
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // R키로 보정
            if (e.code === 'KeyR') {
                this.calibrate();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    /**
     * 게임 시작
     */
    start() {
        if (this.gameState.isPlaying) return;
        
        this.gameState.isPlaying = true;
        this.gameState.isPaused = false;
        this.updateGameStatus('게임 진행 중...');
        
        // 게임 루프 시작
        this.startGameLoop();
        
        console.log('🚀 게임 시작');
    }
    
    /**
     * 게임 정지
     */
    pause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        this.updateGameStatus(this.gameState.isPaused ? '일시 정지' : '게임 진행 중...');
    }
    
    /**
     * 게임 재시작
     */
    restart() {
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            score: 0,
            level: 1,
            lives: 3,
            timeLeft: 60,
            players: this.gameState.players, // 플레이어 목록 유지
            hostId: this.gameState.hostId,
            gameStarted: false,
            raceTrack: [],
            finishLine: null,
            playerRank: {},
            playerFinishedCount: 0
        };
        
        // 모든 플레이어 위치 초기화
        const rect = this.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
        Object.values(this.gameState.players).forEach(player => {
            player.x = 75;
            player.y = rect.height / 2 + (Math.random() - 0.5) * 50;
            player.velocity = { x: 0, y: 0 };
            player.finished = false;
            player.rank = null;
        });
        
        // 게임 월드 재생성
        this.initializeGameWorld();
        
        // UI 업데이트
        this.updatePlayerList();
        this.updateGameStatus('게임 재시작됨');
        
        console.log('🔄 게임 재시작');
    }
    
    /**
     * 센서 입력 처리
     */
    handleSensorInput(gameInput) {
        if (!gameInput || !this.gameState.isPlaying || this.gameState.isPaused || this.player.finished) return;
        
        // 기울기로 플레이어 이동
        if (gameInput.tilt) {
            // 좌우 기울기로 X축 이동
            this.player.velocity.x += gameInput.tilt.x * this.config.playerSpeed;
            // 앞뒤 기울기로 Y축 이동 (가속)
            this.player.velocity.y += gameInput.tilt.y * this.config.playerSpeed;
        }
    }
    
    /**
     * 키보드 입력 처리 (시뮬레이션 모드)
     */
    handleKeyboardInput() {
        if (!this.gameState.isPlaying || this.gameState.isPaused || this.player.finished) return;
        
        let forceX = 0;
        let forceY = 0;
        
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) forceX -= this.config.playerSpeed;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) forceX += this.config.playerSpeed;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) forceY -= this.config.playerSpeed;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) forceY += this.config.playerSpeed;
        
        this.player.velocity.x += forceX;
        this.player.velocity.y += forceY;
    }
    
    /**
     * 게임 루프 시작
     */
    startGameLoop() {
        this.lastFrameTime = performance.now();
        
        const gameLoop = (currentTime) => {
            if (this.gameState.isPlaying) {
                this.update(currentTime);
                this.render();
                this.gameLoopId = requestAnimationFrame(gameLoop);
            }
        };
        
        this.gameLoopId = requestAnimationFrame(gameLoop);
    }
    
    /**
     * 게임 업데이트
     */
    update(currentTime) {
        if (this.gameState.isPaused) return;
        
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // 키보드 입력 처리
        this.handleKeyboardInput();
        
        // 물리 계산
        this.updatePhysics();
        
        // 충돌 감지
        this.checkCollisions();
        
        // 파티클 업데이트
        this.updateParticles();
        
        // 자신의 플레이어 상태 업데이트 및 동기화
        if (this.player.id && this.gameState.players[this.player.id]) {
            const currentPlayer = this.gameState.players[this.player.id];
            currentPlayer.x = this.player.x;
            currentPlayer.y = this.player.y;
            currentPlayer.velocity = { ...this.player.velocity };

            // 다른 플레이어에게 자신의 위치 전송
            this.sendMultiplayerEvent('updatePosition', {
                x: this.player.x,
                y: this.player.y,
                velocity: this.player.velocity
            });
        }
    }
    
    /**
     * 물리 계산
     */
    updatePhysics() {
        const rect = this.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
        
        // 마찰 적용
        this.player.velocity.x *= this.config.friction;
        this.player.velocity.y *= this.config.friction;
        
        // 위치 업데이트
        this.player.x += this.player.velocity.x;
        this.player.y += this.player.velocity.y;
        
        // 경계 충돌 (트랙 경계)
        const outerTrack = this.gameState.raceTrack[0];
        const innerTrack = this.gameState.raceTrack[1];

        // 외부 경계
        if (this.player.x < outerTrack.x) this.player.x = outerTrack.x;
        if (this.player.x + this.player.width > outerTrack.x + outerTrack.width) this.player.x = outerTrack.x + outerTrack.width - this.player.width;
        if (this.player.y < outerTrack.y) this.player.y = outerTrack.y;
        if (this.player.y + this.player.height > outerTrack.y + outerTrack.height) this.player.y = outerTrack.y + outerTrack.height - this.player.height;

        // 내부 경계 (벽)
        if (this.player.x + this.player.width > innerTrack.x &&
            this.player.x < innerTrack.x + innerTrack.width &&
            this.player.y + this.player.height > innerTrack.y &&
            this.player.y < innerTrack.y + innerTrack.height) {
            
            // 내부 벽에 부딪혔을 때 밀어내기
            const prevX = this.player.x - this.player.velocity.x;
            const prevY = this.player.y - this.player.velocity.y;

            if (prevX + this.player.width <= innerTrack.x || prevX >= innerTrack.x + innerTrack.width) {
                this.player.x = prevX; // 이전 위치로 되돌림
                this.player.velocity.x *= -this.config.boundaryBounce;
            }
            if (prevY + this.player.height <= innerTrack.y || prevY >= innerTrack.y + innerTrack.height) {
                this.player.y = prevY; // 이전 위치로 되돌림
                this.player.velocity.y *= -this.config.boundaryBounce;
            }
        }
    }
    
    /**
     * 충돌 감지
     */
    checkCollisions() {
        // 결승선 통과 감지
        const finishLine = this.gameState.finishLine;
        if (finishLine && !this.player.finished && this.isColliding(this.player, finishLine)) {
            this.player.finished = true;
            this.gameState.playerFinishedCount++;
            this.player.rank = this.gameState.playerFinishedCount;
            this.sendMultiplayerEvent('playerFinished', { rank: this.player.rank });
            this.showMessage(`🎉 ${this.player.rank}위로 결승선 통과!`, 'success');

            // 모든 플레이어가 결승선을 통과했는지 확인
            if (this.gameState.playerFinishedCount === Object.keys(this.gameState.players).length) {
                this.endGame();
            }
        }
    }
    
    /**
     * 충돌 감지 함수
     */
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    /**
     * 장애물 충돌 처리
     */
    handleObstacleCollision(obstacle) {
        // 레이싱 게임에서는 장애물 충돌 처리를 다르게 구현하거나 제거할 수 있음
        // 현재는 사용하지 않으므로 비워둠
    }
    
    /**
     * 수집 아이템 애니메이션 업데이트
     */
    updateCollectibles() {
        // 레이싱 게임에서는 수집 아이템을 사용하지 않으므로 비워둠
    }
    
    /**
     * 파티클 시스템
     */
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: color,
                size: Math.random() * 5 + 2
            });
        }
    }
    
    /**
     * 파티클 업데이트
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            particle.size *= 0.98;
            
            if (particle.life <= 0 || particle.size < 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * 렌더링
     */
    render() {
        if (!this.ctx || !this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        
        // 화면 지우기
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, rect.width, rect.height);
        
        // 배경 그라디언트
        const gradient = this.ctx.createLinearGradient(0, 0, rect.width, rect.height);
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, rect.width, rect.height);
        
        // 수집 아이템 렌더링
        this.renderCollectibles();
        
        // 장애물 렌더링
        this.renderObstacles();
        
        // 플레이어 렌더링
        this.renderPlayers();
        
        // 파티클 렌더링
        this.renderParticles();

        // 레이스 트랙 렌더링
        this.renderRaceTrack();

        // 결승선 렌더링
        this.renderFinishLine();
    }
    
    /**
     * 모든 플레이어 렌더링
     */
    renderPlayers() {
        Object.values(this.gameState.players).forEach(player => {
            this.ctx.save();
            
            // 그림자
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(
                player.x + 2,
                player.y + 2,
                player.width,
                player.height
            );
            
            // 플레이어
            const gradient = this.ctx.createRadialGradient(
                player.x + player.width / 2,
                player.y + player.height / 2,
                0,
                player.x + player.width / 2,
                player.y + player.height / 2,
                player.width / 2
            );
            gradient.addColorStop(0, player.color);
            gradient.addColorStop(1, '#ffffff'); // 흰색으로 변경하여 대비
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(player.x, player.y, player.width, player.height);
            
            // 플레이어 이름/ID 표시
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x + player.width / 2, player.y - 5);
            
            this.ctx.restore();
        });
    }
    
    /**
     * 레이스 트랙 렌더링
     */
    renderRaceTrack() {
        this.gameState.raceTrack.forEach(track => {
            this.ctx.strokeStyle = '#cbd5e1'; // Slate 300
            this.ctx.lineWidth = 5;
            this.ctx.strokeRect(track.x, track.y, track.width, track.height);
        });
    }

    /**
     * 결승선 렌더링
     */
    renderFinishLine() {
        const line = this.gameState.finishLine;
        if (!line) return;

        this.ctx.fillStyle = '#facc15'; // Yellow 400
        this.ctx.fillRect(line.x, line.y, line.width, line.height);

        // 체크무늬
        const cellSize = 10;
        for (let y = line.y; y < line.y + line.height; y += cellSize) {
            for (let x = line.x; x < line.x + line.width; x += cellSize) {
                if ((Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0) {
                    this.ctx.fillStyle = '#4b5563'; // Gray 700
                } else {
                    this.ctx.fillStyle = '#d1d5db'; // Gray 300
                }
                this.ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }
    
    /**
     * 수집 아이템 렌더링
     */
    renderCollectibles() {
        // 레이싱 게임에서는 수집 아이템을 사용하지 않으므로 비워둠
    }
    
    /**
     * 장애물 렌더링
     */
    renderObstacles() {
        // 레이싱 게임에서는 장애물을 사용하지 않으므로 비워둠
    }
    
    /**
     * 파티클 렌더링
     */
    renderParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    /**
     * 점수 추가 (레이싱 게임에서는 사용하지 않음)
     */
    addScore(points) {
        // this.gameState.score = Math.max(0, this.gameState.score + points);
        // this.updateScore();
    }
    
    /**
     * 레벨업 (레이싱 게임에서는 사용하지 않음)
     */
    levelUp() {
        // this.gameState.level++;
        // this.generateCollectibles(); // 새 아이템 생성
        // this.addScore(500); // 레벨업 보너스
        // this.showMessage(`🎉 레벨 ${this.gameState.level}!`, 'success');
        
        // console.log(`🆙 레벨업: ${this.gameState.level}`);
    }
    
    // ========== UI 업데이트 메서드들 ==========
    
    /**
     * 점수 업데이트 (레이싱 게임에서는 사용하지 않음)
     */
    updateScore() {
        // const scoreElement = document.getElementById('scoreValue');
        // if (scoreElement) {
        //     scoreElement.textContent = this.gameState.score;
        // }
    }
    
    /**
     * 게임 종료
     */
    endGame() {
        this.gameState.isPlaying = false;
        this.gameState.gameStarted = false;
        this.showMessage('게임 종료! 순위를 확인하세요.', 'info');
        console.log('게임 종료!', this.gameState.playerRank);
        // TODO: 게임 결과 화면 표시
    }
    
    /**
     * 게임 상태 업데이트
     */
    updateGameStatus(status) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
    
    /**
     * 센서 상태 업데이트
     */
    updateSensorStatus(isConnected) {
        const statusElement = document.getElementById('sensorStatus');
        if (statusElement) {
            if (isConnected) {
                statusElement.textContent = '📱 센서 연결됨';
                statusElement.style.color = '#10b981';
            } else {
                statusElement.textContent = '⌨️ 키보드 모드 (WASD)';
                statusElement.style.color = '#f59e0b';
            }
        }
    }
    
    /**
     * 세션 코드 표시
     */
    showSessionCode(sessionCode) {
        const panel = document.getElementById('sessionCodePanel');
        const display = document.getElementById('sessionCodeDisplay');
        
        if (panel && display) {
            display.textContent = sessionCode;
            panel.classList.remove('hidden');
        }
    }
    
    /**
     * 세션 코드 숨기기
     */
    hideSessionCode() {
        const panel = document.getElementById('sessionCodePanel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }
    
    /**
     * 메시지 표시 (간단한 토스트)
     */
    showMessage(message, type = 'info', duration = 2000) {
        console.log(`📢 ${message}`);
        
        // 실제 게임에서는 토스트 UI를 구현하거나
        // 게임 내 메시지 시스템을 사용할 수 있습니다.
    }

    /**
     * 플레이어 목록 업데이트 (UI)
     */
    updatePlayerList() {
        const playerListElement = document.getElementById('playerList');
        if (playerListElement) {
            playerListElement.innerHTML = '';
            Object.values(this.gameState.players).forEach(player => {
                const li = document.createElement('li');
                li.textContent = `${player.name} (ID: ${player.id}) ${player.finished ? '🏁' : ''}`;
                li.style.color = player.color;
                playerListElement.appendChild(li);
            });
        }
    }

    /**
     * 멀티플레이어 이벤트 처리
     */
    handleMultiplayerEvent(playerId, action, data) {
        const player = this.gameState.players[playerId];
        if (!player) return;

        switch (action) {
            case 'updatePosition':
                player.x = data.x;
                player.y = data.y;
                player.velocity = data.velocity;
                break;
            case 'playerFinished':
                player.finished = true;
                player.rank = data.rank;
                this.gameState.playerFinishedCount++;
                this.updatePlayerList();
                this.showMessage(`${player.name}님이 ${data.rank}위로 결승선을 통과했습니다!`, 'info');
                if (this.gameState.playerFinishedCount === Object.keys(this.gameState.players).length) {
                    this.endGame();
                }
                break;
            // 다른 멀티플레이어 이벤트 처리
        }
    }
    
    /**
     * 게임 정리
     */
    destroy() {
        this.gameState.isPlaying = false;
        
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        // SDK 정리
        super.destroy();
        
        console.log('🗑️ 게임 정리 완료');
    }
}

// 게임 인스턴스 생성
let game;

// DOM 로드 완료 시 게임 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Sensor Race 로딩 완료');
    
    try {
        game = new SensorRaceGame();
        window.game = game; // 전역 접근용
        
        console.log('✅ 게임 인스턴스 생성 완료');
    } catch (error) {
        console.error('❌ 게임 초기화 실패:', error);
    }
});