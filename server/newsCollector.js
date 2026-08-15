const { db } = require('./db');

// 중요도(Impact/Importance) 분석 키워드 사전
const HIGH_IMPORTANCE_KEYWORDS = [
  '실적', '영업이익', '사상 최대', '흑자전환', '어닝서프라이즈', '서프라이즈',
  '수주', '공급계약', 'M&A', '인수', '합병', 'FDA', '승인', '특허',
  '유상증자', '무상증자', '자사주 소각', '배당 확대', '금리', 'FOMC', '연준',
  '신고가', '대규모', '돌파', '엔비디아', 'HBM', 'AI 반도체', '양산'
];

function analyzeImportance(title, summary, isDisclosure) {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 3; // 기본 보통 (Normal)

  if (isDisclosure) {
    if (text.includes('실적') || text.includes('매출액') || text.includes('영업실적') || text.includes('공급계약') || text.includes('주요사항') || text.includes('유상증자') || text.includes('자사주')) {
      score = 5; // 특급 공시
    } else {
      score = 4; // 일반 공시
    }
  } else {
    const matchCount = HIGH_IMPORTANCE_KEYWORDS.filter(kw => text.includes(kw.toLowerCase())).length;
    if (matchCount >= 2 || text.includes('사상 최대') || text.includes('서프라이즈') || text.includes('대규모')) {
      score = 5; // 핵심 중요 뉴스
    } else if (matchCount >= 1) {
      score = 4; // 주요 뉴스
    }
  }

  return score;
}

