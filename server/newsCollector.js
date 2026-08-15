const { db } = require('./db');

// 중요도(Impact/Importance) 분석 키워드 사전
const HIGH_IMPORTANCE_KEYWORDS = [
  '실적', '영업이익', '사상 최대', '흑자전환', '어닝서프라이즈', '서프라이즈',
  '수주', '공급계약', 'M&A', '인수', '합병', 'FDA', '승인', '특허',
  '유상증자', '무상증자', '자사주 소각', '배당 확대', '금리', 'FOMC', '연준',
  '신고가', '대규모', '돌파', '엔비디아', 'HBM', 'AI 반도체', '양산', '상향'
];

function analyzeImportance(title, summary, isDisclosure) {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 3;

  if (isDisclosure) {
    if (text.includes('실적') || text.includes('매출액') || text.includes('영업실적') || text.includes('공급계약') || text.includes('주요사항') || text.includes('유상증자') || text.includes('자사주')) {
      score = 5;
    } else {
      score = 4;
    }
  } else {
    const matchCount = HIGH_IMPORTANCE_KEYWORDS.filter(kw => text.includes(kw.toLowerCase())).length;
    if (matchCount >= 2 || text.includes('사상 최대') || text.includes('서프라이즈') || text.includes('대규모') || text.includes('수주') || text.includes('공급계약')) {
      score = 5;
    } else if (matchCount >= 1) {
      score = 4;
    }
  }

  return score;
}

function cleanHtmlText(text, fallbackTitle = '') {
  if (!text) return '';
  let clean = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean === fallbackTitle) return '';
  return clean;
}

