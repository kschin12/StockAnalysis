const { db } = require('./db');

const iconv = new TextDecoder('euc-kr');

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
    if (text.includes('실적') || text.includes('매출액') || text.includes('영업실적') || text.includes('공급계약') || text.includes('주요사항') || text.includes('유상증자') || text.includes('자사주') || text.includes('배당')) {
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

// 실제 기사/공시 본문에서 핵심 2문장을 추출하여 정밀 요약
function summarizeRealContent(title, realBody, companyName, isDisclosure) {
  const comp = companyName || '해당 종목';
  if (!realBody || realBody.length < 15) {
    return `${comp} 관련 주요 속보입니다. 상세 내용은 출처 원문 기사를 확인하시기 바랍니다.`;
  }

  // 불필요한 기자명, 저작권, 네비게이션 텍스트 제거
  let cleaned = realBody
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^\)]*기자\)/g, ' ')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ')
    .replace(/Copyrights?|무단\s*전재|재배포\s*금지|모바일\s*한경|연합뉴스|네이버\s*페이/gi, ' ')
    .replace(/▲|▶|ⓒ|◆|■|★/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 문장 단위 분리
  const sentences = cleaned.split(/(?<=[.?!])\s+/).filter(s => {
    const trimmed = s.trim();
    return trimmed.length >= 15 && 
           !trimmed.includes('기자') && 
           !trimmed.includes('무단') && 
           !trimmed.includes('구독') && 
           !trimmed.includes('네이버 페이') &&
           !trimmed.includes('전일가') &&
           !trimmed.includes('기준가') &&
           !trimmed.includes('시가') &&
           !trimmed.includes('거래량');
  });

  if (sentences.length >= 2) {
    return sentences.slice(0, 2).join(' ').trim();
  } else if (sentences.length === 1) {
    return sentences[0].trim();
  }

  return cleaned.substring(0, 160) + '...';
}

