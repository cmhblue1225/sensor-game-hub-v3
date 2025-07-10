# 📚 센서 게임 허브 v3.0 - 개발자 가이드

> **완벽한 센서 게임 개발 플랫폼** - 4자리 세션 코드 매칭과 멀티플레이어 지원

## 🎯 개요

센서 게임 허브 v3.0은 개발자들이 모바일 센서(자이로스코프, 가속도계, 방향센서)를 활용한 게임을 쉽게 개발하고 배포할 수 있는 완전한 플랫폼입니다.

### ✨ 주요 특징

- **🎯 완벽한 세션 매칭**: 4자리 세션 코드로 PC-모바일 간 간편한 연결
- **🎮 멀티플레이어 지원**: 4자리 룸 비밀번호로 최대 8명까지 실시간 멀티플레이어
- **🛠️ 강력한 SDK**: JavaScript 기반 완전한 센서 게임 개발 도구
- **📱 크로스 플랫폼**: iOS, Android, 데스크톱 모든 플랫폼 지원
- **🔒 HTTPS 지원**: iOS 센서 권한을 위한 완전한 SSL 설정

## 🚀 빠른 시작

### 1. 개발 환경 설정

```bash
# 허브 플랫폼 클론
git clone https://github.com/your-username/sensor-game-hub-v3.git
cd sensor-game-hub-v3

# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

### 2. 첫 번째 게임 생성

```bash
# 템플릿으로 새 게임 생성
cp -r templates games/my-first-game
cd games/my-first-game

# 게임 정보 수정
nano game.json
```

### 3. 기본 게임 구조

```javascript
class MyGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'my-first-game',
            gameName: 'My First Game',
            gameType: 'single', // 'single' 또는 'multiplayer'
            requestedSensors: ['orientation'],
            sensorSensitivity: {
                orientation: 0.8
            }
        });
    }
    
    // 센서 데이터 처리
    handleSensorInput(gameInput) {
        if (gameInput.tilt) {
            this.player.x += gameInput.tilt.x * 5;
            this.player.y += gameInput.tilt.y * 5;
        }
    }
}
```

## 📖 센서 게임 SDK v3.0 상세 가이드

### 게임 설정

```javascript
super({
    // 필수 설정
    gameId: 'unique-game-id',           // 고유한 게임 ID
    gameName: 'My Awesome Game',        // 게임 이름
    gameType: 'single',                 // 'single' 또는 'multiplayer'
    version: '1.0.0',                   // 게임 버전
    
    // 센서 설정
    requestedSensors: ['orientation', 'accelerometer', 'gyroscope'],
    sensorSensitivity: {
        orientation: 1.0,    // 방향 센서 감도 (0.1 ~ 2.0)
        accelerometer: 1.0,  // 가속도계 감도 (0.1 ~ 2.0)
        gyroscope: 1.0       // 자이로스코프 감도 (0.1 ~ 2.0)
    },
    
    // 데이터 처리 설정
    smoothingFactor: 3,      // 데이터 스무싱 정도 (1 ~ 10)
    deadzone: 0.1,           // 데드존 크기 (0 ~ 0.5)
    updateRate: 60,          // 업데이트 주기 (FPS)
    
    // 멀티플레이어 설정 (gameType이 'multiplayer'인 경우)
    maxPlayers: 4,           // 최대 플레이어 수
    minPlayers: 2            // 최소 플레이어 수
});
```

### 센서 데이터 처리

```javascript
// 기본 센서 데이터 콜백
this.on('onSensorData', (data) => {
    const { gameInput, calibratedData, rawData } = data;
    
    // 기울기 입력 (-1 ~ 1 범위)
    console.log('기울기:', gameInput.tilt);        // { x: -1~1, y: -1~1 }
    
    // 움직임 입력 (가속도계)
    console.log('움직임:', gameInput.movement);    // { x, y, z }
    
    // 회전 입력 (자이로스코프)
    console.log('회전:', gameInput.rotation);      // { x, y, z }
    
    // 흔들기 감지
    console.log('흔들기:', gameInput.shake);       // { intensity, detected }
    
    // 제스처 감지
    console.log('제스처:', gameInput.gesture);     // { type, confidence }
});