// 제목과 중복되지 않으며 종목 현황 파악에 중요한 이슈 위주의 심층 요약문 생성
function generateInformativeSummary(title, rawDesc, companyName, isDisclosure) {
  const comp = companyName || '해당 기업';
  const cleanTitle = cleanHtmlText(title || '', '');
  const cleanRaw = cleanHtmlText(rawDesc || '', cleanTitle);

  // 1. DART 전자공시 전문 심층 맥락 요약 (2~3문장, 핵심 이슈 위주)
  if (isDisclosure) {
    if (cleanTitle.includes('배당')) {
      return `${comp}의 주주가치 제고 및 이익 환원을 위한 현금·현물 배당 공시입니다. 배당 기준일 및 시가배당률을 바탕으로 중장기 주주환원 정책의 지속성과 배당 매력도를 점검할 수 있는 핵심 재무 이벤트입니다.`;
    }
    if (cleanTitle.includes('실적') || cleanTitle.includes('영업(잠정)실적') || cleanTitle.includes('영업실적') || cleanTitle.includes('재무제표')) {
      return `${comp}의 분기 영업실적(잠정) 공식 집계 공시입니다. 시장 컨센서스(증권사 전망치) 부합 여부 및 전년 동기 대비 수익성(영업이익률) 개선 추세를 가늠하는 핵심 실적 지표입니다.`;
    }
    if (cleanTitle.includes('공급계약') || cleanTitle.includes('단일판매') || cleanTitle.includes('수주')) {
      return `${comp}의 주요 거래처향 대규모 제품 공급 및 신규 수주 계약 공시입니다. 확정 계약금액과 공급 기간에 따라 향후 분기별 매출 인식과 실적 성장세를 견인할 주요 모멘텀으로 작용합니다.`;
    }
    if (cleanTitle.includes('자기주식') || cleanTitle.includes('자사주') || cleanTitle.includes('소각')) {
      return `${comp}의 주주환원 확대를 위한 자사주 취득 및 소각 이사회 결의 공시입니다. 유통 주식수 감소에 따른 주당순이익(EPS) 상승과 밸류에이션 리레이팅에 직접적인 긍정적 요인입니다.`;
    }
    if (cleanTitle.includes('시설투자') || cleanTitle.includes('증설') || cleanTitle.includes('공장') || cleanTitle.includes('투자')) {
      return `${comp}의 차세대 생산 라인 증설 및 설비투자(CAPEX) 집행 공시입니다. 중장기 생산 능력 확대와 글로벌 고객사의 선제적 수요 대응력을 강화하기 위한 핵심 투자 전략입니다.`;
    }
    if (cleanTitle.includes('가격제한폭') || cleanTitle.includes('주식선물') || cleanTitle.includes('주식옵션')) {
      return `${comp} 주가의 단기 급변동 또는 시장 거래량 급증에 따른 주식선물·옵션 가격제한폭 조정 안내 공시입니다. 파생상품 수급 및 단기 가격 변동성에 유의할 필요가 있습니다.`;
    }
    if (cleanTitle.includes('기업설명회') || cleanTitle.includes('IR')) {
      return `${comp}의 국내외 기관투자자 및 주요 애널리스트 대상 기업설명회(IR) 개최 공시입니다. 최근 분기 사업 성과와 신규 성장 동력, 차세대 기술 로드맵이 공유될 예정입니다.`;
    }
    if (cleanTitle.includes('주식매수선택권') || cleanTitle.includes('추가상장')) {
      return `${comp}의 임직원 주식매수선택권 행사 등에 따른 신주 추가상장 안내 공시입니다. 신규 상장 주식 수량 및 단기 오버행(잠재 매도 물량) 부담 여부를 확인할 필요가 있습니다.`;
    }
    if (cleanTitle.includes('조회공시') || cleanTitle.includes('풍문') || cleanTitle.includes('해명')) {
      return `${comp} 관련 시장 풍문 및 언론 보도에 대한 거래소 조회공시 요구 및 공식 해명 답변 공시입니다. 주요 경영 현안의 공식 사실관계 및 향후 추진 계획을 확인할 수 있습니다.`;
    }
    if (cleanTitle.includes('손실') || cleanTitle.includes('파생상품') || cleanTitle.includes('소송')) {
      return `${comp}의 파생상품 거래 또는 우발채무 발생에 따른 손실 관련 공시입니다. 당기순이익 및 자기자본 변동성에 미치는 재무적 영향을 면밀히 점검할 필요가 있습니다.`;
    }
    return `${comp}의 한국거래소 및 금융감독원 DART 공식 접수 보고서입니다. 주요 경영 판단 및 재무 변동 요인이 포함되어 있으므로 원문 세부 보고서를 통해 구체적인 계약 조건과 수치를 확인하시기 바랍니다.`;
  }

  // 2. 일반 뉴스 기사 심층 요약
  if (cleanRaw && cleanRaw.length >= 40 && !cleanRaw.includes(cleanTitle.substring(0, 15))) {
    return cleanRaw;
  }

  // description이 제목과 동일하거나 빈약한 경우, 기사 핵심 테마 기반으로 2~3문장 브리핑 생성
  if (cleanTitle.includes('실적') || cleanTitle.includes('영업익') || cleanTitle.includes('매출') || cleanTitle.includes('흑자')) {
    return `${comp}의 최근 영업실적 추이 및 수익성 개선에 관한 시장 분석입니다. 주요 사업부문의 가동률 상승과 원가 효율화, 전방 수요 회복 여부가 하반기 실적 흐름의 핵심 변수로 평가받고 있습니다.`;
  }
  if (cleanTitle.includes('HBM') || cleanTitle.includes('AI') || cleanTitle.includes('반도체') || cleanTitle.includes('엔비디아')) {
    return `${comp}의 차세대 AI 반도체 및 고대역폭메모리(HBM) 공급망 경쟁력에 관한 보도입니다. 글로벌 빅테크향 납품 점유율과 수율 안정화가 향후 주가와 실적의 핵심 드라이버로 주목받고 있습니다.`;
  }
  if (cleanTitle.includes('배당') || cleanTitle.includes('주주환원') || cleanTitle.includes('밸류업') || cleanTitle.includes('자사주')) {
    return `${comp}의 주주환원 정책 확대 및 기업가치 제고(밸류업) 방안에 관한 내용입니다. 적극적인 자사주 매입·소각과 안정적인 배당 성향 유지가 주가 하방 경직성을 뒷받침하고 있습니다.`;
  }
  if (cleanTitle.includes('수주') || cleanTitle.includes('계약') || cleanTitle.includes('공급') || cleanTitle.includes('납품')) {
    return `${comp}의 글로벌 신규 고객사 확보 및 대규모 수주 계약 체결 소식입니다. 탄탄한 수주 잔고 확보를 통해 향후 분기별 매출 성장 가시성이 한층 높아질 것으로 기대됩니다.`;
  }
  if (cleanTitle.includes('목표가') || cleanTitle.includes('상향') || cleanTitle.includes('투자의견') || cleanTitle.includes('리포트')) {
    return `국내외 주요 증권사의 ${comp} 펀더멘털 평가 및 목표주가 동향입니다. 이익 성장 가시성과 글로벌 업종 내 밸류에이션 매력도에 기반한 긍정적 투자 의견이 제시되고 있습니다.`;
  }
  if (cleanTitle.includes('급등') || cleanTitle.includes('상승') || cleanTitle.includes('신고가') || cleanTitle.includes('돌파')) {
    return `${comp} 주가의 강한 상승 모멘텀과 기관·외국인 수급 유입에 관한 보도입니다. 업황 턴어라운드 기대감과 우호적인 시장 매크로 환경이 긍정적인 투자 심리를 견인하고 있습니다.`;
  }
  if (cleanTitle.includes('하락') || cleanTitle.includes('우려') || cleanTitle.includes('약세') || cleanTitle.includes('조정')) {
    return `${comp} 주가의 단기 가격 조정 및 전방 업황 불확실성에 관한 분석입니다. 거시경제 지표 변동성과 단기 차익 실현 매물 출회가 주가에 영향을 미치고 있어 분할 대응이 권장됩니다.`;
  }

  return `${comp}의 최근 경영 현황 및 업황 변화에 관한 주요 언론 보도입니다. 주요 전방 산업 동향과 기관 수급 변화를 중심으로 향후 주가 모멘텀을 주시할 필요가 있습니다.`;
}

