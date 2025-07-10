# 🚀 센서 게임 허브 v3.0 - Render 배포 가이드

> **Render.com을 통한 프로덕션 배포 완벽 가이드**

## 🎯 개요

센서 게임 허브 v3.0을 Render 클라우드 플랫폼에 배포하는 방법을 설명합니다. Render는 자동 SSL 인증서, 무료 티어, GitHub 연동 등을 제공하는 현대적인 클라우드 서비스입니다.

### ✨ Render 선택 이유

- **🔒 자동 HTTPS**: SSL 인증서 자동 발급 및 갱신
- **📱 iOS 센서 지원**: HTTPS 필수인 iOS 센서 API 완벽 지원
- **🔄 GitHub 연동**: 코드 변경 시 자동 배포
- **💰 무료 티어**: 개발 및 소규모 서비스에 적합
- **🌍 글로벌 CDN**: 빠른 전세계 접근
- **📊 실시간 모니터링**: 로그 및 메트릭 제공

---

## 📋 사전 준비

### 1. GitHub 저장소 준비

```bash
# 1. 프로젝트를 GitHub에 업로드
cd sensor-game-hub-v3
git init
git add .
git commit -m "Initial commit - 센서 게임 허브 v3.0"
git branch -M main
git remote add origin https://github.com/[사용자명]/sensor-game-hub-v3.git
git push -u origin main
```

### 2. 필수 파일 확인

프로젝트 루트에 다음 파일들이 있는지 확인:

- ✅ `package.json` - 의존성 정의
- ✅ `server.js` - 메인 서버 파일
- ✅ `render.yaml` - Render 설정 파일
- ✅ `/health` 엔드포인트 - 헬스체크

---

## 🚀 Render 배포 단계

### 1단계: Render 계정 생성

