# AlphaQuant - 주식 정보 분석 및 퀀트 스크리너 웹앱

> **국내(KRX) + 미국(US)** 주식 및 ETF를 아우르는 고성능 퀀트 스크리너, TradingView 인터랙티브 차트 분석, DART 전자공시 & 실시간 뉴스 큐레이션 통합 플랫폼입니다.

---

## ✨ 핵심 기능

1. **📊 글로벌 증시 시황 대시보드 (`/dashboard`)**:
   - 코스피, 코스닥, S&P 500, 나스닥, 원/달러 환율 실시간 시세 및 5일 스파크라인
   - 반도체, 빅테크, 2차전지, 금융 등 주요 테마별 등락률 히트맵(Heatmap)
   - 모멘텀 상위주 및 리스크(가치함정 의심) 종목 자동 감지

2. **🔍 멀티 자산 퀀트 스크리너 (`/screener`)**:
   - **종목 분류**: 개별 보통주 vs ETF 원클릭 분리 필터링
   - **지표 필터**: 시장(KRX/US), PER, PBR, ROE, 배당수익률, 부채비율 실시간 조합
   - **시장 통계 기반 동적 퀀트 가이드**: 시장 중앙값(Median PER/PBR)을 추적하여 최적의 추천 기준을 실시간으로 산출 및 원클릭 주입
   - **개인화 & 내보내기**: 브라우저(LocalStorage)에 나만의 필터 조건 저장 및 **CSV 엑셀 다운로드**

3. **📈 TradingView 인터랙티브 차트 (`/chart`)**:
   - TradingView 공식 `lightweight-charts` 엔진 기반 캔들스틱 + MA20 이동평균선 + 거래량
   - 핵심 밸류에이션 카드 및 연관 DART 공시/뉴스 피드 연동

4. **⚡ 실시간 시세 즉시 갱신 (무료 데이터 피드)**:
   - 상단 `[⚡ 실시간 시세 즉시 갱신]` 버튼을 누르면 Yahoo Finance 무료 피드로부터 최신 지수 및 시세를 크롤링하여 SQLite DB를 실시간 업데이트

---

## 🏗️ 시스템 아키텍처

```text
       [무료 시세 크롤러 / Python 수집 파이프라인]
                          │
                          ▼
            [SQLite DB: data/stocks.db]
                          ▲
                          │ (SQL 쿼리)
        [Node Express API Server: 포트 5000]
                          ▲
                          │ (/api 프록시)
         [React Vite Web App: 포트 5173]
```

---

## 🚀 로컬 실행 방법

### 방법 1. 원클릭 실행 (가장 간단)
프로젝트 폴더의 **`start.bat`** 파일을 더블 클릭하면 백엔드와 프론트엔드가 자동으로 실행되고 브라우저가 열립니다.

### 방법 2. 수동 실행
```bash
# 1. 백엔드 실행 (터미널 1)
cd server
npm install
node server.js

# 2. 프론트엔드 실행 (터미널 2)
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다.

---

## ☁️ 구글 클라우드(GCP Cloud Run) 배포 방법

구글 클라우드 무료 티어(Cloud Run + Cloud Scheduler)를 사용하여 비용 0원으로 배포할 수 있습니다:

```powershell
# PowerShell에서 1줄 배포
.\deploy-gcp.ps1 -ProjectId "내-gcp-프로젝트-id"
```

배포 완료 후 제공되는 URL로 접속하여 사용하실 수 있습니다.
