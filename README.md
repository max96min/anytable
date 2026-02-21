# AnyTable

QR 코드 기반 다국어 디지털 주문 플랫폼. 고객은 테이블의 QR 코드를 스캔하여 메뉴를 탐색하고, 공유 장바구니에 담아 실시간으로 주문합니다.

---

## 주요 기능

### 고객

- **QR 코드 / 숏코드 입장** - 테이블 QR을 스캔하거나 숏코드를 입력하여 세션 참여
- **다국어 메뉴** - 영어, 한국어, 일본어, 중국어, 스페인어 5개 언어 지원
- **공유 장바구니** - 같은 테이블 참여자 전원이 실시간으로 장바구니 공유
- **알레르기 필터** - 개인별 알레르기 설정 및 메뉴 자동 필터링
- **실시간 주문 추적** - WebSocket 기반 주문 상태 실시간 업데이트
- **다회차 주문** - 라운드별 추가 주문 지원

### 가게 관리자 (Admin)

- **주문 대시보드** - 실시간 주문 수신, 상태 변경 (접수 → 조리 → 완성 → 제공)
- **테이블 관리** - 테이블 생성, QR 코드 생성/재발급, 세션 관리
- **메뉴 관리** - 메뉴 CRUD, 카테고리, 옵션 그룹, 가격, 품절/추천 설정
- **AI 이미지 생성** - OpenAI DALL-E 3로 메뉴 이미지 및 가게 로고 생성
- **AI 번역** - OpenAI GPT로 메뉴 항목 자동 번역 (기준 언어 선택 가능)
- **번역 편집기** - 메뉴명, 설명, 문화적 노트 다국어 편집
- **분석 대시보드** - 일일 주문/매출, 인기 메뉴, 언어 분포 통계
- **가게 설정** - 이름, 로고, 지원 언어, 세금/서비스료, 주문 확인 모드

### 시스템 관리자 (System Admin)

- **플랫폼 통계** - 전체 가게 수, 사장님 수, 일일 주문/매출
- **가게 관리** - 전체 가게 목록, 활성/비활성 토글, 상세 정보
- **사장님 관리** - 사장님 목록, 새 사장님+가게 생성, 활성/비활성 토글

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Socket.io Client, i18next |
| **Backend** | Express.js, TypeScript, Prisma ORM, Socket.io, JWT, Zod, Sharp, Multer |
| **AI** | OpenAI GPT-4o-mini (번역), DALL-E 3 (이미지 생성) |
| **Database** | PostgreSQL 16 |
| **Infra** | Docker Compose, npm Workspaces (Monorepo) |

---

## 프로젝트 구조

```
anytable/
├── shared/                 # 공유 타입, 상수, 유틸리티
│   └── src/
│       ├── types/          # DTO, 인터페이스
│       └── constants/      # 언어, 알레르겐, 포맷팅
│
├── server/                 # Express 백엔드
│   ├── src/
│   │   ├── routes/
│   │   │   ├── public/     # 고객 API (세션, 메뉴, 장바구니, 주문)
│   │   │   ├── admin/      # 가게 관리자 API
│   │   │   └── system/     # 시스템 관리자 API
│   │   ├── services/       # 비즈니스 로직
│   │   ├── middleware/     # 인증, 검증, 에러 핸들링, Rate Limit
│   │   ├── schemas/        # Zod 검증 스키마
│   │   └── socket/         # WebSocket 이벤트 핸들러
│   └── prisma/
│       ├── schema.prisma   # DB 스키마 (13개 모델)
│       └── seed.ts         # 시드 데이터
│
├── client/                 # React 프론트엔드
│   └── src/
│       ├── pages/
│       │   ├── customer/   # QR 입장, 메뉴, 장바구니, 주문 추적
│       │   ├── admin/      # 가게 관리 페이지
│       │   └── system/     # 시스템 관리 페이지
│       ├── components/     # 재사용 UI 컴포넌트
│       ├── context/        # React Context (세션, 장바구니, 인증, 소켓)
│       ├── lib/            # API 클라이언트
│       └── i18n/locales/   # 5개 언어 번역 파일
│
├── docker-compose.yml      # PostgreSQL 컨테이너
└── package.json            # Workspace 루트
```

---

## 설치 및 실행

### 사전 요구사항

- Node.js 18+
- Docker (PostgreSQL용)
- OpenAI API Key (AI 기능 사용 시)

### 1. 설치

```bash
git clone <repo-url>
cd anytable
npm install
```

### 2. 환경 변수

`server/.env` 파일을 생성합니다:

```env
DATABASE_URL="postgresql://anytable:anytable_dev@localhost:5432/anytable?schema=public"
JWT_SECRET="your-jwt-secret-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"
QR_HMAC_SECRET="your-hmac-secret-change-in-production"
PORT=3001
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
OPENAI_API_KEY=""          # AI 이미지 생성 및 번역용 (선택)
```

### 3. 데이터베이스

```bash
# PostgreSQL 시작
docker-compose up -d

# 마이그레이션 실행
npm run db:migrate

# 시드 데이터 삽입
npm run db:seed
```

### 4. 개발 서버