// 연결 상태 변경
this.on('onConnectionChange', (isConnected) => {
    if (isConnected) {
        console.log('서버 연결됨');
    } else {
        console.log('서버 연결 끊김 - 시뮬레이션 모드');
    }
});

// 세션 코드 생성 (v3.0 신기능)
this.on('onSessionCodeCreated', (data) => {
    console.log('세션 코드 생성:', data.sessionCode);
    // UI에 세션 코드 표시
    this.showSessionCode(data.sessionCode);
});

// 센서 연결 (v3.0 신기능)
this.on('onSensorConnected', (data) => {
    console.log('센서 연결 성공:', data.deviceId);
    // 세션 코드 숨기기
    this.hideSessionCode();
});

// 센서 연결 해제 (v3.0 신기능)
this.on('onSensorDisconnected', () => {
    console.log('센서 연결 해제');
    // 새로운 세션 코드 생성
});

// 센서 보정 완료
this.on('onCalibration', (calibrationData) => {
    console.log('센서 보정 완료:', calibrationData);
});

// 오류 처리
this.on('onError', (error) => {
    console.error('게임 오류:', error);
});
```

### 멀티플레이어 기능 (v3.0)

```javascript
// 멀티플레이어 게임 설정
class MyMultiplayerGame extends SensorGameSDK {
    constructor() {
        super({
            gameType: 'multiplayer',
            maxPlayers: 4,
            minPlayers: 2
        });
    }
}

// 멀티플레이어 콜백들
this.on('onRoomCreated', (data) => {
    console.log('룸 생성됨:', data.roomId, data.password);
});

this.on('onRoomJoined', (roomData) => {
    console.log('룸 참가:', roomData);
});

this.on('onPlayerJoined', (data) => {
    console.log('새 플레이어:', data.nickname);
});

this.on('onPlayerLeft', (data) => {
    console.log('플레이어 퇴장:', data.nickname);
});

this.on('onGameStart', (data) => {
    console.log('게임 시작:', data);
});

this.on('onMultiplayerEvent', (data) => {
    console.log('멀티플레이어 이벤트:', data);
});

// 다른 플레이어들에게 이벤트 전송
this.sendMultiplayerEvent('player_action', {
    action: 'jump',
    position: { x: 100, y: 200 }
});
```

### 커스텀 센서 처리

```javascript
class MyGame extends SensorGameSDK {
    // 센서 데이터를 게임 입력으로 변환하는 메서드 오버라이드
    convertToGameInput(calibratedData) {
        // 부모 클래스의 기본 처리 실행
        super.convertToGameInput(calibratedData);
        
        // 커스텀 처리 추가
        const { orientation, accelerometer } = calibratedData;
        
        if (orientation) {
            // 특별한 기울기 처리
            this.gameInput.customTilt = {
                forward: Math.max(0, -orientation.beta / 45),
                backward: Math.max(0, orientation.beta / 45),
                left: Math.max(0, -orientation.gamma / 45),
                right: Math.max(0, orientation.gamma / 45)
            };
        }
        
        if (accelerometer) {
            // 점프 감지
            this.gameInput.jump = accelerometer.y > 5;
        }
    }
    