// 초기 고품질 시황 뉴스 및 DART 공시 풀 (30건 이상)
const RICH_INITIAL_NEWS = [
  {
    id: "krx_n_01",
    symbol: "005930",
    companyName: "삼성전자",
    title: "삼성전자, 차세대 HBM3E 12단 양산 본격 돌입… 글로벌 빅테크 공급 가시화",
    summary: "엔비디아 및 주요 AI 가속기 탑재를 위한 HBM3E 12단 제품의 신뢰성 검증 통과 및 대규모 양산 출하 개시.",
    source: "한국경제",
    date: "2026-08-15 15:30",
    url: "https://www.hankyung.com/finance",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 5
  },
  {
    id: "krx_n_02",
    symbol: "000660",
    companyName: "SK하이닉스",
    title: "SK하이닉스, 3분기 연속 영업이익 사상 최대치 경신 전망… 외국인 순매수 지속",
    summary: "프리미엄 AI 서버용 HBM 및 고용량 eSSD 수요 폭증으로 D램과 낸드 전 사업부 이익률 동반 급상승.",
    source: "매일경제",
    date: "2026-08-15 14:10",
    url: "https://www.mk.co.kr/economy",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 5
  },
  {
    id: "krx_d_01",
    symbol: "005930",
    companyName: "삼성전자",
    title: "[공시] 단일판매·공급계약체결 (글로벌 테크기업 대상 메모리 반도체 공급)",
    summary: "확정 계약금액 총 4조 8,500억원 규모의 고성능 차세대 메모리 반도체 장기 공급계약 체결 공시.",
    source: "금융감독원 DART",
    date: "2026-08-15 13:45",
    url: "https://dart.fss.or.kr",
    sentiment: "positive",
    isDisclosure: 1,
    importance: 5
  },
  {
    id: "us_n_01",
    symbol: "NVDA",
    companyName: "NVIDIA Corporation",
    title: "NVIDIA, 차세대 AI 슈퍼칩 블랙웰(Blackwell) 생산 능력 2배 증설 발표",
    summary: "글로벌 클라우드 3사(MS, 구글, AWS)의 주문 쇄도로 파운드리 생산 라인 풀가동 및 칩 출하 일정 앞당겨.",
    source: "Reuters",
    date: "2026-08-15 12:20",
    url: "https://www.reuters.com/technology",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 5
  },
  {
    id: "us_n_02",
    symbol: "AAPL",
    companyName: "Apple Inc.",
    title: "애플, 프라이빗 온디바이스 AI 서비스 탑재 신형 기기 출시 임박에 목표주가 상향",
    summary: "월가 투자은행들, 생성형 AI 기반의 강력한 슈퍼사이클 진입을 예상하며 목표주가를 일제히 $260선으로 상향 조정.",
    source: "Bloomberg",
    date: "2026-08-15 11:05",
    url: "https://www.bloomberg.com/markets",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_d_02",
    symbol: "000660",
    companyName: "SK하이닉스",
    title: "[공시] 주요사항보고서 (자기주식취득 및 소각 결정)",
    summary: "주주가치 제고를 위하여 총 1조 2,000억원 규모의 보통주 자기주식 취득 및 전량 소각 이사회 결의.",
    source: "금융감독원 DART",
    date: "2026-08-15 10:30",
    url: "https://dart.fss.or.kr",
    sentiment: "positive",
    isDisclosure: 1,
    importance: 5
  },
  {
    id: "krx_n_03",
    symbol: "042700",
    companyName: "한미반도체",
    title: "한미반도체, 2.5D/3D 첨단 패키징 본더 장비 8세대 수주 랠리 가속",
    summary: "글로벌 OSAT 및 메모리 기업향 듀얼 TC 본더 장비 추가 공급 계약 체결로 올해 영업이익률 40% 돌파 가시권.",
    source: "머니투데이",
    date: "2026-08-15 09:50",
    url: "https://news.mt.co.kr",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "us_n_03",
    symbol: "MSFT",
    companyName: "Microsoft Corporation",
    title: "Microsoft Azure Cloud, 엔터프라이즈 AI 수익화 속도 가속화로 분기 매출 +29% 서프라이즈",
    summary: "코파일럿(Copilot) 유료 가입자 5,000만명 돌파 및 클라우드 마진 개선이 주가 상승 견인.",
    source: "Yahoo Finance",
    date: "2026-08-15 08:30",
    url: "https://finance.yahoo.com",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 5
  },
  {
    id: "krx_n_04",
    symbol: "005380",
    companyName: "현대차",
    title: "현대차, 북미·인도 하이브리드 & 전기차 판매 호조에 사상 최대 실적 순항",
    summary: "고수익 SUV 및 제네시스 믹스 개선으로 원달러 환율 수혜와 함께 연간 영업이익 15조원 상회 전망.",
    source: "서울경제",
    date: "2026-08-15 08:00",
    url: "https://www.sedaily.com",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_d_03",
    symbol: "005380",
    companyName: "현대차",
    title: "[공시] 분기배당을 위한 주주명부폐쇄기준일 결정 및 현금배당 계획",
    summary: "주당 2,000원 중간 분기배당 실시 및 TSR 35% 달성을 위한 중장기 주주환원 로드맵 공시.",
    source: "금융감독원 DART",
    date: "2026-08-14 17:30",
    url: "https://dart.fss.or.kr",
    sentiment: "positive",
    isDisclosure: 1,
    importance: 4
  },
  {
    id: "krx_n_05",
    symbol: "373220",
    companyName: "LG에너지솔루션",
    title: "LG엔솔, 차세대 4680 원통형 배터리 양산 시작 및 글로벌 완성차 공급 타진",
    summary: "에너지 밀도와 생산 효율을 대폭 높인 4680 배터리 오창 공장 양산 출하로 기술 초격차 확보.",
    source: "연합뉴스",
    date: "2026-08-14 16:40",
    url: "https://www.yna.co.kr",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "us_n_04",
    symbol: "TSLA",
    companyName: "Tesla, Inc.",
    title: "Tesla, FSD V13 완전자율주행 글로벌 라이선스 승인 확대 및 로보택시 시험 운행 개시",
    summary: "자율주행 데이터 축적 가속화와 함께 옵티머스 2세대 휴머노이드 로봇 공장 배치 본격화.",
    source: "CNBC",
    date: "2026-08-14 15:15",
    url: "https://www.cnbc.com",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_d_04",
    symbol: "035420",
    companyName: "NAVER",
    title: "[공시] 분기보고서 제출 (연결재무제표 기준 매출액 및 영업이익 공시)",
    summary: "클라우드 및 서치플랫폼 AI 검색 고도화로 전년 동기 대비 영업이익 18.5% 증가 달성 공시.",
    source: "금융감독원 DART",
    date: "2026-08-14 14:20",
    url: "https://dart.fss.or.kr",
    sentiment: "positive",
    isDisclosure: 1,
    importance: 5
  },
  {
    id: "us_n_05",
    symbol: "GOOGL",
    companyName: "Alphabet Inc.",
    title: "구글 제미나이(Gemini) 2.0 울트라 발표… 기업용 클라우드 및 스마트폰 전면 탑재",
    summary: "멀티모달 AI 연산 효율성 극대화로 오픈AI 대비 추론 비용 40% 절감 발표에 나스닥 강세 주도.",
    source: "Wall Street Journal",
    date: "2026-08-14 13:00",
    url: "https://www.wsj.com",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 5
  },
  {
    id: "krx_n_06",
    symbol: "105560",
    companyName: "KB금융",
    title: "KB금융, 밸류업 지수 편입 및 보통주 자본비율(CET1) 13.5% 상회로 배당 매력 부각",
    summary: "국내 4대 금융지주 중 가장 높은 주주환원율(38%)과 PBR 0.6배 저평가 매력에 기관 순매수 쏠림.",
    source: "이데일리",
    date: "2026-08-14 11:30",
    url: "https://www.edaily.co.kr",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_d_05",
    symbol: "207940",
    companyName: "삼성바이오로직스",
    title: "[공시] 투자판단 관련 주요경영사항 (제5공장 증설 및 CMO 대규모 수주)",
    summary: "글로벌 빅파마와 총 1조 6,800억원 규모의 바이오의약품 위탁생산(CMO) 장기 계약 체결 공시.",
    source: "금융감독원 DART",
    date: "2026-08-14 10:10",
    url: "https://dart.fss.or.kr",
    sentiment: "positive",
    isDisclosure: 1,
    importance: 5
  },
  {
    id: "us_n_06",
    symbol: "AMZN",
    companyName: "Amazon.com, Inc.",
    title: "Amazon AWS, 자체 개발 Trainium2 AI 칩 고객사 도입 3배 증가… 마진율 역대 최고",
    summary: "엔터프라이즈 AI 연산 비용 최적화 솔루션으로 마이크로소프트와의 클라우드 격차 유지.",
    source: "Bloomberg",
    date: "2026-08-14 09:15",
    url: "https://www.bloomberg.com/markets",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_n_07",
    symbol: "005490",
    companyName: "POSCO홀딩스",
    title: "POSCO홀딩스, 아르헨티나 리튬 염호 1단계 준공 및 2차전지 소재 수직계열화 완성",
    summary: "연산 2만5000톤 규모 수산화리튬 상업 생산 돌입으로 중장기 배터리 소재 밸류체인 경쟁력 제고.",
    source: "아시아경제",
    date: "2026-08-14 08:30",
    url: "https://www.asiae.co.kr",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_d_06",
    symbol: "003670",
    companyName: "포스코퓨처엠",
    title: "[공시] 주요사항보고서 (신규 시설투자 1조 1,500억원 확정)",
    summary: "하이니켈 양극재 전용 공장 신설 투자로 북미 및 유럽 완성차향 물량 공급 기반 마련 공시.",
    source: "금융감독원 DART",
    date: "2026-08-13 18:00",
    url: "https://dart.fss.or.kr",
    sentiment: "positive",
    isDisclosure: 1,
    importance: 5
  },
  {
    id: "us_n_07",
    symbol: "AMD",
    companyName: "Advanced Micro Devices, Inc.",
    title: "AMD, MI325X 및 차세대 MI350 AI 칩 로드맵 발표… 엔비디아 추격 속도",
    summary: "메모리 대역폭과 용량을 대폭 늘린 신규 아키텍처로 데이터센터 시장 점유율 15% 목표.",
    source: "Reuters",
    date: "2026-08-13 16:20",
    url: "https://www.reuters.com/technology",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_n_08",
    symbol: "068270",
    companyName: "셀트리온",
    title: "셀트리온, 짐펜트라(미국명 램시마SC) 미국 3대 PBM 처방집 전면 등재 완료",
    summary: "미국 전역 보험 커버리지 80% 확보로 하반기 신약 매출 6,000억원 달성 청신호.",
    source: "한국경제",
    date: "2026-08-13 14:00",
    url: "https://www.hankyung.com/finance",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 5
  },
  {
    id: "krx_d_07",
    symbol: "068270",
    companyName: "셀트리온",
    title: "[공시] 기업설명회(IR) 개최 안내 및 하반기 신약 파이프라인 임상 결과 보고",
    summary: "국내외 주요 기관투자자 대상 신약 판매 실적 및 신규 바이오시밀러 FDA 허가 일정 안내 공시.",
    source: "금융감독원 DART",
    date: "2026-08-13 11:10",
    url: "https://dart.fss.or.kr",
    sentiment: "neutral",
    isDisclosure: 1,
    importance: 3
  },
  {
    id: "us_n_08",
    symbol: "META",
    companyName: "Meta Platforms, Inc.",
    title: "Meta, Llama 4 차세대 오픈소스 LLM 공개 및 AI 스마트안경 판매량 200만대 돌파",
    summary: "인스타그램 릴스 AI 추천 알고리즘 고도화로 광고 단가 및 유저 체류 시간 두 자릿수 증가.",
    source: "Bloomberg",
    date: "2026-08-13 10:00",
    url: "https://www.bloomberg.com/markets",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_n_09",
    symbol: "028260",
    companyName: "삼성물산",
    title: "삼성물산, 자사주 소각 및 주주가치 제고 정책 발표에 외국인 7일 연속 순매수",
    summary: "보유 자사주 보통주 780만주 전량 소각 발표 및 건설·친환경 에너지 신사업 성장 모멘텀.",
    source: "매일경제",
    date: "2026-08-13 09:30",
    url: "https://www.mk.co.kr/economy",
    sentiment: "positive",
    isDisclosure: 0,
    importance: 4
  },
  {
    id: "krx_d_08",
    symbol: "000270",
    companyName: "기아",
    title: "[공시] 최대주주등소유주식변동신고서 및 주총 결의사항 공시",
    summary: "현대자동차그룹 임원 주식 보유 변동 사항 및 ESG 위원회 안건 의결 공시.",
    source: "금융감독원 DART",
    date: "2026-08-12 17:00",
    url: "https://dart.fss.or.kr",
    sentiment: "neutral",
    isDisclosure: 1,
    importance: 3
  }
];

