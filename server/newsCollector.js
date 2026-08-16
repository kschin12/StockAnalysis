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

// DART 공시 본문에서 "주요내용", "주요사항", "결정사항", "변동원인" 영역을 정밀 추출
function extractDartKeyContents(title, rawBody, companyName) {
  if (!rawBody || rawBody.length < 10) return '';

  const isEarnings = title.includes('영업(잠정)실적') || title.includes('영업실적') || title.includes('재무제표') || title.includes('분기보고서') || title.includes('사업보고서');
  const hasSpecialEvent = rawBody.includes('흑자전환') || rawBody.includes('적자전환') || rawBody.includes('사상 최대') || rawBody.includes('어닝서프라이즈') || rawBody.includes('어닝쇼크') || rawBody.includes('30%') || title.includes('손익구조');

  if (isEarnings && !hasSpecialEvent) {
    return '';
  }

  let extracted = '';
  const contentMatch = rawBody.match(/(?:2\.\s*(?:주요)?내용|주요내용|주요사항|결정사항|변동원인)([\s\S]*?)(?:3\.|4\.|5\.|근거규정|※|기타\s*투자판단|$)/i);
  if (contentMatch && contentMatch[1].trim().length >= 10) {
    extracted = contentMatch[1].trim();
  } else {
    const fallbackMatch = rawBody.match(/(?:1\.\s*제목[\s\S]*?)(?:2\.[\s\S]*?)(?:3\.|4\.|5\.|근거규정|$)/i);
    if (fallbackMatch) {
      extracted = fallbackMatch[0].trim();
    } else {
      extracted = rawBody;
    }
  }

  let cleaned = extracted
    .replace(/^2\.\s*(?:주요)?내용\s*/i, '')
    .replace(/근거규정[\s\S]*$/gi, '')
    .replace(/기타\s*-\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > 180) {
    cleaned = cleaned.substring(0, 175) + '...';
  }

  return cleaned;
}

// 실제 기사/공시 본문에서 핵심 문장을 추출하여 정밀 요약
function summarizeRealContent(title, realBody, companyName, isDisclosure) {
  const comp = companyName || '해당 종목';
  if (!realBody || realBody.length < 15) {
    return '';
  }

  if (isDisclosure) {
    return extractDartKeyContents(title, realBody, comp);
  }

  const isEarningsNews = title.includes('실적') || title.includes('영업익') || title.includes('매출');
  const hasSpecialNews = title.includes('흑자전환') || title.includes('적자전환') || title.includes('사상 최대') || title.includes('서프라이즈') || title.includes('쇼크') || title.includes('급증');
  if (isEarningsNews && !hasSpecialNews) {
    return '';
  }

  let cleaned = realBody
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^\)]*기자\)/g, ' ')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ')
    .replace(/Copyrights?|무단\s*전재|재배포\s*금지|모바일\s*한경|연합뉴스|네이버\s*페이/gi, ' ')
    .replace(/▲|▶|ⓒ|◆|■|★/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
      signal: AbortSignal.timeout(3000)
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
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    const html = await res.text();

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
    // Ignore timeout
  }
  return null;
}

