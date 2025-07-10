# 🤖 센서 게임 허브 v3.0 - LLM 개발 가이드

> **Claude Code와 Gemini CLI를 위한 완벽한 프롬프트 지침서**

## 🎯 개요

이 문서는 **Claude Code**, **Gemini CLI**, 및 기타 AI 개발 에이전트들이 센서 게임 허브 v3.0에서 효과적으로 게임을 개발할 수 있도록 작성된 프롬프트 가이드입니다.

### ✨ AI 에이전트를 위한 핵심 지침

- **프로젝트 위치**: `/sensor-game-hub-v3/`
- **개발 언어**: JavaScript만 사용 (TypeScript 금지)
- **SDK 버전**: Sensor Game SDK v3.0
- **템플릿 기반**: 기존 템플릿을 복사하여 수정하는 방식

---

## 📋 프로젝트 시작 프롬프트

AI 개발 에이전트에게 다음 프롬프트를 제공하세요:

```
센서 게임 허브 v3.0에서 새로운 센서 게임을 개발해주세요.

🎯 개발 요구사항:
- 프로젝트 위치: /sensor-game-hub-v3/
- 언어: JavaScript만 사용 (TypeScript 금지)
- SDK: Sensor Game SDK v3.0 활용
- 템플릿: /templates/ 폴더의 기본 템플릿을 복사하여 시작

📁 프로젝트 구조:
sensor-game-hub-v3/
├── games/                  # 게임들이 위치하는 폴더
├── templates/              # 게임 개발 템플릿
├── sdk/sensor-game-sdk.js  # SDK 파일
├── docs/DEVELOPER_GUIDE.md # 상세한 개발 가이드
└── server.js              # 메인 서버

🚀 개발 프로세스:
1. /templates/ 폴더를 /games/[새-게임-이름]/ 으로 복사
2. game.json에서 게임 메타데이터 수정
3. game.js에서 게임 로직 구현
4. index.html에서 UI 커스터마이징

📖 중요한 참조 문서:
- /docs/DEVELOPER_GUIDE.md: 완전한 API 레퍼런스와 예제
- /docs/SDK_REFERENCE.md: SDK 기술 문서
- /templates/: 기본 템플릿 코드

🎮 지원하는 게임 타입:
- single: 싱글플레이어 (4자리 세션 코드 매칭)
- multiplayer: 멀티플레이어 (최대 8명, 4자리 룸 비밀번호)

📱 지원하는 센서:
- orientation: 방향 센서 (기울기)
- accelerometer: 가속도계 (움직임, 흔들기)
- gyroscope: 자이로스코프 (회전)

⚙️ 개발 시 주의사항:
- 반드시 DEVELOPER_GUIDE.md를 먼저 읽고 시작
- 템플릿의 기본 구조를 유지하며 확장
- SDK의 콜백 시스템을 활용
- 센서 데이터는 gameInput으로 변환되어 제공됨
- 키보드 시뮬레이션 모드 지원 필수

게임 아이디어가 있다면 알려주시고, 없다면 간단한 센서 기반 게임을 제안해주세요.
```

---

## 🎮 게임 개발 단계별 프롬프트

### 1단계: 게임 아이디어 및 설계

```
다음 정보를 바탕으로 센서 게임을 설계해주세요:

게임 타입: [single/multiplayer]
카테고리: [action/puzzle/racing/sports/adventure/simulation/strategy/casual]
난이도: [easy/medium/hard/expert]
사용할 센서: [orientation/accelerometer/gyroscope]

요구사항:
- 게임의 핵심 메커니즘 설명
- 센서 활용 방식 정의
- 승리 조건 및 게임플레이 루프
- 예상 플레이 타임: 5-15분
- 템플릿 기반으로 확장 가능한 구조

설계 완료 후 /templates/를 복사하여 새 게임 폴더를 생성해주세요.
```

### 2단계: 게임 메타데이터 설정

