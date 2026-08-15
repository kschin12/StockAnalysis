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
  if (!text) return `${fallbackTitle} 관련 실시간 주요 속보입니다. 상세 내용은 출처 원문 기사를 확인하세요.`;
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

  if (!clean || clean.length <= 15 || clean === fallbackTitle) {
    return `${fallbackTitle} 관련 실시간 주요 속보입니다. 상세 내용은 출처 원문 기사를 확인하세요.`;
  }
  return clean;
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
      const desc = cleanHtmlText(descMatch ? descMatch[1] : '', fullTitle);

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

      if (!fullTitle) continue;
      const id = 'kr_' + Buffer.from(fullTitle).toString('base64').substring(0, 20);
      const imp = analyzeImportance(fullTitle, desc, false);

      stmt.run([id, symbol, companyName, fullTitle, desc || fullTitle, sourceName, pubDate, link, 'positive', 0, imp]);
      count++;
    }

    stmt.finalize();
  } catch (err) {
    console.warn('[Live Korean News] Fetch error:', err.message);
  }

  return count;
}

async function translateToKorean(text) {
  if (!text || text.trim().length === 0) return text;
  // 영문 텍스트가 있는 경우에만 번역
  if (!/[a-zA-Z]{3,}/.test(text)) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return text;
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(x => x[0]).join('').trim();
    }
  } catch (err) {
    // 번역 실패 시 원문 유지
  }
  return text;
}

// 2. 미국/글로벌 증시 실시간 실기사 수집 (Yahoo Finance RSS 원문 직링크 + 자동 한글 번역)
async function fetchLiveUsNews() {
  const rssUrl = 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,NVDA,MSFT,TSLA,GOOGL,AMZN,AMD,META';
  let count = 0;

  try {
    const response = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) });
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
      let desc = cleanHtmlText(descMatch ? descMatch[1] : '', title);

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
      const translatedDesc = await translateToKorean(desc);

      const id = 'us_' + Buffer.from(title).toString('base64').substring(0, 20);
      const imp = analyzeImportance(translatedTitle, translatedDesc, false);

      stmt.run([id, symbol, companyName, translatedTitle, translatedDesc || translatedTitle, sourceName, pubDate, link, 'positive', 0, imp]);
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

          liveDisclosures.push({
            id: `dart_${code}_${no}`,
            symbol: code,
            companyName: item.name,
            title: `[공시] ${rawTitle}`,
            summary: `${item.name} - ${rawTitle} (한국거래소 및 금융감독원 전자공시시스템 공식 접수 상세 보고서입니다.)`,
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
  analyzeImportance
};