// 1. 국내 주요 증시 실시간 뉴스 수집 (네이버 금융 실시간 주요 뉴스 20건 직결 링크 수집)
async function fetchLiveKoreanNews() {
  let count = 0;
  try {
    const res = await fetch('https://finance.naver.com/news/mainnews.naver', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return 0;
    const buf = await res.arrayBuffer();
    const html = iconv.decode(buf);

    const matches = [...html.matchAll(/<dd[^>]*class="articleSubject"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];

    const parsedArticles = [];
    for (const m of matches) {
      const href = m[1];
      const fullTitle = m[2].replace(/<[^>]+>/g, '').trim();
      if (!fullTitle) continue;

      const offMatch = href.match(/office_id=([0-9]+)/);
      const artMatch = href.match(/article_id=([0-9]+)/);
      const directUrl = (offMatch && artMatch)
        ? `https://n.news.naver.com/mnews/article/${offMatch[1]}/${artMatch[1]}`
        : `https://finance.naver.com${href}`;

      // 종목 매칭
      let symbol = '005930';
      let companyName = '삼성전자';
      if (fullTitle.includes('하이닉스')) { symbol = '000660'; companyName = 'SK하이닉스'; }
      else if (fullTitle.includes('현대차') || fullTitle.includes('제네시스')) { symbol = '005380'; companyName = '현대차'; }
      else if (fullTitle.includes('셀트리온')) { symbol = '068270'; companyName = '셀트리온'; }
      else if (fullTitle.includes('네이버') || fullTitle.includes('NAVER')) { symbol = '035420'; companyName = 'NAVER'; }
      else if (fullTitle.includes('LG엔솔') || fullTitle.includes('LG에너지')) { symbol = '373220'; companyName = 'LG에너지솔루션'; }
      else if (fullTitle.includes('포스코') || fullTitle.includes('POSCO')) { symbol = '005490'; companyName = 'POSCO홀딩스'; }
      else if (fullTitle.includes('KB금융') || fullTitle.includes('금융지주')) { symbol = '105560'; companyName = 'KB금융'; }
      else if (fullTitle.includes('카카오')) { symbol = '035720'; companyName = '카카오'; }
      else if (fullTitle.includes('알테오젠')) { symbol = '196170'; companyName = '알테오젠'; }
      else if (fullTitle.includes('한화에어로')) { symbol = '012450'; companyName = '한화에어로스페이스'; }

      const id = 'kr_' + (artMatch ? `${offMatch[1]}_${artMatch[1]}` : Buffer.from(fullTitle).toString('base64').substring(0, 16));
      const summary = `${companyName} 및 국내 증시 실시간 언론 보도입니다. 상세 내용은 출처 원문 기사를 통해 확인하시기 바랍니다.`;
      const imp = analyzeImportance(fullTitle, summary, false);
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

      parsedArticles.push({
        id,
        symbol,
        companyName,
        title: fullTitle,
        summary,
        source: '네이버증권',
        date: dateStr,
        url: directUrl,
        sentiment: 'positive',
        isDisclosure: 0,
        importance: imp
      });
    }

    if (parsedArticles.length > 0) {
      await new Promise(resolve => {
        db.serialize(() => {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const a of parsedArticles) {
            stmt.run([a.id, a.symbol, a.companyName, a.title, a.summary, a.source, a.date, a.url, a.sentiment, 0, a.importance]);
            count++;
          }
          stmt.finalize(() => resolve());
        });
      });
    }
  } catch (err) {
    console.warn('[Live Korean News] Fetch error:', err.message);
  }

  return count;
}

async function translateToKorean(text) {
  if (!text) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return text;
    const json = await res.json();
    if (json && json[0]) {
      return json[0].map(item => item[0]).join('');
    }
    return text;
  } catch {
    return text;
  }
}

// 2. 미국 빅테크 실시간 뉴스 수집 (Yahoo Finance Direct RSS 병렬 수집)
async function fetchLiveUsNews() {
  let count = 0;

  try {
    const usRows = await new Promise(resolve => {
      db.all(`SELECT symbol, name FROM stocks WHERE market = 'US' OR currency = 'USD' ORDER BY marketCap DESC LIMIT 10`, [], (err, rows) => {
        resolve(rows || []);
      });
    });
    const targetSymbols = usRows.length > 0 ? usRows.map(r => r.symbol) : ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'];

    const usPromises = targetSymbols.map(async (sym) => {
      try {
        const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${sym}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
        if (!res.ok) return [];

        const xml = await res.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        const results = [];

        for (const it of items.slice(0, 3)) {
          const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
          const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
          const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);

          const rawTitle = titleMatch ? titleMatch[1].trim() : '';
          const link = linkMatch ? linkMatch[1].trim() : '';
          const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

          if (!rawTitle || !link) continue;

          const translatedTitle = await translateToKorean(rawTitle);
          const sourceName = 'Yahoo Finance US';
          const companyName = sym;
          const id = `us_${sym}_${hashString(link)}`;
          const summary = `[${sym} 해외 주요 이슈] ${translatedTitle} 관련 실시간 외신 보도입니다.`;
          const imp = analyzeImportance(translatedTitle, summary, false);

          results.push({ id, symbol: sym, companyName, title: translatedTitle, summary, source: sourceName, date: pubDate, url: link, sentiment: 'positive', importance: imp });
        }
        return results;
      } catch {
        return [];
      }
    });

    const allUs = (await Promise.allSettled(usPromises))
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    if (allUs.length > 0) {
      await new Promise(resolve => {
        db.serialize(() => {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const u of allUs) {
            stmt.run([u.id, u.symbol, u.companyName, u.title, u.summary, u.source, u.date, u.url, u.sentiment, 0, u.importance]);
            count++;
          }
          stmt.finalize(() => resolve());
        });
      });
    }
  } catch (err) {
    console.warn('[Live US News] Fetch error:', err.message);
  }

  return count;
}