```
/games/[게임이름]/game.json 파일을 다음 기준으로 수정해주세요:

필수 수정 항목:
- id: 고유한 게임 식별자 (소문자, 하이픈)
- name: 게임 이름 (이모지 포함 가능)
- description: 게임 설명 (한국어)
- author: 개발자 이름
- category: 게임 카테고리
- difficulty: 난이도
- gameType: single 또는 multiplayer
- sensorTypes: 사용할 센서 배열
- controls: 조작법 설명 객체

멀티플레이어인 경우 추가:
- minPlayers: 최소 플레이어 수
- maxPlayers: 최대 플레이어 수
- gameMode: 멀티플레이어 모드 정보

가이드라인:
- id는 영문 소문자와 하이픈만 사용
- name에는 적절한 이모지 포함
- description은 100자 내외로 간결하게
- 카테고리는 기존 8개 중 선택
```

### 3단계: 게임 로직 구현

```
/games/[게임이름]/game.js 파일에서 게임 로직을 구현해주세요.

기본 구조 유지:
- MyAwesomeGame 클래스명을 [게임이름]Game으로 변경
- super() 호출에서 게임 설정 수정
- 기본 게임 루프 구조 유지

구현해야 할 주요 메서드:
1. handleSensorInput(gameInput): 센서 입력 처리
2. update(currentTime): 게임 상태 업데이트
3. render(): 게임 화면 렌더링
4. checkCollisions(): 충돌 감지
5. 게임별 특수 로직

센서 데이터 활용:
- gameInput.tilt: 기울기 (-1 ~ 1)
- gameInput.movement: 움직임 (가속도계)
- gameInput.rotation: 회전 (자이로스코프)
- gameInput.shake: 흔들기 감지
- gameInput.gesture: 제스처 감지

성능 최적화:
- requestAnimationFrame 사용
- 불필요한 계산 최소화
- 적절한 객체 풀링
- 메모리 누수 방지
```

### 4단계: UI 및 화면 구성

```
/games/[게임이름]/index.html과 CSS를 게임에 맞게 커스터마이징해주세요.

수정 가능한 요소:
- 게임 제목 및 설명
- 색상 테마 (CSS 커스텀 프로퍼티)
- UI 패널 구성
- 조작법 설명
- 시작 화면 디자인

유지해야 할 요소:
- 세션 코드 표시 패널
- 센서 상태 표시
- 점수 및 게임 상태 UI
- 기본 버튼들 (보정, 재시작, 허브로)
- 반응형 디자인 구조

CSS 변수 활용:
- --primary: 주 색상
- --secondary: 보조 색상
- --success: 성공 색상
- --warning: 경고 색상
- --error: 오류 색상
```

### 5단계: 멀티플레이어 게임 (해당되는 경우)

```
멀티플레이어 게임의 경우 다음 기능을 추가 구현해주세요:

SDK 콜백 활용:
- onRoomCreated: 룸 생성 완료
- onPlayerJoined: 플레이어 참가
- onPlayerLeft: 플레이어 퇴장
- onGameStart: 게임 시작
- onMultiplayerEvent: 플레이어 간 이벤트

구현할 기능:
1. 플레이어 목록 표시
2. 룸 비밀번호 표시
3. 게임 시작 조건 확인
4. 실시간 이벤트 동기화
5. 호스트 권한 관리

데이터 전송:
- this.sendMultiplayerEvent(action, data)
- 필요한 게임 상태만 전송
- 스팸 방지를 위한 전송 빈도 제한

동기화 전략:
- 결정론적 게임 로직
- 클라이언트 예측
- 서버 검증 (필요시)
```

---

## 🔧 자주 사용하는 코드 패턴

### 센서 입력 처리 패턴

```javascript
handleSensorInput(gameInput) {
    if (!gameInput || !this.gameState.isPlaying) return;
    
    // 기울기로 플레이어 이동
    if (gameInput.tilt) {
        this.player.velocity.x += gameInput.tilt.x * this.config.speed;
        this.player.velocity.y += gameInput.tilt.y * this.config.speed;
    }
    
    // 흔들기로 특수 액션
    if (gameInput.shake && gameInput.shake.detected) {
        this.triggerSpecialAction();
    }
    
    // 제스처 감지
    if (gameInput.gesture && gameInput.gesture.type === 'spin') {
        this.handleSpinGesture(gameInput.gesture);
    }
}
```