// 1. DART 전자공시 실제 본문 비동기 크롤링
async function fetchRealDartNoticeBody(no) {
  try {
    const url = `https://finance.naver.com/item/news_notice_read_content.naver?no=${no}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const html = iconv.decode(buf);
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 20 ? text : null;
  } catch {
    return null;
  }
}

// 2. 실제 기사 원문 페이지의 본문 비동기 크롤링
async function fetchRealNewsArticleBody(url, title) {
  if (!url || url === '#' || url.includes('news.google.com/rss/articles')) {
    return null;
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 네이버 뉴스 본문 또는 일반 og:description
    const bodyMatch = html.match(/<article[^>]*id="dic_area"[^>]*>([\s\S]*?)<\/article>/i) ||
                      html.match(/<div[^>]*id="newsct_article"[^>]*>([\s\S]*?)<\/div>/i) ||
                      html.match(/<div[^>]*class="article_body"[^>]*>([\s\S]*?)<\/div>/i) ||
                      html.match(/<div[^>]*class="news_body"[^>]*>([\s\S]*?)<\/div>/i);

    if (bodyMatch) {
      const clean = bodyMatch[1]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (clean.length > 20) return clean;
    }

    const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                   html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    if (ogDesc && ogDesc[1].trim().length > 20) {
      return ogDesc[1].trim();
    }
  } catch {
    // Timeout or network error
  }
  return null;
}

// 1. 국내 주요 증시 실시간 실기사 수집 (종목당 최대 5개 제한)
async function fetchLiveKoreanNews() {
  const query = encodeURIComponent('삼성전자 OR SK하이닉스 OR 현대차 OR 셀트리온 OR NAVER OR LG에너지솔루션 OR POSCO홀딩스 OR KB금융 when:4d');
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

    // 종목별 카운트 추적 (종목당 최대 5개)
    const stockCounts = {};

    for (const it of items) {
      const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
      const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);
      const sourceMatch = it.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);

      let fullTitle = (titleMatch ? titleMatch[1] : '').trim();
      const link = (linkMatch ? linkMatch[1] : '#').trim();
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16);
      let sourceName = (sourceMatch ? sourceMatch[1] : '국내 언론사').trim();

      if (fullTitle.includes(' - ')) {
        const parts = fullTitle.split(' - ');
        sourceName = parts[parts.length - 1].trim();
        fullTitle = parts.slice(0, -1).join(' - ').trim();
      }

      fullTitle = cleanHtmlText(fullTitle, '');
      if (!fullTitle) continue;

      let symbol = '005930';
      let companyName = '삼성전자';
      if (fullTitle.includes('하이닉스')) { symbol = '000660'; companyName = 'SK하이닉스'; }
      else if (fullTitle.includes('현대차') || fullTitle.includes('제네시스')) { symbol = '005380'; companyName = '현대차'; }
      else if (fullTitle.includes('셀트리온')) { symbol = '068270'; companyName = '셀트리온'; }
      else if (fullTitle.includes('네이버') || fullTitle.includes('NAVER')) { symbol = '035420'; companyName = 'NAVER'; }
      else if (fullTitle.includes('LG엔솔') || fullTitle.includes('LG에너지')) { symbol = '373220'; companyName = 'LG에너지솔루션'; }
      else if (fullTitle.includes('포스코') || fullTitle.includes('POSCO')) { symbol = '005490'; companyName = 'POSCO홀딩스'; }
      else if (fullTitle.includes('KB금융') || fullTitle.includes('금융지주')) { symbol = '105560'; companyName = 'KB금융'; }

      // 종목당 최대 5개 제한
      stockCounts[symbol] = (stockCounts[symbol] || 0) + 1;
      if (stockCounts[symbol] > 5) continue;

      // 실제 본문 크롤링 시도 후 2문장 요약 생성
      const realBody = await fetchRealNewsArticleBody(link, fullTitle);
      const summary = realBody 
        ? summarizeRealContent(fullTitle, realBody, companyName, false)
        : `${companyName} 관련 최신 언론 보도입니다. 상세 내용은 출처 원문 기사를 통해 확인하시기 바랍니다.`;

      const id = 'kr_' + Buffer.from(fullTitle).toString('base64').substring(0, 20);
      const imp = analyzeImportance(fullTitle, summary, false);

      stmt.run([id, symbol, companyName, fullTitle, summary, sourceName, pubDate, link, 'positive', 0, imp]);
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

// 2. 미국 빅테크 실시간 뉴스 수집 (종목당 최대 5개 제한)
async function fetchLiveUsNews() {
  const query = encodeURIComponent('NVDA OR TSLA OR AAPL OR MSFT OR GOOGL OR AMZN stock when:3d');
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

    const stockCounts = {};

    for (const it of items) {
      const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
      const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);

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

      stockCounts[symbol] = (stockCounts[symbol] || 0) + 1;
      if (stockCounts[symbol] > 5) continue;

      const translatedTitle = await translateToKorean(title);
      const summary = `${companyName} 관련 글로벌 금융 및 증시 실시간 속보입니다. 상세한 분석 수치 및 투자 의견은 출처 원문 기사를 참조하시기 바랍니다.`;

      const id = 'us_' + Buffer.from(title).toString('base64').substring(0, 20);
      const imp = analyzeImportance(translatedTitle, summary, false);

      stmt.run([id, symbol, companyName, translatedTitle, summary, sourceName, pubDate, link, 'positive', 0, imp]);
      count++;
    }

    stmt.finalize();
  } catch (err) {
    console.warn('[Live US News] Fetch error:', err.message);
  }

  return count;
}

// 3. DART / 거래소 전자공시 실시간 수집 (실제 공시 본문 직접 스크래핑 & 종목당 최대 5개)
async function fetchLiveDartDisclosures() {
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
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      const html = iconv.decode(buffer);

      const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      let count = 0;

      for (const tr of trMatches) {
        if (count >= 5) break; // 종목당 최대 5건
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

          // 실제 DART 보고서 본문 크롤링 & 실 본문 기반 요약 생성
          const realNoticeBody = await fetchRealDartNoticeBody(no);
          const summary = realNoticeBody 
            ? summarizeRealContent(formattedTitle, realNoticeBody, item.name, true)
            : `${item.name}의 한국거래소 및 금융감독원 DART 공식 접수 보고서입니다. 주요 경영 및 재무 변동 사항이 포함되어 있습니다.`;

          liveDisclosures.push({
            id: `dart_${code}_${no}`,
            symbol: code,
            companyName: item.name,
            title: formattedTitle,
            summary,
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

// 4. 개별 종목 최신 뉴스 & 공시 온디맨드 실시간 검색 (추가 5건 수집)
async function searchLatestNewsForStock(symbol, companyName) {
  if (!symbol) return [];
  const name = companyName || symbol;
  const isKr = /^[0-9]{6}$/.test(symbol);
  const collectedItems = [];

  // 1) 구글 뉴스 RSS 실시간 검색 (추가 최대 5개)
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

      for (const it of items.slice(0, 5)) {
        const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
        const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);
        const sourceMatch = it.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);

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

        const realBody = await fetchRealNewsArticleBody(link, fullTitle);
        const summary = realBody 
          ? summarizeRealContent(fullTitle, realBody, name, false)
          : `${name} 관련 최신 언론 보도입니다. 상세 내용은 출처 원문 기사를 확인하시기 바랍니다.`;

        const importance = analyzeImportance(fullTitle, summary, false);
        const sentiment = fullTitle.includes('상승') || fullTitle.includes('호실적') || fullTitle.includes('돌파') || fullTitle.includes('수주') || fullTitle.includes('성장') ? 'positive' : fullTitle.includes('하락') || fullTitle.includes('손실') || fullTitle.includes('우려') || fullTitle.includes('급락') ? 'negative' : 'neutral';

        const id = `search_${symbol}_${Math.abs(hashString(link + fullTitle))}`;
        collectedItems.push({
          id,
          symbol,
          companyName: name,
          title: fullTitle,
          summary,
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

  // 2) 국내 종목의 경우 실시간 DART 전자공시 추가 수집 (최대 5개)
  if (isKr) {
    try {
      const noticeUrl = `https://finance.naver.com/item/news_notice.naver?code=${symbol}`;
      const res = await fetch(noticeUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const html = iconv.decode(buffer);
        const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

        let addedCount = 0;
        for (const tr of trMatches) {
          if (addedCount >= 5) break;
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

            const realNoticeBody = await fetchRealDartNoticeBody(no);
            const summary = realNoticeBody 
              ? summarizeRealContent(formattedTitle, realNoticeBody, name, true)
              : `${name}의 한국거래소 및 금융감독원 DART 공식 접수 보고서입니다. 주요 경영 및 재무 변동 사항이 포함되어 있습니다.`;

            collectedItems.push({
              id: `dart_${code}_${no}`,
              symbol: code,
              companyName: name,
              title: formattedTitle,
              summary,
              source: `DART (${source})`,
              date: dateStr.replace(/\./g, '-'),
              url: directNoticeUrl,
              sentiment: 'positive',
              isDisclosure: 1,
              importance: 5
            });
            addedCount++;
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

  // 4) 해당 종목 최신 10건(기존 5건 + 추가 5건) 반환
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM news WHERE symbol = ? ORDER BY isDisclosure DESC, date DESC, importance DESC LIMIT 10', [symbol], (err, rows) => {
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
  console.log('🔄 실시간 실제 뉴스 및 공시 수집 시작 (실 본문 기반 정밀 요약)...');
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
  summarizeRealContent
};