1. [Render.com](https://render.com) 접속
2. **Sign Up** 클릭
3. GitHub 계정으로 연동 (권장)
4. 이메일 인증 완료

### 2단계: 새 Web Service 생성

1. Render 대시보드에서 **New +** 클릭
2. **Web Service** 선택
3. GitHub 저장소 연결:
   - **Connect a repository** 클릭
   - `sensor-game-hub-v3` 저장소 선택
   - **Connect** 클릭

### 3단계: 서비스 설정

#### 기본 설정
```yaml
Name: sensor-game-hub-v3
Region: Oregon (US West) # 또는 가장 가까운 지역
Branch: main
Runtime: Node
```

#### 빌드 및 시작 명령
```yaml
Build Command: npm install
Start Command: node server.js
```

#### 환경 변수 설정

**필수 환경 변수:**
```yaml
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
```

**선택적 환경 변수:**
```yaml
SESSION_SECRET=your-random-secret-key
HTTPS_PORT=10001
CLEANUP_INTERVAL=300000
SESSION_TIMEOUT=600000
MAX_ROOMS=1000
MAX_PLAYERS_PER_ROOM=8
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
CORS_ORIGIN=*
LOG_LEVEL=info
```

### 4단계: 고급 설정

#### Health Check 설정
```yaml
Health Check Path: /health
```

#### Auto Deploy 설정
```yaml
Auto-Deploy: Yes
Branch: main
```

#### 인스턴스 타입
```yaml
Plan: Free (개발용)
# 또는 Starter ($7/월) - 더 나은 성능
```

### 5단계: 배포 실행

1. **Create Web Service** 클릭
2. 배포 로그 확인 (약 2-5분 소요)
3. 배포 완료 후 URL 확인

---

## 🔧 배포 후 설정

### 1. 도메인 확인

배포 완료 후 할당받는 URL:
```
https://[service-name].onrender.com
```

### 2. 서비스 테스트

#### 기본 접속 테스트
```bash
# 헬스체크
curl https://[service-name].onrender.com/health

# 게임 목록 API
curl https://[service-name].onrender.com/api/games

# 메인 허브
# 브라우저에서 https://[service-name].onrender.com 접속
```

#### 센서 기능 테스트
```bash
# 모바일에서 접속
https://[service-name].onrender.com/sensor

# iOS Safari 또는 Chrome에서 센서 권한 확인
```

### 3. HTTPS 자동 인증서 확인

Render는 자동으로 SSL 인증서를 발급합니다:
- ✅ Let's Encrypt 인증서 자동 발급
- ✅ 자동 갱신 (90일마다)
- ✅ HTTP → HTTPS 자동 리다이렉트

---

## 📊 환경 변수 상세 설명

### 필수 환경 변수

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `NODE_ENV` | 실행 환경 | development | production |
| `PORT` | HTTP 포트 | 8080 | 10000 |
| `HOST` | 바인딩 호스트 | localhost | 0.0.0.0 |

### 보안 관련 환경 변수

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `SESSION_SECRET` | 세션 암호화 키 | 랜덤 생성 | your-secret-key |
| `CORS_ORIGIN` | CORS 허용 도메인 | * | https://yourdomain.com |
| `RATE_LIMIT_MAX` | 요청 제한 | 100 | 200 |

### 게임 서버 설정

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `MAX_ROOMS` | 최대 룸 수 | 1000 | 500 |
| `MAX_PLAYERS_PER_ROOM` | 룸당 최대 플레이어 | 8 | 4 |
| `SESSION_TIMEOUT` | 세션 만료 시간 (ms) | 600000 | 300000 |
| `CLEANUP_INTERVAL` | 정리 주기 (ms) | 300000 | 60000 |

---

## 🔍 모니터링 및 로그

### 1. Render 대시보드

실시간 모니터링 정보:
- **📈 메트릭**: CPU, 메모리, 네트워크 사용량
- **📜 로그**: 실시간 애플리케이션 로그
- **🔄 배포 히스토리**: 배포 기록 및 롤백
- **⚡ 성능**: 응답 시간, 처리량

### 2. 로그 확인

```bash
# Render 대시보드에서 확인하거나
# 로컬에서 로그 스트림 연결
render logs -s [service-name]
```

### 3. 커스텀 모니터링

애플리케이션에서 제공하는 상태 API:
```javascript
// GET /api/status
{
    "success": true,
    "status": {
        "uptime": 3600,
        "totalGames": 5,
        "activeSessions": 23,
        "activeRooms": 7,
        "connectedClients": 45,
        "memoryUsage": {...},
        "timestamp": 1690123456789
    }
}
```

---

## 🚨 문제 해결

### 일반적인 문제들

#### 1. 배포 실패
```bash
# 문제: npm install 실패
# 해결: package.json 의존성 확인
npm install --production

# 문제: 빌드 타임아웃
# 해결: .gitignore에 node_modules 추가
echo "node_modules/" >> .gitignore
```

#### 2. 서비스 시작 실패
```bash
# 문제: 포트 바인딩 실패
# 해결: PORT 환경변수 확인
# server.js에서 process.env.PORT 사용

# 문제: 모듈을 찾을 수 없음
# 해결: package.json dependencies 확인
```

#### 3. 센서 권한 문제
```bash
# 문제: iOS에서 센서 접근 불가
# 해결: HTTPS 확인 (Render는 자동 제공)
# 브라우저에서 https:// 로 접속하는지 확인

# 문제: Android에서 센서 느림
# 해결: 센서 업데이트 주기 조정
```

#### 4. WebSocket 연결 문제
```bash
# 문제: WebSocket 연결 끊김
# 해결: Render는 WebSocket 지원 확인
# wss:// 프로토콜 사용

# 문제: 대용량 데이터 전송 실패
# 해결: 메시지 크기 제한 확인
```

### 디버깅 도구

#### 로그 레벨 설정
```javascript
// 환경변수로 로그 레벨 제어
LOG_LEVEL=debug  // debug, info, warn, error
```

#### 헬스체크 상세 정보
```javascript
// GET /health
{
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "3.0.0",
    "uptime": 3600,
    "sessions": 15,
    "rooms": 3,
    "clients": 28
}
```

---

## 🔧 성능 최적화

### 1. 메모리 최적화

```javascript
// 정기적인 메모리 정리
setInterval(() => {
    if (global.gc) {
        global.gc();
    }
}, 30000);

// 불필요한 데이터 정리
function cleanupOldSessions() {
    const now = Date.now();
    for (const [code, session] of sessionCodes.entries()) {
        if (now - session.createdAt > SESSION_TIMEOUT) {
            sessionCodes.delete(code);
        }
    }
}
```

### 2. 네트워크 최적화

```javascript
// 압축 미들웨어 사용
app.use(compression());

// 정적 파일 캐싱
app.use(express.static('.', {
    maxAge: '1d'
}));
```

### 3. 데이터베이스 연동 (확장)

```javascript
// Redis 연동 (선택사항)
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// 세션 데이터를 Redis에 저장
```

---

## 🔄 CI/CD 자동화

### GitHub Actions 예시

```yaml
# .github/workflows/deploy.yml
name: Deploy to Render

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Deploy to Render
      run: |
        echo "Render auto-deploys on push to main"
```

---

## 💰 비용 계산

### Free Tier 제한
- **✅ 무료**: 750시간/월 (하나의 서비스로 충분)
- **🔄 슬립 모드**: 15분 비활성화 후 자동 슬립
- **⚡ 콜드 스타트**: 첫 요청 시 2-3초 지연
- **💾 임시 파일시스템**: 재시작 시 파일 삭제

### Starter Plan ($7/월)
- **⚡ 항상 온라인**: 슬립 모드 없음
- **🚀 더 나은 성능**: 더 많은 CPU/메모리
- **📊 고급 메트릭**: 상세한 모니터링

---

## 🌐 커스텀 도메인 설정

### 1. 도메인 구매 후 설정

```bash
# 1. Render 대시보드에서 Custom Domain 추가
# 2. DNS 설정에서 CNAME 레코드 추가
# Type: CNAME
# Name: your-subdomain (또는 @)
# Value: [service-name].onrender.com

# 3. SSL 인증서 자동 발급 대기 (최대 24시간)
```

### 2. 환경변수 업데이트

```yaml
CORS_ORIGIN=https://yourdomain.com
```

---

## 📚 추가 자료

### Render 공식 문서
- [Render 시작 가이드](https://render.com/docs)
- [Node.js 배포 가이드](https://render.com/docs/deploy-node-express-app)
- [환경 변수 설정](https://render.com/docs/environment-variables)

### 센서 게임 허브 문서
- `DEVELOPER_GUIDE.md`: 완전한 개발 가이드
- `LLM_PROMPT_GUIDE.md`: AI 개발 에이전트용 가이드
- `SDK_REFERENCE.md`: SDK API 레퍼런스

---

## 🎯 마무리 체크리스트

배포 완료 후 확인사항:

- [ ] ✅ 메인 허브 접속 (`https://[service-name].onrender.com`)
- [ ] ✅ 센서 클라이언트 접속 (`/sensor`)
- [ ] ✅ 게임 목록 API 작동 (`/api/games`)
- [ ] ✅ 헬스체크 응답 (`/health`)
- [ ] ✅ WebSocket 연결 정상
- [ ] ✅ 4자리 세션 코드 생성/매칭
- [ ] ✅ iOS Safari에서 센서 권한 요청
- [ ] ✅ 멀티플레이어 룸 생성/참가
- [ ] ✅ 게임 로딩 및 실행
- [ ] ✅ 모니터링 및 로그 확인

**🎉 배포 완료! 이제 전세계 어디서나 센서 게임 허브에 접속할 수 있습니다!**