### 게임 상태 관리 패턴

```javascript
// 게임 상태 정의
this.gameState = {
    isPlaying: false,
    isPaused: false,
    score: 0,
    level: 1,
    timeLeft: 60,
    // 게임별 추가 상태...
};

// 상태 업데이트
updateGameState(newState) {
    this.gameState = { ...this.gameState, ...newState };
    this.updateUI();
}
```

### 물리 계산 패턴

```javascript
updatePhysics() {
    // 속도 업데이트
    this.player.velocity.x *= this.config.friction;
    this.player.velocity.y += this.config.gravity;
    
    // 위치 업데이트
    this.player.x += this.player.velocity.x;
    this.player.y += this.player.velocity.y;
    
    // 경계 처리
    this.handleBoundaries();
}
```

### 충돌 감지 패턴

```javascript
checkCollisions() {
    this.entities.forEach(entity => {
        if (this.isColliding(this.player, entity)) {
            this.handleCollision(entity);
        }
    });
}

isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}
```

---

## 🎨 게임 카테고리별 가이드라인

### Action 게임
- 빠른 반응속도 요구
- 연속적인 센서 입력 활용
- 실시간 충돌 감지
- 파티클 효과 적극 활용

### Puzzle 게임
- 정밀한 센서 제어
- 단계별 난이도 증가
- 명확한 목표와 해답
- 시간 제한 또는 이동 제한

### Racing 게임
- 기울기를 활용한 조향
- 속도감 있는 그래픽
- 코스 및 장애물
- 랩타임 기록

### Sports 게임
- 실제 스포츠 동작 모방
- 정확도와 타이밍 중시
- 점수 및 기록 시스템
- 직관적인 조작법

---

## 🐛 디버깅 및 문제 해결

### 자주 발생하는 문제와 해결법

```javascript
// 1. 센서 데이터가 없을 때
handleSensorInput(gameInput) {
    if (!gameInput) {
        console.warn('센서 데이터가 없습니다.');
        return;
    }
    // 게임 로직...
}

// 2. NaN 값 처리
updatePosition() {
    if (isNaN(this.player.x) || isNaN(this.player.y)) {
        console.error('플레이어 위치에 NaN 값 발생');
        this.resetPlayerPosition();
        return;
    }
    // 위치 업데이트...
}

// 3. 메모리 누수 방지
destroy() {
    // 이벤트 리스너 제거
    this.removeAllListeners();
    
    // 애니메이션 프레임 취소
    if (this.gameLoopId) {
        cancelAnimationFrame(this.gameLoopId);
    }
    
    // 배열 정리
    this.entities = [];
    this.particles = [];
}
```

### 성능 최적화 가이드

```javascript
// 1. 객체 풀링
class ParticlePool {
    constructor(size) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createParticle());
        }
    }
    
    get() {
        return this.pool.pop() || this.createParticle();
    }
    
    release(particle) {
        particle.reset();
        this.pool.push(particle);
    }
}

// 2. 조건부 업데이트
update(deltaTime) {
    // 화면 밖 객체는 업데이트 스킵
    this.entities = this.entities.filter(entity => {
        if (this.isOffScreen(entity)) {
            return false;
        }
        entity.update(deltaTime);
        return true;
    });
}
```

---

## 📊 게임 품질 체크리스트

### 기본 요구사항 ✅
- [ ] 템플릿 기반으로 개발
- [ ] game.json 메타데이터 완성
- [ ] 센서 입력 처리 구현
- [ ] 키보드 시뮬레이션 지원
- [ ] 세션 코드 표시/숨김
- [ ] 에러 처리 및 예외 상황 대응

