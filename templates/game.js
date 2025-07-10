/**
 * 센서 게임 템플릿 v3.0
 * 개발자들이 쉽게 확장할 수 있는 기본 게임 구조
 */

class MyAwesomeGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'my-awesome-game',
            gameName: 'My Awesome Game',
            gameType: 'single', // 'single' 또는 'multiplayer'
            version: '1.0.0',
            
            // 센서 설정
            requestedSensors: ['orientation', 'accelerometer'],
            sensorSensitivity: {
                orientation: 0.8,
                accelerometer: 0.5,
                gyroscope: 0.3
            },
            
            // 데이터 처리 설정
            smoothingFactor: 3,
            deadzone: 0.1,
            updateRate: 60,
            
            // 멀티플레이어 설정 (필요한 경우)
            maxPlayers: 4,
            minPlayers: 2
        });
        
        // 게임 상태
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            score: 0,
            level: 1,
            lives: 3,
            timeLeft: 60
        };
        
        // 게임 객체들
        this.player = {
            x: 0,
            y: 0,
            width: 40,
            height: 40,
            velocity: { x: 0, y: 0 },
            color: '#6366f1'
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
        console.log('🎮 My Awesome Game 초기화');
        
        // 캔버스 설정
        this.setupCanvas();
        
        // SDK 콜백 등록
        this.setupCallbacks();
        
        // 게임 월드 초기화
        this.initializeGameWorld();
        
        // 키보드 입력 설정 (시뮬레이션 모드)
        this.setupKeyboardControls();
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
    }
    
    /**
     * 게임 월드 초기화
     */
    initializeGameWorld() {
        // 수집 아이템 생성
        this.generateCollectibles();
        
        // 장애물 생성
        this.generateObstacles();
        
        console.log('🌍 게임 월드 초기화 완료');
    }
    
    /**
     * 수집 아이템 생성
     */
    generateCollectibles() {
        this.collectibles = [];
        const rect = this.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
        
        for (let i = 0; i < 5; i++) {
            this.collectibles.push({
                x: Math.random() * (rect.width - 40) + 20,
                y: Math.random() * (rect.height - 40) + 20,
                width: 20,
                height: 20,
                color: '#10b981',
                collected: false,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }
    
    /**
     * 장애물 생성
     */
    generateObstacles() {
        this.obstacles = [];
        const rect = this.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
        
        for (let i = 0; i < 3; i++) {
            this.obstacles.push({
                x: Math.random() * (rect.width - 80) + 40,
                y: Math.random() * (rect.height - 80) + 40,
                width: 60,
                height: 60,
                color: '#ef4444'
            });
        }
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
            timeLeft: 60
        };
        
        // 플레이어 위치 초기화
        const rect = this.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
        this.player.x = rect.width / 2;
        this.player.y = rect.height / 2;
        this.player.velocity = { x: 0, y: 0 };
        
        // 게임 월드 재생성
        this.initializeGameWorld();
        
        // UI 업데이트
        this.updateScore();
        this.updateGameStatus('게임 재시작됨');
        
        console.log('🔄 게임 재시작');
    }
    
    /**
     * 센서 입력 처리
     */
    handleSensorInput(gameInput) {
        if (!gameInput || !this.gameState.isPlaying || this.gameState.isPaused) return;
        
        // 기울기로 플레이어 이동
        if (gameInput.tilt) {
            this.player.velocity.x += gameInput.tilt.x * this.config.playerSpeed;
            this.player.velocity.y += gameInput.tilt.y * this.config.playerSpeed;
        }
        
        // 흔들기로 특수 액션
        if (gameInput.shake && gameInput.shake.detected) {
            this.triggerSpecialAction();
        }
    }
    
    /**
     * 키보드 입력 처리 (시뮬레이션 모드)
     */
    handleKeyboardInput() {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;
        
        let forceX = 0;
        let forceY = 0;
        
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) forceX -= this.config.playerSpeed;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) forceX += this.config.playerSpeed;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) forceY -= this.config.playerSpeed;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) forceY += this.config.playerSpeed;
        
        this.player.velocity.x += forceX;
        this.player.velocity.y += forceY;
        
        // 스페이스바로 특수 액션
        if (this.keys['Space']) {
            this.triggerSpecialAction();
        }
    }
    
    /**
     * 특수 액션 트리거
     */
    triggerSpecialAction() {
        // 파티클 효과 생성
        this.createParticles(this.player.x, this.player.y, '#f59e0b', 10);
        
        // 점수 추가
        this.addScore(10);
        
        console.log('✨ 특수 액션 발동!');
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
        
        // 수집 아이템 애니메이션
        this.updateCollectibles();
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
        
        // 경계 충돌
        if (this.player.x < this.player.width / 2) {
            this.player.x = this.player.width / 2;
            this.player.velocity.x *= -this.config.boundaryBounce;
        }
        if (this.player.x > rect.width - this.player.width / 2) {
            this.player.x = rect.width - this.player.width / 2;
            this.player.velocity.x *= -this.config.boundaryBounce;
        }
        if (this.player.y < this.player.height / 2) {
            this.player.y = this.player.height / 2;
            this.player.velocity.y *= -this.config.boundaryBounce;
        }
        if (this.player.y > rect.height - this.player.height / 2) {
            this.player.y = rect.height - this.player.height / 2;
            this.player.velocity.y *= -this.config.boundaryBounce;
        }
    }
    
    /**
     * 충돌 감지
     */
    checkCollisions() {
        // 수집 아이템 충돌
        this.collectibles.forEach(item => {
            if (!item.collected && this.isColliding(this.player, item)) {
                item.collected = true;
                this.addScore(100);
                this.createParticles(item.x, item.y, item.color, 5);
                
                // 모든 아이템 수집 시 레벨업
                if (this.collectibles.every(i => i.collected)) {
                    this.levelUp();
                }
            }
        });
        
        // 장애물 충돌
        this.obstacles.forEach(obstacle => {
            if (this.isColliding(this.player, obstacle)) {
                this.handleObstacleCollision(obstacle);
            }
        });
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
        // 플레이어를 장애물에서 밀어냄
        const centerX = obstacle.x + obstacle.width / 2;
        const centerY = obstacle.y + obstacle.height / 2;
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        const dx = playerCenterX - centerX;
        const dy = playerCenterY - centerY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            this.player.velocity.x = dx > 0 ? Math.abs(this.player.velocity.x) : -Math.abs(this.player.velocity.x);
        } else {
            this.player.velocity.y = dy > 0 ? Math.abs(this.player.velocity.y) : -Math.abs(this.player.velocity.y);
        }
        
        // 파티클 효과
        this.createParticles(this.player.x, this.player.y, '#ef4444', 3);
        
        // 점수 감소
        this.addScore(-20);
    }
    
    /**
     * 수집 아이템 애니메이션 업데이트
     */
    updateCollectibles() {
        this.collectibles.forEach(item => {
            if (!item.collected) {
                item.pulse += 0.1;
            }
        });
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
        this.renderPlayer();
        
        // 파티클 렌더링
        this.renderParticles();
    }
    
    /**
     * 플레이어 렌더링
     */
    renderPlayer() {
        this.ctx.save();
        
        // 그림자
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(
            this.player.x + 2,
            this.player.y + 2,
            this.player.width,
            this.player.height
        );
        
        // 플레이어
        const gradient = this.ctx.createRadialGradient(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            0,
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            this.player.width / 2
        );
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, this.player.color);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // 하이라이트
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(
            this.player.x + 5,
            this.player.y + 5,
            this.player.width - 10,
            10
        );
        
        this.ctx.restore();
    }
    
    /**
     * 수집 아이템 렌더링
     */
    renderCollectibles() {
        this.collectibles.forEach(item => {
            if (item.collected) return;
            
            this.ctx.save();
            
            // 펄스 효과
            const scale = 1 + Math.sin(item.pulse) * 0.1;
            const size = item.width * scale;
            const x = item.x - (size - item.width) / 2;
            const y = item.y - (size - item.height) / 2;
            
            // 발광 효과
            this.ctx.shadowColor = item.color;
            this.ctx.shadowBlur = 10;
            
            this.ctx.fillStyle = item.color;
            this.ctx.fillRect(x, y, size, size);
            
            this.ctx.restore();
        });
    }
    
    /**
     * 장애물 렌더링
     */
    renderObstacles() {
        this.obstacles.forEach(obstacle => {
            this.ctx.save();
            
            // 그림자
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(
                obstacle.x + 2,
                obstacle.y + 2,
                obstacle.width,
                obstacle.height
            );
            
            // 장애물
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // 경고 무늬
            this.ctx.strokeStyle = '#fbbf24';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
            
            this.ctx.restore();
        });
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
     * 점수 추가
     */
    addScore(points) {
        this.gameState.score = Math.max(0, this.gameState.score + points);
        this.updateScore();
    }
    
    /**
     * 레벨업
     */
    levelUp() {
        this.gameState.level++;
        this.generateCollectibles(); // 새 아이템 생성
        this.addScore(500); // 레벨업 보너스
        this.showMessage(`🎉 레벨 ${this.gameState.level}!`, 'success');
        
        console.log(`🆙 레벨업: ${this.gameState.level}`);
    }
    
    // ========== UI 업데이트 메서드들 ==========
    
    /**
     * 점수 업데이트
     */
    updateScore() {
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = this.gameState.score;
        }
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
    console.log('🎮 My Awesome Game 로딩 완료');
    
    try {
        game = new MyAwesomeGame();
        window.game = game; // 전역 접근용
        
        console.log('✅ 게임 인스턴스 생성 완료');
    } catch (error) {
        console.error('❌ 게임 초기화 실패:', error);
    }
});