// 3. DART / 거래소 전자공시 실시간 병렬 수집 (실제 공시 본문 직결 링크)
async function fetchLiveDartDisclosures() {
  const krxRows = await new Promise(resolve => {
    db.all(`SELECT symbol, name FROM stocks WHERE market = 'KRX' OR currency = 'KRW' ORDER BY marketCap DESC LIMIT 15`, [], (err, rows) => {
      resolve(rows || []);
    });
  });

  const targetSymbols = krxRows.length > 0 ? krxRows : [
    { symbol: '005930', name: '삼성전자' },
    { symbol: '000660', name: 'SK하이닉스' },
    { symbol: '003670', name: '포스코퓨처엠' },
    { symbol: '035420', name: 'NAVER' },
    { symbol: '035720', name: '카카오' },
    { symbol: '068270', name: '셀트리온' },
    { symbol: '000270', name: '기아' },
    { symbol: '051910', name: 'LG화학' }
  ];

  const dartPromises = targetSymbols.map(async (item) => {
    try {
      const url = `https://finance.naver.com/item/news_notice.naver?code=${item.symbol}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) return [];

      const buffer = await res.arrayBuffer();
      const html = iconv.decode(buffer);
      const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      const notices = [];

      for (const tr of trMatches.slice(0, 4)) {
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
          const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : new Date().toISOString().slice(0, 10);

          const directNoticeUrl = `https://finance.naver.com/item/news_notice_read.naver?no=${no}&code=${code}`;
          const formattedTitle = `[공시] ${rawTitle}`;
          const summary = `${item.name}의 한국거래소 및 금융감독원 DART 공식 접수 보고서입니다. 주요 경영 및 재무 변동 사항이 포함되어 있습니다.`;

          notices.push({
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
        }
      }
      return notices;
    } catch {
      return [];
    }
  });

  const allDisclosures = (await Promise.allSettled(dartPromises))
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  if (allDisclosures.length > 0) {
    await new Promise(resolve => {
      db.serialize(() => {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure, importance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const d of allDisclosures) {
          stmt.run([d.id, d.symbol, d.companyName, d.title, d.summary, d.source, d.date, d.url, d.sentiment, 1, d.importance]);
        }
        stmt.finalize(() => resolve());
      });
    });
  }

  return allDisclosures.length;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// 4. 개별 종목 최신 뉴스 & 공시 온디맨드 실시간 검색 (최대 10건 반환)