### 게임플레이 ✅
- [ ] 명확한 게임 목표
- [ ] 적절한 난이도 곡선
- [ ] 직관적인 조작법
- [ ] 즉각적인 피드백
- [ ] 재플레이 가치

### 기술적 품질 ✅
- [ ] 60fps 이상 성능
- [ ] 메모리 누수 없음
- [ ] 모든 브라우저에서 동작
- [ ] 모바일 기기 최적화
- [ ] 네트워크 연결 불안정 대응

### 사용자 경험 ✅
- [ ] 로딩 시간 최소화
- [ ] 직관적인 UI/UX
- [ ] 접근성 고려
- [ ] 다양한 화면 크기 지원
- [ ] 명확한 안내 메시지

---

## 🚀 배포 및 테스트

### 로컬 테스트

```bash
# 1. 개발 서버 실행
cd /sensor-game-hub-v3
npm start

# 2. 브라우저에서 접속
# PC: http://localhost:3000
# 게임: http://localhost:3000/games/[게임이름]
# 센서: http://localhost:3000/sensor (모바일)

# 3. HTTPS 테스트 (센서 권한)
# https://localhost:8443
```

### 게임 등록

```javascript
// 게임이 자동으로 허브에 등록되려면:
// 1. /games/ 폴더에 게임 폴더 생성
// 2. game.json 파일 필수 포함
// 3. index.html, game.js 파일 필수 포함
// 4. 서버 재시작 시 자동 감지
```

---

## 💡 개발 팁

### 효율적인 개발 워크플로우

1. **설계 단계**: 게임 아이디어를 구체화하고 센서 활용 방안 정의
2. **템플릿 복사**: 기존 템플릿을 새 폴더로 복사
3. **메타데이터 수정**: game.json에서 게임 정보 업데이트
4. **점진적 개발**: 기본 동작 → 게임 로직 → UI 개선 → 최적화
5. **지속적 테스트**: 센서와 키보드 모드 모두 테스트

### 코드 구조 가이드라인

```javascript
class MyGame extends SensorGameSDK {
    constructor() {
        super({ /* 설정 */ });
        this.initializeGame();
    }
    
    // 1. 초기화 메서드들
    initializeGame() { }
    setupCanvas() { }
    setupCallbacks() { }
    
    // 2. 게임 로직 메서드들
    handleSensorInput(gameInput) { }
    update(deltaTime) { }
    render() { }
    
    // 3. 게임 특화 메서드들
    // 게임별로 다른 로직들...
    
    // 4. 유틸리티 메서드들
    showMessage(message) { }
    updateUI() { }
    destroy() { }
}
```

---

## 🤝 AI 에이전트 협업 가이드

### Claude Code와의 협업

```
Claude Code에게 요청할 때:
1. "DEVELOPER_GUIDE.md를 먼저 읽어주세요"
2. "템플릿을 복사해서 새 게임을 만들어주세요"
3. "센서 입력 처리는 SDK 가이드를 따라주세요"
4. "멀티플레이어 게임의 경우 콜백 시스템을 활용해주세요"
5. "성능 최적화와 에러 처리를 잊지 말아주세요"
```

### Gemini CLI와의 협업

```
Gemini CLI에게 요청할 때:
1. 프로젝트 구조를 먼저 파악하도록 안내
2. 기존 템플릿의 패턴을 따르도록 지시
3. SDK 문서를 참조하여 올바른 API 사용
4. 단계별로 작은 기능부터 구현
5. 각 단계마다 테스트하도록 권장
```

---

## 📚 추가 자료

### 필수 문서들
- `DEVELOPER_GUIDE.md`: 완전한 개발 가이드
- `SDK_REFERENCE.md`: SDK API 레퍼런스
- `/templates/`: 기본 템플릿 코드

### 외부 자료들
- [Three.js 문서](https://threejs.org/docs/): 3D 게임 개발 시
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API): 2D 게임 개발 시
- [DeviceOrientationEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent): 센서 API 이해

---

**이 프롬프트 가이드를 활용하여 AI 에이전트와 함께 멋진 센서 게임을 개발하세요!** 🎮✨