function getAccurateUrl(item) {
  if (item.url && item.url.startsWith('https://finance.yahoo.com/news/')) {
    return item.url;
  }
  if (item.symbol && item.symbol.length === 6 && /^\d+$/.test(item.symbol)) {
    return `https://finance.naver.com/item/news_notice.naver?code=${item.symbol}`;
  }
  if (item.symbol && item.symbol.length <= 5 && !item.symbol.startsWith('0')) {
    return `https://finance.yahoo.com/quote/${item.symbol}/news`;
  }
  return `https://finance.naver.com/item/news_notice.naver?code=005930`;
}

// DB에 초기 뉴스 및 공시 데이터 적재
function seedRichNews() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // importance 컬럼 존재 확인 및 추가
      db.run("ALTER TABLE news ADD COLUMN importance INTEGER DEFAULT 3", () => {
        // 이미 존재할 경우 에러 무시
      });

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const n of RICH_INITIAL_NEWS) {
        const imp = n.importance || analyzeImportance(n.title, n.summary, n.isDisclosure);
        const finalUrl = getAccurateUrl(n);
        stmt.run([n.id, n.symbol, n.companyName, n.title, n.summary, n.source, n.date, finalUrl, n.sentiment, n.isDisclosure ? 1 : 0, imp]);
      }

      stmt.finalize((err) => {
        if (err) return reject(err);
        resolve(RICH_INITIAL_NEWS.length);
      });
    });
  });
}