async function searchLatestNewsForStock(symbol, companyName) {
  if (!symbol) return [];
  const name = companyName || symbol;
  const isKr = /^[0-9]{6}$/.test(symbol);
  const collectedItems = [];

  if (isKr) {
    // 1) 국내 종목 DART 공시 수집 (최대 5건)
    try {
      const noticeUrl = `https://finance.naver.com/item/news_notice.naver?code=${symbol}`;
      const res = await fetch(noticeUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000)
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
            const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : new Date().toISOString().slice(0, 10);
            const directNoticeUrl = `https://finance.naver.com/item/news_notice_read.naver?no=${no}&code=${code}`;
            const formattedTitle = `[공시] ${rawTitle}`;
            const summary = `${name}의 한국거래소 및 금융감독원 DART 공식 접수 보고서입니다. 주요 경영 및 재무 변동 사항이 포함되어 있습니다.`;

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

    // 2) 국내 종목 실시간 언론 보도 뉴스 수집 (최대 5건)
    try {
      const query = encodeURIComponent(`${name} when:5d`);
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`;
      const res = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const xml = await res.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const it of items.slice(0, 5)) {
          const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
          const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
          const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);
          const sourceMatch = it.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);

          let fullTitle = (titleMatch ? titleMatch[1] : '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
          const link = (linkMatch ? linkMatch[1] : '#').trim();
          const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16);
          let sourceName = (sourceMatch ? sourceMatch[1] : '국내언론').replace(/<!\[CDATA\[|\]\]>/g, '').trim();

          if (fullTitle.includes(' - ')) {
            const parts = fullTitle.split(' - ');
            sourceName = parts[parts.length - 1].trim();
            fullTitle = parts.slice(0, -1).join(' - ').trim();
          }

          fullTitle = cleanHtmlText(fullTitle, '');
          if (!fullTitle) continue;

          const summary = `${name} 관련 최신 언론 보도입니다. 상세 내용은 출처 원문 기사를 통해 확인하시기 바랍니다.`;
          const importance = analyzeImportance(fullTitle, summary, false);
          const sentiment = fullTitle.includes('상승') || fullTitle.includes('호실적') || fullTitle.includes('돌파') ? 'positive' : fullTitle.includes('하락') || fullTitle.includes('우려') ? 'negative' : 'neutral';
          const id = `news_${symbol}_${Math.abs(hashString(link + fullTitle))}`;

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
      console.warn(`[searchLatestNews] KR general news error for ${name}:`, err.message);
    }
  } else {
    try {
      const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const xml = await res.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const it of items.slice(0, 6)) {
          const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
          const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
          const pubDateMatch = it.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/);

          let title = (titleMatch ? titleMatch[1] : '').trim();
          const link = (linkMatch ? linkMatch[1] : '#').trim();
          const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16);

          title = cleanHtmlText(title, '');
          if (!title) continue;

          let sourceName = 'Yahoo Finance';
          if (link.includes('fool.com')) sourceName = 'The Motley Fool';
          else if (link.includes('247wallst.com')) sourceName = '24/7 Wall St.';
          else if (link.includes('bloomberg.com')) sourceName = 'Bloomberg';
          else if (link.includes('reuters.com')) sourceName = 'Reuters';

          const translatedTitle = await translateToKorean(title);
          const summary = `${name} 관련 실시간 글로벌 금융 뉴스입니다. 원문 기사에서 상세 내용을 확인하실 수 있습니다.`;

          collectedItems.push({
            id: `us_${symbol}_${Math.abs(hashString(link))}`,
            symbol,
            companyName: name,
            title: translatedTitle,
            summary,
            source: sourceName,
            date: pubDate,
            url: link,
            sentiment: 'positive',
            isDisclosure: 0,
            importance: 4
          });
        }
      }
    } catch (err) {
      console.warn(`[searchLatestNews] Yahoo RSS error for ${symbol}:`, err.message);
    }
  }

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

// 5. 사용자의 관심종목(Watchlist) 전 종목 뉴스 및 DART 공시 필수 자동 수집
async function fetchWatchlistNewsAndDisclosures() {
  const watchlistRows = await new Promise((resolve) => {
    db.all('SELECT symbol, name FROM watchlist', (err, rows) => {
      if (err) return resolve([]);
      resolve(rows || []);
    });
  });

  if (watchlistRows.length === 0) return 0;
  let totalAdded = 0;

  const wlPromises = watchlistRows.map(async (st) => {
    try {
      const items = await searchLatestNewsForStock(st.symbol, st.name);
      return items.length;
    } catch {
      return 0;
    }
  });

  const results = await Promise.allSettled(wlPromises);
  for (const r of results) {
    if (r.status === 'fulfilled') totalAdded += r.value;
  }
  console.log(`⭐ 관심종목 (${watchlistRows.length}개 종목) 전용 뉴스/공시 자동 수집 완료: ${totalAdded}건`);
  return totalAdded;
}

// 전체 실시간 뉴스 & 공시 동기화 실행 함수 (초고속 병렬 실행 + 관심종목 필수 포함)
async function syncAllRealNews() {
  console.log('🔄 실시간 실제 뉴스, 공시 및 관심종목 초고속 병렬 수집 시작...');
  const [krCount, usCount, dartCount, wlCount] = await Promise.all([
    fetchLiveKoreanNews(),
    fetchLiveUsNews(),
    fetchLiveDartDisclosures(),
    fetchWatchlistNewsAndDisclosures()
  ]);
  const total = krCount + usCount + dartCount + (wlCount || 0);
  console.log(`✅ 실시간 뉴스 수집 완료: 국내 ${krCount}건, 미국 ${usCount}건, DART ${dartCount}건, 관심종목 ${wlCount}건 (총 ${total}건)`);
  return { krCount, usCount, dartCount, wlCount, total };
}

module.exports = {
  syncAllRealNews,
  fetchLiveKoreanNews,
  fetchLiveUsNews,
  fetchLiveDartDisclosures,
  fetchWatchlistNewsAndDisclosures,
  searchLatestNewsForStock,
  analyzeImportance,
  summarizeRealContent
};
