const { db } = require('./db');
const { geminiService } = require('./geminiService');

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
    .replace(/&#039;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&middot;/g, '·')
    .replace(/&bull;/g, '•')
    .replace(/&nbsp;/g, ' ')
    .replace(/<\/?[a-zA-Z1-6]+(?:\s+[^>]*)?>/gi, ' ') // 안전한 HTML 태그 완전 제거
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean === fallbackTitle) return '';
  return clean;
}

// 비상장/지역행정/도서관/채용공고/지역행사 등 투자 무관 노이즈 기사 감지 필터
const JUNK_NEWS_PATTERNS = [
  /구청/i, /구의회/i, /시의회/i, /주민센터/i, /행정복지센터/i, /도서관/i, /어린이집/i,
  /복지관/i, /자립생활센터/i, /안보훈련/i, /어부바/i, /새여울/i, /주민자치/i, /동정\b/i,
  /부고\b/i, /인사\b/i, /모집공고/i, /채용공고/i, /구민/i, /시민참여/i, /일자리박람회/i,
  /동료상담가/i, /에코업/i, /동호회/i, /바자회/i, /축제/i, /플리마켓/i
];

function isJunkNews(title = '', content = '') {
  const text = `${title} ${content}`;
  return JUNK_NEWS_PATTERNS.some(pattern => pattern.test(text));
}