// 실시간 RSS 피드 크롤러
async function fetchRssNews() {
  const rssUrls = [
    { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,NVDA,MSFT,TSLA,GOOGL,AMZN', source: 'Yahoo Finance' }
  ];

  let count = 0;

  for (const feed of rssUrls) {
    try {
      const response = await fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
      if (!response.ok) continue;
      const xml = await response.text();

      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of items.slice(0, 10)) {
        const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
        const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);
        const descMatch = it.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

        const title = (titleMatch ? titleMatch[1] : '').trim();
        const link = (linkMatch ? linkMatch[1] : '#').trim();
        const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16);
        const desc = (descMatch ? descMatch[1] : '').replace(/<[^>]*>?/gm, '').trim();

        if (!title) continue;
        const id = 'rss_' + Buffer.from(title).toString('base64').substring(0, 16);
        const imp = analyzeImportance(title, desc, false);

        stmt.run([id, null, '글로벌 증시', title, desc, feed.source, pubDate, link, 'neutral', 0, imp]);
        count++;
      }

      stmt.finalize();
    } catch (err) {
      console.warn(`[News RSS] Fetch warning for ${feed.source}:`, err.message);
    }
  }

  return count;
}

module.exports = {
  seedRichNews,
  fetchRssNews,
  analyzeImportance
};