    // 커스텀 제스처 감지
    detectGestures(data) {
        super.detectGestures(data);
        
        // 회전 제스처 감지
        if (data.gyroscope) {
            const rotationSpeed = Math.abs(data.gyroscope.alpha);
            if (rotationSpeed > 100) {
                this.gameInput.gesture = {
                    type: 'spin',
                    confidence: Math.min(rotationSpeed / 200, 1)
                };
            }
        }
    }
}
```

## 📋 game.json 명세

모든 게임은 `game.json` 파일로 메타데이터를 정의해야 합니다.

```json
{
    "id": "unique-game-id",
    "name": "🎮 Game Name",
    "description": "게임 설명",
    "author": "개발자 이름",
    "version": "1.0.0",
    "category": "action",
    "difficulty": "medium",
    "gameType": "single",
    "icon": "🎮",
    "sensorTypes": ["orientation", "accelerometer"],
    "features": ["sensor-control", "single-player"],
    "minPlayers": 1,
    "maxPlayers": 1,
    "estimatedPlayTime": "5-10분",
    "controls": {
        "orientation": "기기 기울이기로 이동",
        "accelerometer": "흔들기로 특수 액션",
        "keyboard": "시뮬레이션 모드: WASD + 스페이스바"
    },
    "requirements": {
        "sensors": ["orientation"],
        "permissions": ["deviceorientation"],
        "browsers": ["Chrome", "Safari", "Firefox"],
        "platforms": ["iOS", "Android", "Desktop"]
    }
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | ✅ | 고유한 게임 식별자 (소문자, 하이픈 사용) |
| `name` | string | ✅ | 게임 이름 (이모지 포함 가능) |
| `description` | string | ✅ | 게임 설명 |
| `author` | string | ✅ | 개발자 이름 |
| `version` | string | ✅ | 게임 버전 (Semantic Versioning) |
| `category` | string | ✅ | 게임 카테고리 |
| `difficulty` | string | ✅ | 난이도 (`easy`, `medium`, `hard`, `expert`) |
| `gameType` | string | ✅ | 게임 타입 (`single`, `multiplayer`) |
| `icon` | string | ⭕ | 게임 아이콘 (이모지 권장) |
| `sensorTypes` | array | ✅ | 사용하는 센서 타입들 |
| `features` | array | ⭕ | 게임 특징들 |
| `minPlayers` | number | ✅ | 최소 플레이어 수 |
| `maxPlayers` | number | ✅ | 최대 플레이어 수 |

### 카테고리 목록

- `action` - 액션
- `puzzle` - 퍼즐
- `racing` - 레이싱
- `sports` - 스포츠
- `adventure` - 어드벤처
- `simulation` - 시뮬레이션
- `strategy` - 전략
- `casual` - 캐주얼

### 센서 타입

- `orientation` - 방향 센서 (필수 권장)
- `accelerometer` - 가속도계
- `gyroscope` - 자이로스코프

## 🎮 게임 개발 패턴

### 1. 싱글플레이어 게임

```javascript
class SinglePlayerGame extends SensorGameSDK {
    constructor() {
        super({
            gameType: 'single',
            requestedSensors: ['orientation']
        });
        
        this.setupCallbacks();
        this.initGame();
    }
    
    setupCallbacks() {
        this.on('onSensorData', (data) => {
            this.handleInput(data.gameInput);
        });
        
        this.on('onSessionCodeCreated', (data) => {
            this.showSessionCode(data.sessionCode);
        });
        
        this.on('onSensorConnected', () => {
            this.hideSessionCode();
            this.startGame();
        });
    }
    
    initGame() {
        // 게임 초기화
    }
    
    handleInput(gameInput) {
        // 센서 입력 처리
    }
    
    showSessionCode(code) {
        // UI에 세션 코드 표시
    }
    
    hideSessionCode() {
        // 세션 코드 숨기기
    }
}
```

### 2. 멀티플레이어 게임

```javascript
class MultiplayerGame extends SensorGameSDK {
    constructor() {
        super({
            gameType: 'multiplayer',
            maxPlayers: 4,
            minPlayers: 2
        });
        
        this.players = new Map();
        this.setupCallbacks();
    }
    
    setupCallbacks() {
        this.on('onRoomCreated', (data) => {
            this.displayRoomCode(data.password);
        });
        
        this.on('onPlayerJoined', (data) => {
            this.addPlayer(data);
        });
        
        this.on('onGameStart', () => {
            this.startMultiplayerGame();
        });
        
        this.on('onMultiplayerEvent', (data) => {
            this.handlePlayerEvent(data);
        });
    }
    
    addPlayer(playerData) {
        this.players.set(playerData.playerId, playerData);
        this.updatePlayerList();
    }
    
    handlePlayerEvent(data) {
        // 다른 플레이어의 이벤트 처리
    }
    
    sendPlayerAction(action, data) {
        this.sendMultiplayerEvent(action, data);
    }
}
```

## 🔧 유틸리티 함수들

SDK에는 게임 개발에 유용한 유틸리티 함수들이 포함되어 있습니다.

```javascript
// 각도 정규화
const angle = SensorGameUtils.normalizeAngle(270); // -90

// 값 클램핑
const clamped = SensorGameUtils.clamp(150, 0, 100); // 100

// 선형 보간
const interpolated = SensorGameUtils.lerp(0, 100, 0.5); // 50

// 벡터 크기 계산
const magnitude = SensorGameUtils.magnitude({ x: 3, y: 4 }); // 5

// 두 점 간의 거리
const distance = SensorGameUtils.distance(
    { x: 0, y: 0 }, 
    { x: 3, y: 4 }
); // 5

// 디바이스 감지
const device = SensorGameUtils.detectDevice();
console.log(device.isMobile); // true/false

// 센서 지원 여부 확인
const support = SensorGameUtils.checkSensorSupport();
console.log(support.orientation); // true/false

// 랜덤 ID 생성
const id = SensorGameUtils.generateId(8); // "a1b2c3d4"

// 딥 클론
const cloned = SensorGameUtils.deepClone(originalObject);

// 디바운스
const debouncedFunction = SensorGameUtils.debounce(() => {
    console.log('실행됨');
}, 300);

// 스로틀
const throttledFunction = SensorGameUtils.throttle(() => {
    console.log('실행됨');
}, 100);
```

## 🎨 UI 개발 가이드

### CSS 변수 활용

```css
:root {
    --primary: #6366f1;
    --secondary: #ec4899;
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --background: #0f172a;
    --surface: #1e293b;
    --card: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --border: #475569;
}
```

### 세션 코드 패널

```html
<div class="session-code-panel" id="sessionCodePanel">
    <div class="session-code-title">📱 모바일에서 입력하세요</div>
    <div class="session-code-display" id="sessionCodeDisplay">----</div>
</div>
```

```javascript
showSessionCode(sessionCode) {
    const panel = document.getElementById('sessionCodePanel');
    const display = document.getElementById('sessionCodeDisplay');
    
    if (panel && display) {
        display.textContent = sessionCode;
        panel.classList.remove('hidden');
    }
}
```

### 반응형 캔버스

```javascript
setupCanvas() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}
```

## 🧪 테스트 및 디버깅

### 센서 시뮬레이션

개발 중에는 실제 센서 없이도 테스트할 수 있습니다:

```javascript
// 키보드로 센서 시뮬레이션
// WASD - 기울기
// 스페이스 - 흔들기
// R - 센서 보정
```

### 디버그 정보 출력

```javascript
// 성능 통계 확인
const stats = this.getStats();
console.log('패킷 수신률:', stats.packetsPerSecond);
console.log('평균 지연시간:', stats.averageLatency);

// 현재 센서 데이터 확인
const sensorData = this.getSensorData();
console.log('현재 센서 데이터:', sensorData);

// 현재 게임 입력 확인
const gameInput = this.getGameInput();
console.log('현재 게임 입력:', gameInput);
```

### 연결 상태 확인

```javascript
const state = this.getState();
console.log('연결 상태:', {
    서버연결: state.isConnected,
    센서연결: state.isSensorConnected,
    시뮬레이션모드: state.simulationMode,
    세션ID: state.sessionId,
    세션코드: state.sessionCode
});
```

## 📦 배포 가이드

### GitHub 배포

1. 게임 폴더를 GitHub 저장소에 업로드
2. `game.json`에 저장소 URL 추가
3. 허브에서 자동으로 게임 감지

### 파일 구조

```
my-awesome-game/
├── game.json          # 게임 메타데이터 (필수)
├── index.html         # 게임 메인 페이지 (필수)
├── game.js            # 게임 로직 (필수)
├── style.css          # 스타일 (선택)
├── assets/            # 리소스 폴더 (선택)
│   ├── images/
│   ├── sounds/
│   └── fonts/
└── README.md          # 게임 설명 (권장)
```

### 성능 최적화

1. **센서 업데이트 주기 조정**
   ```javascript
   updateRate: 30  // 60fps → 30fps로 배터리 절약
   ```

2. **불필요한 센서 비활성화**
   ```javascript
   requestedSensors: ['orientation']  // 필요한 센서만 사용
   ```

3. **데이터 스무싱 활용**
   ```javascript
   smoothingFactor: 5  // 노이즈 감소
   ```

## 🔒 보안 및 모범 사례

### 센서 권한 처리

```javascript
// iOS에서 센서 권한 요청이 자동으로 처리됩니다
// 추가 처리가 필요한 경우:
this.on('onError', (error) => {
    if (error.type === 'permission') {
        this.showPermissionGuide();
    }
});
```

### 데이터 검증

```javascript
handleSensorInput(gameInput) {
    // 입력 데이터 검증
    if (!gameInput || typeof gameInput.tilt?.x !== 'number') {
        return; // 잘못된 데이터 무시
    }
    
    // 범위 제한
    const tiltX = Math.max(-1, Math.min(1, gameInput.tilt.x));
    const tiltY = Math.max(-1, Math.min(1, gameInput.tilt.y));
    
    // 게임 로직 적용
    this.player.x += tiltX * this.speed;
    this.player.y += tiltY * this.speed;
}
```

### 멀티플레이어 보안

```javascript
// 클라이언트 사이드 검증
sendPlayerAction(action, data) {
    // 액션 유효성 검사
    if (!this.isValidAction(action, data)) {
        return;
    }
    
    // 전송 빈도 제한 (스팸 방지)
    if (Date.now() - this.lastActionTime < 50) {
        return;
    }
    
    this.sendMultiplayerEvent(action, data);
    this.lastActionTime = Date.now();
}
```

## 🐛 문제 해결

### 자주 발생하는 문제들

1. **센서 데이터가 수신되지 않음**
   - iOS: HTTPS 사용 및 센서 권한 확인
   - Android: 브라우저 센서 지원 확인

2. **연결이 자주 끊어짐**
   - 네트워크 상태 확인
   - WebSocket 재연결 로직 확인

3. **성능 문제**
   - 업데이트 주기 조정
   - 불필요한 렌더링 최적화

### 디버깅 팁

```javascript
// 상세한 로그 활성화
console.log('SDK 상태:', this.getState());
console.log('센서 지원:', SensorGameUtils.checkSensorSupport());
console.log('디바이스 정보:', SensorGameUtils.detectDevice());
```

## 🤝 커뮤니티 및 지원

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **Discussions**: 개발 관련 질문 및 토론
- **Wiki**: 추가 예제 및 튜토리얼

---

## 📝 변경 사항 (v3.0)

### 새로운 기능
- ✅ 4자리 세션 코드 시스템
- ✅ 완전한 멀티플레이어 지원
- ✅ 향상된 SDK API
- ✅ 디바이스 자동 감지
- ✅ 성능 최적화

### 업그레이드 가이드
v2.x에서 v3.0으로 업그레이드 시 주요 변경사항을 확인하세요.

**다음 개발 시에는 이 가이드를 참고하여 완벽한 센서 게임을 만들어보세요!** 🎮