// 텍스트에서 종목명 오탐 방지 정밀 매칭
function matchStockFromText(text, stockList) {
  if (!text) return null;

  // 1. 대형주 및 주요 명칭 우선 매칭
  if (text.includes('삼성전자') || (text.includes('삼전') && !text.includes('삼전닉스'))) return { symbol: '005930', name: '삼성전자' };
  if (text.includes('SK하이닉스') || (text.includes('하이닉스') && !text.includes('삼전닉스'))) return { symbol: '000660', name: 'SK하이닉스' };
  if (text.includes('현대차') || text.includes('현대자동차') || text.includes('제네시스')) return { symbol: '005380', name: '현대차' };
  if (text.includes('LG에너지솔루션') || text.includes('LG엔솔') || text.includes('LG에너지')) return { symbol: '373220', name: 'LG에너지솔루션' };
  if (text.includes('POSCO홀딩스') || text.includes('포스코홀딩스') || text.includes('포스코')) return { symbol: '005490', name: 'POSCO홀딩스' };
  if (text.includes('KB금융') || text.includes('국민은행')) return { symbol: '105560', name: 'KB금융' };
  if (text.includes('SK스퀘어')) return { symbol: '402340', name: 'SK스퀘어' };

  // 2. 전체 DB 종목 리스트 검색 (글자수 긴 종목 우선)
  const sortedStocks = [...stockList].sort((a, b) => b.name.length - a.name.length);
  for (const s of sortedStocks) {
    if (!s.name || s.name.length < 2) continue;

    // 2자 이하 짧은 단어 (대덕, 대상, 한화, CJ, SK 등)의 오탐 방지
    if (s.name.length <= 2) {
      // 행정구역(대덕구, 은평구 등), 조사/접미사(대상으로, 한화로 등) 제외
      const excludedSuffixes = [
        s.name + '구', s.name + '시', s.name + '군', s.name + '동',
        s.name + '으로', s.name + '이다', s.name + '자', s.name + '광',
        s.name + '열', s.name + '가'
      ];
      if (excludedSuffixes.some(ex => text.includes(ex))) continue;

      // 짧은 이름은 기업/주식/실적 문맥이 명확한 경우에만 매칭
      const hasBizContext = /(주가|실적|공시|상장|기업|대표|영업익|매출|투자|수주|계약|증시|코스피|코스닥|반도체|바이오|지분|홀딩스|전자|스퀘어)/.test(text);
      if (!hasBizContext) continue;

      if (text.includes(s.name)) {
        return s;
      }
    } else {
      if (text.includes(s.name)) {
        return s;
      }
    }
  }

  return null;
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

    const stockRows = await new Promise(resolve => {
      db.all(`SELECT symbol, name FROM stocks`, [], (err, rows) => {
        resolve(rows || []);
      });
    });
    // 긴 종목명 우선 매칭 (예: 'LG에너지솔루션'이 'LG'보다 먼저 매칭)
    const stockList = (stockRows || []).filter(s => s.name && s.name.length >= 2)
      .sort((a, b) => b.name.length - a.name.length);

    const dlMatches = [...html.matchAll(/<dl[^>]*>([\s\S]*?)<\/dl>/gi)];

    const parsedArticles = [];
    for (const dl of dlMatches) {
      const content = dl[1];
      const subjectMatch = content.match(/<dd[^>]*class="articleSubject"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!subjectMatch) continue;

      const href = subjectMatch[1];
      const fullTitle = subjectMatch[2].replace(/<[^>]+>/g, '').trim();
      if (!fullTitle) continue;

      const pressMatch = content.match(/<span[^>]*class="press"[^>]*>([\s\S]*?)<\/span>/i);
      const wdateMatch = content.match(/<span[^>]*class="wdate"[^>]*>([\s\S]*?)<\/span>/i);
      const summaryMatch = content.match(/<dd[^>]*class="articleSummary"[^>]*>([\s\S]*?)<span/i);

      const sourceName = pressMatch ? pressMatch[1].replace(/<[^>]+>/g, '').trim() : '네이버증권';
      const realPublishedDate = wdateMatch ? wdateMatch[1].trim().substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16);
      const extractedSummary = summaryMatch ? cleanHtmlText(summaryMatch[1], fullTitle) : '';

      const offMatch = href.match(/office_id=([0-9]+)/);
      const artMatch = href.match(/article_id=([0-9]+)/);
      const directUrl = (offMatch && artMatch)
        ? `https://n.news.naver.com/mnews/article/${offMatch[1]}/${artMatch[1]}`
        : `https://finance.naver.com${href}`;

      // 비상장/지역행정/도서관/채용공고 등 노이즈 기사 감지 시 스킵
      if (isJunkNews(fullTitle, extractedSummary)) continue;

      // 정밀 종목 매칭 (전체 DB 종목명 대조)
      const combinedText = `${fullTitle} ${extractedSummary}`;
      const matched = matchStockFromText(combinedText, stockList);

      // 특정 개별 기업이 아닌 거시/정책/증시 종합 기사는 '국내증시'(^KS11)로 분류 (오분류 방지)
      const symbol = matched ? matched.symbol : '^KS11';
      const companyName = matched ? matched.name : '국내증시';

      const id = 'kr_' + (artMatch ? `${offMatch[1]}_${artMatch[1]}` : Buffer.from(fullTitle).toString('base64').substring(0, 16));
      let summary = (extractedSummary && extractedSummary.length >= 15) ? extractedSummary : `${companyName} 관련 주요 언론 보도 내용입니다.`;
      let imp = analyzeImportance(fullTitle, summary, false);
      let sentiment = 'neutral';
      
      if (geminiService.isConfigured()) {
        try {
          const aiRes = await geminiService.analyzeArticle({ title: fullTitle, content: extractedSummary, symbol, companyName, isUS: false });
          if (aiRes) {
            if (aiRes.isIrrelevant) continue; // 투자 무관/지역소음 기사 배제
            if (aiRes.summary) summary = aiRes.summary;
            if (aiRes.importance) imp = aiRes.importance;
            if (aiRes.sentiment) sentiment = aiRes.sentiment;
          }
        } catch {}
      }

      if (imp <= 1) continue;

      parsedArticles.push({
        id,
        symbol,
        companyName,
        title: fullTitle,
        summary,
        source: sourceName,
        date: realPublishedDate,
        url: directUrl,
        sentiment,
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
          const descMatch = it.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

          const rawTitle = titleMatch ? titleMatch[1].trim() : '';
          const link = linkMatch ? linkMatch[1].trim() : '';
          const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16);
          const rawDesc = descMatch ? cleanHtmlText(descMatch[1]) : '';

          if (!rawTitle || !link) continue;

          const translatedTitle = await translateToKorean(rawTitle);
          const translatedDesc = rawDesc ? await translateToKorean(rawDesc) : '';
          const sourceName = 'Yahoo Finance US';

          // 실제 기사 제목 및 본문 내용에 기반한 정확한 티커 매칭
          let matchedSym = sym;
          let matchedName = sym;
          const lowerCombined = (rawTitle + ' ' + rawDesc).toLowerCase();
          if (lowerCombined.includes('apple') || rawTitle.includes('AAPL')) { matchedSym = 'AAPL'; matchedName = 'Apple'; }
          else if (lowerCombined.includes('microsoft') || rawTitle.includes('MSFT')) { matchedSym = 'MSFT'; matchedName = 'Microsoft'; }
          else if (lowerCombined.includes('nvidia') || rawTitle.includes('NVDA')) { matchedSym = 'NVDA'; matchedName = 'NVIDIA'; }
          else if (lowerCombined.includes('tesla') || rawTitle.includes('TSLA')) { matchedSym = 'TSLA'; matchedName = 'Tesla'; }
          else if (lowerCombined.includes('amazon') || rawTitle.includes('AMZN')) { matchedSym = 'AMZN'; matchedName = 'Amazon'; }
          else if (lowerCombined.includes('alphabet') || lowerCombined.includes('google') || rawTitle.includes('GOOGL')) { matchedSym = 'GOOGL'; matchedName = 'Alphabet'; }
          else if (lowerCombined.includes('meta ') || lowerCombined.includes('facebook')) { matchedSym = 'META'; matchedName = 'Meta'; }

          const id = `us_${matchedSym}_${hashString(link)}`;
          let summary = (translatedDesc && translatedDesc.length >= 10) ? translatedDesc : `[${matchedSym} 해외 주요 이슈] ${translatedTitle} 관련 실시간 외신 보도입니다.`;
          let imp = analyzeImportance(translatedTitle, summary, false);
          let sentiment = 'positive';

          if (geminiService.isConfigured()) {
            try {
              const aiRes = await geminiService.analyzeArticle({ title: rawTitle, content: rawDesc, symbol: matchedSym, companyName: matchedName, isUS: true });
              if (aiRes) {
                if (aiRes.summary) summary = aiRes.summary;
                if (aiRes.importance) imp = aiRes.importance;
                if (aiRes.sentiment) sentiment = aiRes.sentiment;
              }
            } catch {}
          }

          results.push({ id, symbol: matchedSym, companyName: matchedName, title: translatedTitle, summary, source: sourceName, date: pubDate, url: link, sentiment, importance: imp });
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
      let query = `${name} when:5d`;
      if (name.length <= 2) {
        query = `"${name}" (주식 OR 주가 OR 실적 OR 공시 OR 반도체 OR 기업 OR 목표가) -구청 -구의회 -주민센터 -도서관 -복지관 -자립생활센터 when:5d`;
      }
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
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

          const descMatch = it.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
          const rawDesc = descMatch ? cleanHtmlText(descMatch[1], fullTitle) : '';
          
          // 비상장/지역행정/도서관/채용공고 등 노이즈 기사이거나 행정구역(대덕구 등) 기사는 엄격 배제
          if (isJunkNews(fullTitle, rawDesc)) continue;
          if (name.length <= 2 && (fullTitle.includes(name + '구') || rawDesc.includes(name + '구'))) continue;

          let summary = '';
          if (rawDesc && rawDesc.length >= 20 && rawDesc !== fullTitle && !rawDesc.includes(fullTitle)) {
            summary = rawDesc;
          } else {
            summary = `${name}의 '${fullTitle}' 관련 ${sourceName}의 주요 언론 보도입니다.`;
          }

          let importance = analyzeImportance(fullTitle, summary, false);
          let sentiment = fullTitle.includes('상승') || fullTitle.includes('호실적') || fullTitle.includes('돌파') ? 'positive' : fullTitle.includes('하락') || fullTitle.includes('우려') ? 'negative' : 'neutral';

          if (geminiService.isConfigured()) {
            try {
              const aiRes = await geminiService.analyzeArticle({ title: fullTitle, content: rawDesc, symbol, companyName: name, isUS: false });
              if (aiRes) {
                if (aiRes.isIrrelevant) continue; // 기업 투자와 무관한 기사는 절대 DB에 추가하지 않음
                if (aiRes.summary) summary = aiRes.summary;
                if (aiRes.importance) importance = aiRes.importance;
                if (aiRes.sentiment) sentiment = aiRes.sentiment;
              }
            } catch {}
          }

          if (importance <= 1) continue;

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
          const descMatch = it.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

          let title = (titleMatch ? titleMatch[1] : '').trim();
          const link = (linkMatch ? linkMatch[1] : '#').trim();
          const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16);
          const rawDesc = descMatch ? cleanHtmlText(descMatch[1]) : '';

          title = cleanHtmlText(title, '');
          if (!title) continue;

          let sourceName = 'Yahoo Finance';
          if (link.includes('fool.com')) sourceName = 'The Motley Fool';
          else if (link.includes('247wallst.com')) sourceName = '24/7 Wall St.';
          else if (link.includes('bloomberg.com')) sourceName = 'Bloomberg';
          else if (link.includes('reuters.com')) sourceName = 'Reuters';

          const translatedTitle = await translateToKorean(title);
          const translatedDesc = rawDesc ? await translateToKorean(rawDesc) : '';
          const summary = (translatedDesc && translatedDesc.length >= 10) ? translatedDesc : `${name} 관련 실시간 글로벌 금융 뉴스입니다.`;

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