```bash
# 서버 + 클라이언트 동시 실행
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

---

## 데모 계정

시드 데이터 실행 후 사용 가능합니다.

| 역할 | 이메일 | 비밀번호 | 접속 경로 |
|------|--------|----------|-----------|
| 가게 관리자 | `admin@anytable.com` | `admin123` | `/admin/login` |
| 시스템 관리자 | `system@anytable.com` | `system123` | `/system/login` |

고객은 `/code` 에서 테이블 숏코드를 입력하거나, 생성된 QR 코드를 스캔하여 접속합니다.

---

## API 개요

### 고객 API (`/api/public/`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/table-sessions/join` | QR/숏코드로 세션 참여 |
| GET | `/table-sessions/:id` | 세션 정보 조회 |
| GET | `/stores/:storeId/menu` | 메뉴 목록 조회 |
| GET | `/stores/:storeId/menu/:menuId` | 메뉴 상세 조회 |
| GET | `/carts/:cartId` | 장바구니 조회 |
| POST | `/carts/:cartId/mutations` | 장바구니 항목 추가/수정/삭제 |
| POST | `/sessions/:id/orders` | 주문 생성 |
| GET | `/sessions/:id/orders` | 주문 목록 조회 |

### 가게 관리자 API (`/api/admin/`) — JWT 인증

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/login` | 로그인 |
| GET | `/orders` | 주문 목록 |
| PATCH | `/orders/:id/status` | 주문 상태 변경 |
| GET/POST | `/tables` | 테이블 조회/생성 |
| POST | `/tables/:id/regenerate-qr` | QR 재발급 |
| GET/POST | `/menus` | 메뉴 조회/생성 |
| PATCH | `/menus/:id` | 메뉴 수정 |
| POST | `/menus/:id/auto-translate` | AI 메뉴 번역 |
| PUT | `/menus/:id/translations/:lang` | 번역 저장 |
| POST | `/images/upload` | 이미지 업로드 |
| POST | `/images/generate` | AI 이미지 생성 |
| GET | `/analytics` | 분석 데이터 |
| PATCH | `/stores` | 가게 설정 수정 |

### 시스템 관리자 API (`/api/system/`) — JWT 인증

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/login` | 로그인 |
| GET | `/stores` | 전체 가게 목록 |
| GET | `/stores/:id` | 가게 상세 |
| PATCH | `/stores/:id/toggle` | 가게 활성/비활성 |
| GET | `/owners` | 전체 사장님 목록 |
| POST | `/owners` | 사장님+가게 생성 |
| PATCH | `/owners/:id/toggle` | 사장님 활성/비활성 |
| GET | `/stats` | 플랫폼 통계 |

---

## 실시간 통신 (WebSocket)

Socket.io 기반으로 다음 이벤트를 실시간 전송합니다:

| 이벤트 | 설명 | 수신자 |
|--------|------|--------|
| `CART_UPDATED` | 공유 장바구니 변경 | 세션 참여자 |
| `ORDER_PLACED` | 새 주문 생성 | 가게 관리자 |
| `ORDER_STATUS_CHANGED` | 주문 상태 변경 | 세션 참여자 |
| `SESSION_CLOSED` | 세션 종료 | 세션 참여자 |
| `PARTICIPANT_JOINED` | 새 참여자 입장 | 세션 참여자 |

---

## 데이터베이스 모델

```
SystemAdmin    ── 플랫폼 관리자
Owner          ── 가게 사장님 (1:N Store)
Store          ── 가게 (설정, 지원 언어, 세금률)
├── Table      ── 테이블 (QR 토큰, 숏코드, 좌석 수)
│   └── TableSession  ── 식사 세션 (라운드, 참여자)
│       ├── Participant  ── 참여자 (닉네임, 언어, 역할)
│       ├── SharedCart    ── 공유 장바구니 (버전 관리)
│       │   └── CartItem  ── 장바구니 항목
│       └── Order         ── 주문 (상태, 가격 내역)
├── Category   ── 메뉴 카테고리 (다국어명)
└── Menu       ── 메뉴 항목 (가격, 옵션, 알레르겐, 다국어)
    └── MenuOption  ── 옵션 그룹 (사이즈, 토핑 등)
```

---

## 스크립트

```bash
npm run dev              # 서버 + 클라이언트 동시 개발 모드
npm run dev:server       # 서버만 실행 (localhost:3001)
npm run dev:client       # 클라이언트만 실행 (localhost:5173)
npm run build            # 전체 빌드 (shared → server → client)
npm run db:migrate       # Prisma 마이그레이션 실행
npm run db:seed          # 시드 데이터 삽입
npm run db:reset         # DB 초기화 (주의: 데이터 삭제)
```

---

## 보안

- **비밀번호**: bcryptjs 해싱
- **인증**: JWT 액세스/리프레시 토큰 (HS256)
- **QR 토큰**: HMAC-SHA256 서명 검증 + 버전 관리
- **입력 검증**: Zod 스키마로 모든 요청 검증
- **Rate Limiting**: 공개/관리자/시스템 엔드포인트별 제한
- **CORS**: 클라이언트 오리진 제한
- **멱등성**: `idempotency_key`로 중복 주문 방지
- **낙관적 잠금**: 장바구니 `version` 필드로 충돌 감지
