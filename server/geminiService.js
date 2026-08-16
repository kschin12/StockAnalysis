const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const altEnvPath = 'D:\\Projects\\StockAnalysis\\.env';
if (fs.existsSync(altEnvPath)) {
  require('dotenv').config({ path: altEnvPath, override: true });
}

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.model = 'gemini-flash-lite-latest';
    this.marketAnalysisCache = { data: null, timestamp: 0 };
  }

  getApiKey() {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || this.apiKey;
  }

  isConfigured() {
    const key = this.getApiKey();
    return !!(key && key.trim().length > 10);
  }

  // 1. 국내/해외 기사 & 공시 정밀 분석 (1줄 핵심 요약 + 1줄 투자 고려사항 + AI 중요도 1~5점 + 호재/악재 시그널 판별)
  async analyzeArticle({ title, content = '', symbol = '', companyName = '', isUS = false }) {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.trim().length < 10) {
      return null;
    }

    const marketType = isUS ? '미국/글로벌' : '국내';
    const prompt = `당신은 최고 수준의 주식 애널리스트입니다.
다음 ${marketType} 증시 기사/공시를 분석하여 투자자에게 유익한 1줄 요약과 1줄 투자 고려사항을 작성해주세요.

[기사 정보]
- 종목: ${companyName} (${symbol})
- 제목: ${title}
- 본문/리드: ${content}

[작성 규칙]
반드시 아래 형식 그대로 정확하게 출력하세요 (불필요한 수식어나 인사말 없이 내용만 작성):
[요약] (핵심 사건, 실적 수치, 계약 내용 등 기사의 팩트를 정확히 1문장으로 요약. 절대 중간에 글이 잘리거나 '..'로 끝나지 않도록 완전한 종결어미 문장으로 작성)
[고려사항] (투자자가 실질적으로 중점 확인해야 할 사항이나 리스크/모멘텀 등 투자 관점의 고려사항을 완전한 1문장으로 작성)
[중요도] (1~5 중 숫자 하나만 기재)
[시그널] (긍정, 부정, 중립 중 택1)`;

    const modelsToTry = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite-preview', 'gemini-3.7-flash', 'gemini-3-flash-preview'];

    for (const m of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 500
            }
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) continue;

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length >= 10) {
          this.model = m;

          let summary = '';
          let importance = 3;
          let sentiment = 'neutral';

          const summaryMatch = text.match(/\[요약\]\s*([\s\S]*?)(?:\[고려사항\]|\[중요도\]|$)/i);
          const focusMatch = text.match(/\[고려사항\]\s*([\s\S]*?)(?:\[중요도\]|\[시그널\]|$)/i);
          const impMatch = text.match(/\[중요도\]\s*([1-5])/i);
          const sigMatch = text.match(/\[시그널\]\s*(긍정|부정|중립|호재|악재)/i);

          let summaryText = summaryMatch ? summaryMatch[1].replace(/^[0-9\.\-\s]+/, '').trim() : '';
          let focusText = focusMatch ? focusMatch[1].replace(/^[0-9\.\-\s]+/, '').trim() : '';

          // 말줄임표나 잘린 문장 마침표 처리
          summaryText = summaryText.replace(/\.{2,}$/, '').trim();
          if (summaryText && !summaryText.endsWith('.')) summaryText += '.';
          focusText = focusText.replace(/\.{2,}$/, '').trim();
          if (focusText && !focusText.endsWith('.')) focusText += '.';

          if (summaryText && focusText) {
            summary = `${summaryText}\n• 고려사항: ${focusText}`;
          } else if (summaryText) {
            summary = summaryText;
          } else if (focusText) {
            summary = `• 고려사항: ${focusText}`;
          }

          if (impMatch) {
            importance = parseInt(impMatch[1], 10);
          }

          // 투자/기업과 무관한 노이즈 기사이거나 중요도 1점 이하인 경우 무효 플래그 반환
          const lowerText = text.toLowerCase();
          const isIrrelevant = (
            importance <= 1 ||
            lowerText.includes('무관한') ||
            lowerText.includes('전혀 무관') ||
            lowerText.includes('투자 판단에서 배제') ||
            lowerText.includes('지역 자치구') ||
            lowerText.includes('복지시설') ||
            lowerText.includes('도서관 행사') ||
            lowerText.includes('행정 훈련')
          );

          if (isIrrelevant) {
            return { isIrrelevant: true };
          }

          if (sigMatch) {
            const sig = sigMatch[1];
            if (sig.includes('긍정') || sig.includes('호재')) sentiment = 'positive';
            else if (sig.includes('부정') || sig.includes('악재')) sentiment = 'negative';
            else sentiment = 'neutral';
          }

          return { summary, importance, sentiment };
        }
      } catch (err) {
        // 다음 모델 시도
      }
    }
    return null;
  }

  // 2. 국내외 시장 종합 시황 AI 퀀트 분석 (AI Market Diagnosis)
  async generateMarketAnalysis({ indices = [], sectors = [], krxAdvancers = 0, krxDecliners = 0, usAdvancers = 0, usDecliners = 0 }) {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.trim().length < 10) {
      return null;
    }

    // 10분 캐시 확인 (과도한 API 호출 방지)
    const now = Date.now();
    if (this.marketAnalysisCache.data && (now - this.marketAnalysisCache.timestamp < 10 * 60 * 1000)) {
      return this.marketAnalysisCache.data;
    }

    const indicesSummary = indices.map(i => `${i.name || i.code}: ${i.value || i.currentPrice} (${(i.changeRate || 0) > 0 ? '+' : ''}${i.changeRate || 0}%)`).join(', ');
    const sortedSectors = [...sectors].sort((a, b) => b.changeRate - a.changeRate);
    const topSectors = sortedSectors.slice(0, 3).map(s => `${s.name}(${s.changeRate > 0 ? '+' : ''}${s.changeRate}%)`).join(', ');

    const prompt = `당신은 최고 수준의 글로벌 주식 스트래티지스트입니다.
현재 실시간 국내 및 글로벌 증시 데이터를 바탕으로 투자자를 위한 [국내 증시(KRX) 및 글로벌·미국 증시(US) 시황 브리핑]을 작성해주세요.

[현재 시장 데이터]
- 주요 지수: ${indicesSummary || '코스피, 코스닥, S&P 500, 나스닥 종합, 원/달러 환율'}
- 국내 시장 등락: 상승 ${krxAdvancers}개 / 하락 ${krxDecliners}개
- 미국 시장 등락: 상승 ${usAdvancers}개 / 하락 ${usDecliners}개
- 주도 강세 섹터: ${topSectors || '반도체 & AI, 빅테크, 자동차'}

[작성 가이드]
반드시 다음 JSON 형식으로만 응답하세요. 다른 설명이나 마크다운 백틱 없이 순수 JSON만 출력하세요:
- "krx": 국내 증시(코스피/코스닥)의 지수 방향성, 수급 주체(외인/기관), 주도 섹터 흐름을 2~3문장의 완결된 문장으로 작성.
- "us": 글로벌·미국 증시(S&P 500, 나스닥, 빅테크/AI, 금리/환율 매크로)의 주요 모멘텀과 시장 심리를 2~3문장의 완결된 문장으로 작성.
- 절대 문장이 중간에 잘리거나 '..'로 끝나지 않아야 하며 온전한 마침표(.)로 끝나야 합니다.

{
  "krx": "코스피와 코스닥 지수가 우상향 흐름을 주도하며 시장 참여자들의 위험자산 선호 심리가 강화되고 있습니다. 주도 섹터를 중심으로 외국인 및 기관의 수급 유입이 뚜렷합니다.",
  "us": "S&P500과 나스닥은 AI 인프라 투자 지속성 및 연준(Fed) 금리 정책 전망에 민감하게 반응하고 있습니다. M7 기술주 중심의 이익 성장세가 글로벌 시장 전반의 모멘텀을 지지하고 있습니다."
}`;

    const modelsToTry = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite-preview', 'gemini-3.7-flash'];

    for (const m of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 600,
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) continue;

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length >= 20) {
          let parsed;
          try {
            parsed = JSON.parse(text.trim());
          } catch {
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleanJson);
          }

          if (parsed && (parsed.krx || parsed.us)) {
            const krxText = (parsed.krx || '').replace(/\.{2,}$/g, '.').trim();
            const usText = (parsed.us || '').replace(/\.{2,}$/g, '.').trim();
            const result = {
              krx: krxText,
              us: usText,
              briefing: `${krxText}\n\n${usText}`,
              generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              modelUsed: m
            };
            this.marketAnalysisCache = { data: result, timestamp: now };
            return result;
          }
        }
      } catch (err) {}
    }

    return null;
  }
}

const geminiService = new GeminiService();
module.exports = { geminiService, GeminiService };