// 1. 국내 주요 증시 실시간 실기사 수집 (Google News RSS / 언론사별 원문 직링크)
async function fetchLiveKoreanNews() {
  const query = encodeURIComponent('삼성전자 OR SK하이닉스 OR 현대차 OR 한미반도체 OR 셀트리온 OR NAVER OR LG에너지솔루션 OR POSCO홀딩스 OR KB금융 when:4d');
  const url = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`;

  let count = 0;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) return 0;
    const xml = await response.text();

    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of items.slice(0, 30)) {
      const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
      const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);
      const sourceMatch = it.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);
      const descMatch = it.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

      let fullTitle = (titleMatch ? titleMatch[1] : '').trim();
      const link = (linkMatch ? linkMatch[1] : '#').trim();
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16);
      let sourceName = (sourceMatch ? sourceMatch[1] : '국내 언론사').trim();

      // "제목 - 언론사" 포맷 분리
      if (fullTitle.includes(' - ')) {
        const parts = fullTitle.split(' - ');
        sourceName = parts[parts.length - 1].trim();
        fullTitle = parts.slice(0, -1).join(' - ').trim();
      }

      fullTitle = cleanHtmlText(fullTitle, '');
      if (!fullTitle) continue;

      // 관련 종목 매핑
      let symbol = '005930';
      let companyName = '삼성전자';
      if (fullTitle.includes('하이닉스')) { symbol = '000660'; companyName = 'SK하이닉스'; }
      else if (fullTitle.includes('현대차') || fullTitle.includes('제네시스')) { symbol = '005380'; companyName = '현대차'; }
      else if (fullTitle.includes('한미반도체')) { symbol = '042700'; companyName = '한미반도체'; }
      else if (fullTitle.includes('셀트리온')) { symbol = '068270'; companyName = '셀트리온'; }
      else if (fullTitle.includes('네이버') || fullTitle.includes('NAVER')) { symbol = '035420'; companyName = 'NAVER'; }
      else if (fullTitle.includes('LG엔솔') || fullTitle.includes('LG에너지')) { symbol = '373220'; companyName = 'LG에너지솔루션'; }
      else if (fullTitle.includes('포스코') || fullTitle.includes('POSCO')) { symbol = '005490'; companyName = 'POSCO홀딩스'; }
      else if (fullTitle.includes('KB금융') || fullTitle.includes('금융지주')) { symbol = '105560'; companyName = 'KB금융'; }

      const informativeSummary = generateInformativeSummary(fullTitle, descMatch ? descMatch[1] : '', companyName, false);
      const id = 'kr_' + Buffer.from(fullTitle).toString('base64').substring(0, 20);
      const imp = analyzeImportance(fullTitle, informativeSummary, false);

      stmt.run([id, symbol, companyName, fullTitle, informativeSummary, sourceName, pubDate, link, 'positive', 0, imp]);
      count++;
    }

    stmt.finalize();
  } catch (err) {
    console.warn('[Live Korean News] Fetch error:', err.message);
  }

  return count;
}

async function translateToKorean(text) {
  if (!text) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return text;
    const json = await res.json();
    if (json && json[0]) {
      return json[0].map(item => item[0]).join('');
    }
    return text;
  } catch (err) {
    return text;
  }
}

// 2. 미국 빅테크 실시간 뉴스 수집 (Google News RSS -> 한글 실시간 번역 및 원문 직링크)
async function fetchLiveUsNews() {
  const query = encodeURIComponent('NVDA OR TSLA OR AAPL OR MSFT OR GOOGL OR AMZN OR META stock when:3d');
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  let count = 0;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) return 0;
    const xml = await response.text();

    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of items.slice(0, 20)) {
      const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
      const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);
      const descMatch = it.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

      let title = (titleMatch ? titleMatch[1] : '').trim();
      const link = (linkMatch ? linkMatch[1] : '#').trim();
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16);
      
      title = cleanHtmlText(title, '');
      if (!title) continue;

      let symbol = 'NVDA';
      let companyName = 'NVIDIA';
      let sourceName = 'Yahoo Finance';

      if (link.includes('fool.com')) sourceName = 'The Motley Fool';
      else if (link.includes('247wallst.com')) sourceName = '24/7 Wall St.';
      else if (link.includes('bloomberg.com')) sourceName = 'Bloomberg';
      else if (link.includes('reuters.com')) sourceName = 'Reuters';
      else if (link.includes('cnbc.com')) sourceName = 'CNBC';
      else if (link.includes('wsj.com')) sourceName = 'Wall Street Journal';

      if (title.toLowerCase().includes('tesla') || title.toLowerCase().includes('musk')) { symbol = 'TSLA'; companyName = 'Tesla'; }
      else if (title.toLowerCase().includes('apple') || title.toLowerCase().includes('iphone')) { symbol = 'AAPL'; companyName = 'Apple'; }
      else if (title.toLowerCase().includes('microsoft') || title.toLowerCase().includes('azure')) { symbol = 'MSFT'; companyName = 'Microsoft'; }
      else if (title.toLowerCase().includes('google') || title.toLowerCase().includes('alphabet')) { symbol = 'GOOGL'; companyName = 'Alphabet'; }
      else if (title.toLowerCase().includes('amazon') || title.toLowerCase().includes('aws')) { symbol = 'AMZN'; companyName = 'Amazon'; }
      else if (title.toLowerCase().includes('meta') || title.toLowerCase().includes('zuckerberg')) { symbol = 'META'; companyName = 'Meta'; }

      // 자동 한글 번역 수행
      const translatedTitle = await translateToKorean(title);
      const rawDesc = cleanHtmlText(descMatch ? descMatch[1] : '', title);
      const translatedDesc = rawDesc ? await translateToKorean(rawDesc) : '';
      const informativeSummary = generateInformativeSummary(translatedTitle, translatedDesc, companyName, false);

      const id = 'us_' + Buffer.from(title).toString('base64').substring(0, 20);
      const imp = analyzeImportance(translatedTitle, informativeSummary, false);

      stmt.run([id, symbol, companyName, translatedTitle, informativeSummary, sourceName, pubDate, link, 'positive', 0, imp]);
      count++;
    }

    stmt.finalize();
  } catch (err) {
    console.warn('[Live US News] Fetch error:', err.message);
  }

  return count;
}

// 3. DART / 거래소 전자공시 실시간 수집 및 개별 공시 보고서 직접 링크
async function fetchLiveDartDisclosures() {
  const decoder = new TextDecoder('euc-kr');
  const targetSymbols = [
    { symbol: '005930', name: '삼성전자' },
    { symbol: '000660', name: 'SK하이닉스' },
    { symbol: '005380', name: '현대차' },
    { symbol: '207940', name: '삼성바이오로직스' },
    { symbol: '003670', name: '포스코퓨처엠' },
    { symbol: '035420', name: 'NAVER' },
    { symbol: '035720', name: '카카오' },
    { symbol: '068270', name: '셀트리온' },
    { symbol: '000270', name: '기아' },
    { symbol: '051910', name: 'LG화학' }
  ];

  const liveDisclosures = [];

  for (const item of targetSymbols) {
    try {
      const url = `https://finance.naver.com/item/news_notice.naver?code=${item.symbol}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      const html = decoder.decode(buffer);

      const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      let count = 0;

      for (const tr of trMatches) {
        if (count >= 3) break;
        const content = tr[1];
        if (!content.includes('news_notice_read')) continue;

        const noMatch = content.match(/news_notice_read\.naver\?no=([0-9]+)&(?:amp;)?code=([0-9A-Za-z]+)/i);
        const titleMatch = content.match(/<a[^>]*class="tit"[^>]*>([\s\S]*?)<\/a>/i);
        const infoMatch = content.match(/<td class="info">([\s\S]*?)<\/td>/i);
        const dateMatch = content.match(/<td class="date">([\s\S]*?)<\/td>/i);

        if (noMatch && titleMatch) {
          const no = noMatch[1];
          const code = noMatch[2];
          const rawTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          const source = infoMatch ? infoMatch[1].replace(/<[^>]+>/g, '').trim() : '공시';
          const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '2026-08-15';

          // 정확한 공시 본문 직접 연결 영구 URL
          const directNoticeUrl = `https://finance.naver.com/item/news_notice_read.naver?no=${no}&code=${code}`;
          const formattedTitle = `[공시] ${rawTitle}`;
          const informativeSummary = generateInformativeSummary(rawTitle, '', item.name, true);

          liveDisclosures.push({
            id: `dart_${code}_${no}`,
            symbol: code,
            companyName: item.name,
            title: formattedTitle,
            summary: informativeSummary,
            source: `DART (${source})`,
            date: dateStr.replace(/\./g, '-'),
            url: directNoticeUrl,
            sentiment: 'positive',
            isDisclosure: 1,
            importance: 5
          });
          count++;
        }
      }
    } catch (err) {
      console.warn(`[newsCollector] DART disclosure fetch warning (${item.symbol}):`, err.message);
    }
  }

  return new Promise((resolve) => {
    if (liveDisclosures.length === 0) return resolve(0);

    db.serialize(() => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const d of liveDisclosures) {
        stmt.run([d.id, d.symbol, d.companyName, d.title, d.summary, d.source, d.date, d.url, d.sentiment, 1, d.importance]);
      }

      stmt.finalize(() => resolve(liveDisclosures.length));
    });
  });
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// 4. 개별 종목 최신 뉴스 & 공시 실시간 맞춤 검색 및 수집
async function searchLatestNewsForStock(symbol, companyName) {
  if (!symbol) return [];
  const name = companyName || symbol;
  const isKr = /^[0-9]{6}$/.test(symbol);
  const collectedItems = [];

  // 1) 구글 뉴스 RSS 실시간 검색
  try {
    const query = encodeURIComponent(`${name} when:7d`);
    const langParam = isKr ? 'hl=ko&gl=KR&ceid=KR:ko' : 'hl=en-US&gl=US&ceid=US:en';
    const rssUrl = `https://news.google.com/rss/search?q=${query}&${langParam}`;

    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const xml = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const it of items.slice(0, 15)) {
        const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
        const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);
        const sourceMatch = it.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);
        const descMatch = it.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

        let fullTitle = (titleMatch ? titleMatch[1] : '').trim();
        const link = (linkMatch ? linkMatch[1] : '#').trim();
        const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16);
        let sourceName = (sourceMatch ? sourceMatch[1] : (isKr ? '국내 언론' : 'Global Press')).trim();

        if (fullTitle.includes(' - ')) {
          const parts = fullTitle.split(' - ');
          sourceName = parts[parts.length - 1].trim();
          fullTitle = parts.slice(0, -1).join(' - ').trim();
        }

        fullTitle = cleanHtmlText(fullTitle, '');
        if (!fullTitle) continue;

        const informativeSummary = generateInformativeSummary(fullTitle, descMatch ? descMatch[1] : '', name, false);
        const importance = analyzeImportance(fullTitle, informativeSummary, false);
        const sentiment = fullTitle.includes('상승') || fullTitle.includes('호실적') || fullTitle.includes('돌파') || fullTitle.includes('수주') || fullTitle.includes('성장') ? 'positive' : fullTitle.includes('하락') || fullTitle.includes('손실') || fullTitle.includes('우려') || fullTitle.includes('급락') ? 'negative' : 'neutral';

        const id = `search_${symbol}_${Math.abs(hashString(link + fullTitle))}`;
        collectedItems.push({
          id,
          symbol,
          companyName: name,
          title: fullTitle,
          summary: informativeSummary,
          source: sourceName,
          date: pubDate,
          url: link,
          sentiment,
          isDisclosure: 0,
          importance
        });
      }
    }
  } catch (err) {
    console.warn(`[searchLatestNews] RSS error for ${name}:`, err.message);
  }

  // 2) 국내 종목의 경우 실시간 DART / 거래소 전자공시 추가 수집
  if (isKr) {
    try {
      const decoder = new TextDecoder('euc-kr');
      const noticeUrl = `https://finance.naver.com/item/news_notice.naver?code=${symbol}`;
      const res = await fetch(noticeUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const html = decoder.decode(buffer);
        const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

        for (const tr of trMatches.slice(0, 10)) {
          const content = tr[1];
          if (!content.includes('news_notice_read')) continue;
          const noMatch = content.match(/news_notice_read\.naver\?no=([0-9]+)&(?:amp;)?code=([0-9A-Za-z]+)/i);
          const titleMatch = content.match(/<a[^>]*class="tit"[^>]*>([\s\S]*?)<\/a>/i);
          const infoMatch = content.match(/<td class="info">([\s\S]*?)<\/td>/i);
          const dateMatch = content.match(/<td class="date">([\s\S]*?)<\/td>/i);

          if (noMatch && titleMatch) {
            const no = noMatch[1];
            const code = noMatch[2];
            const rawTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
            const source = infoMatch ? infoMatch[1].replace(/<[^>]+>/g, '').trim() : '공시';
            const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '2026-08-15';
            const directNoticeUrl = `https://finance.naver.com/item/news_notice_read.naver?no=${no}&code=${code}`;
            const formattedTitle = `[공시] ${rawTitle}`;
            const informativeSummary = generateInformativeSummary(rawTitle, '', name, true);

            collectedItems.push({
              id: `dart_${code}_${no}`,
              symbol: code,
              companyName: name,
              title: formattedTitle,
              summary: informativeSummary,
              source: `DART (${source})`,
              date: dateStr.replace(/\./g, '-'),
              url: directNoticeUrl,
              sentiment: 'positive',
              isDisclosure: 1,
              importance: 5
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[searchLatestNews] DART notice error for ${symbol}:`, err.message);
    }
  }

  // 3) DB 저장
  if (collectedItems.length > 0) {
    await new Promise(resolve => {
      db.serialize(() => {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of collectedItems) {
          stmt.run([item.id, item.symbol, item.companyName, item.title, item.summary, item.source, item.date, item.url, item.sentiment, item.isDisclosure, item.importance]);
        }
        stmt.finalize(() => resolve());
      });
    });
  }

  // 4) 해당 종목 전체 뉴스 반환
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM news WHERE symbol = ? ORDER BY isDisclosure DESC, date DESC, importance DESC', [symbol], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => ({
        ...r,
        importance: r.importance || 3,
        isDisclosure: Boolean(r.isDisclosure)
      })));
    });
  });
}

// 전체 실시간 뉴스 & 공시 동기화 실행 함수
async function syncAllRealNews() {
  console.log('🔄 실시간 실제 뉴스 및 공시 수집 시작...');
  await new Promise(resolve => db.run('DELETE FROM news', () => resolve()));
  const krCount = await fetchLiveKoreanNews();
  const usCount = await fetchLiveUsNews();
  const dartCount = await fetchLiveDartDisclosures();
  console.log(`✅ 실시간 뉴스 수집 완료: 국내 ${krCount}건, 미국 ${usCount}건, DART ${dartCount}건`);
  return { krCount, usCount, dartCount, total: krCount + usCount + dartCount };
}

module.exports = {
  syncAllRealNews,
  fetchLiveKoreanNews,
  fetchLiveUsNews,
  fetchLiveDartDisclosures,
  searchLatestNewsForStock,
  analyzeImportance,
  generateInformativeSummary
};
