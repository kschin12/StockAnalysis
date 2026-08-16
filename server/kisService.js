const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const altEnvPath = 'D:\\Projects\\StockAnalysis\\.env';
if (fs.existsSync(altEnvPath)) {
  require('dotenv').config({ path: altEnvPath, override: true });
}

const TOKEN_CACHE_PATH = path.join(__dirname, '..', 'data', 'kis_token.json');

class KisService {
  constructor() {
    this.appKey = process.env.KIS_APP_KEY || '';
    this.appSecret = process.env.KIS_APP_SECRET || '';
    this.accountNo = process.env.KIS_ACCOUNT_NO || '';
    this.accountPrdt = process.env.KIS_ACCOUNT_PRDT || '01';
    this.isSimulation = String(process.env.KIS_IS_SIMULATION || '').toLowerCase() === 'true';

    // Base URL 분기 (실전 vs 모의)
    this.baseUrl = this.isSimulation 
      ? 'https://openapivts.koreainvestment.com:29443'
      : 'https://openapi.koreainvestment.com:9443';

    // 토큰 디스크 캐시 로드
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
    this._loadTokenFromDisk();
  }

  _loadTokenFromDisk() {
    try {
      if (fs.existsSync(TOKEN_CACHE_PATH)) {
        const raw = fs.readFileSync(TOKEN_CACHE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.token && parsed.expiresAt && Date.now() < parsed.expiresAt - 10 * 60 * 1000) {
          this.cachedToken = parsed.token;
          this.tokenExpiresAt = parsed.expiresAt;
        }
      }
    } catch {
      // ignore
    }
  }

  _saveTokenToDisk(token, expiresAt) {
    try {
      const dir = path.dirname(TOKEN_CACHE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify({ token, expiresAt }), 'utf8');
    } catch {
      // ignore
    }
  }

  // 1. 실시간 설정 상태 조회
  getStatus() {
    this._loadTokenFromDisk();
    return {
      configured: !!(this.appKey && this.appSecret && this.accountNo),
      isSimulation: this.isSimulation,
      accountNoMasked: this.accountNo ? `${this.accountNo.slice(0, 4)}****-${this.accountPrdt}` : '미등록',
      hasToken: !!(this.cachedToken && Date.now() < this.tokenExpiresAt - 60000)
    };
  }

  // 2. 24시간 Access Token 자동 갱신 및 관리 (만료 10분 전 자동 재발급)
  async getAccessToken() {
    this._loadTokenFromDisk();
    const now = Date.now();
    // 토큰이 유효하고 만료까지 10분 이상 남아있는 경우 캐시 재사용
    if (this.cachedToken && now < this.tokenExpiresAt - 10 * 60 * 1000) {
      return this.cachedToken;
    }

    if (!this.appKey || !this.appSecret) {
      throw new Error('KIS AppKey 또는 AppSecret이 .env에 설정되지 않았습니다.');
    }

    console.log(`🔑 [KIS Open API] ${this.isSimulation ? '모의투자' : '실계좌'} 24시간 Access Token 발급 요청...`);
    
    try {
      const res = await fetch(`${this.baseUrl}/oauth2/tokenP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: this.appKey,
          appsecret: this.appSecret
        }),
        signal: AbortSignal.timeout(8000)
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) {
        // 이미 발급받은 토큰이 있는 경우 임시 허용
        if (this.cachedToken) {
          return this.cachedToken;
        }
        throw new Error(data.error_description || data.msg1 || '토큰 발급 실패');
      }

      this.cachedToken = data.access_token;
      const expiresInSec = data.expires_in || 86400; // 기본 24시간
      this.tokenExpiresAt = Date.now() + expiresInSec * 1000;
      this._saveTokenToDisk(this.cachedToken, this.tokenExpiresAt);

      console.log(`✅ [KIS Open API] Access Token 발급 및 영구 저장 완료! (유효기간: ${Math.round(expiresInSec / 3600)}시간)`);
      return this.cachedToken;
    } catch (err) {
      if (this.cachedToken) {
        return this.cachedToken;
      }
      console.error('❌ [KIS Open API Token Error]:', err.message);
      throw err;
    }
  }

  // 3. 실시간 내 계좌 잔고 & 보유종목 조회
  async getAccountBalance() {
    const token = await this.getAccessToken();
    const trId = this.isSimulation ? 'VTTC8434R' : 'TTTC8434R';

    const queryParams = new URLSearchParams({
      CANO: this.accountNo,
      ACNT_PRDT_CD: this.accountPrdt,
      AFHR_FLG: 'N',
      OFL_YN: '',
      INQR_DVSN: '02',
      UNPR_DVSN: '01',
      FUND_STTL_ICLD_YN: 'N',
      FNCG_AMT_AUTO_RDPT_YN: 'N',
      PRCS_DVSN: '00',
      CTX_AREA_FK100: '',
      CTX_AREA_NK100: ''
    });

    const url = `${this.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance?${queryParams.toString()}`;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
        appkey: this.appKey,
        appsecret: this.appSecret,
        tr_id: trId,
        custtype: 'P'
      },
      signal: AbortSignal.timeout(8000)
    });

    const data = await res.json();
    if (data.rt_cd !== '0') {
      throw new Error(data.msg1 || '계좌 잔고 조회 실패');
    }

    // output1: 보유 주식 목록
    const holdings = (data.output1 || []).map(item => ({
      symbol: item.pdno,
      name: item.prdt_name,
      quantity: parseInt(item.hldg_qty, 10) || 0,
      orderableQty: parseInt(item.ord_psbl_qty, 10) || 0,
      avgPrice: parseFloat(item.pchs_avg_pric) || 0,
      currentPrice: parseFloat(item.prpr) || 0,
      purchaseAmount: parseFloat(item.pchs_amt) || 0,
      evaluationAmount: parseFloat(item.evlu_amt) || 0,
      profitLoss: parseFloat(item.evlu_pfls_amt) || 0,
      profitRate: parseFloat(item.evlu_pfls_rt) || 0
    }));

    // output2: 계좌 종합 요약
    const summaryRaw = data.output2?.[0] || {};
    const totalPurchase = parseFloat(summaryRaw.pchs_amt_smtl_amt) || 0;
    const totalProfitLoss = parseFloat(summaryRaw.evlu_pfls_smtl_amt) || 0;
    const summary = {
      deposit: parseFloat(summaryRaw.dnca_tot_amt) || 0, // D+2 예수금
      totalAsset: parseFloat(summaryRaw.tot_evlu_amt) || 0, // 총 자산
      stockEvaluation: parseFloat(summaryRaw.evlu_amt_smtl_amt) || 0, // 주식 평가액 합계
      totalPurchase,
      totalProfitLoss,
      totalProfitRate: totalPurchase > 0 ? Math.round((totalProfitLoss / totalPurchase) * 10000) / 100 : 0
    };

    return {
      success: true,
      isSimulation: this.isSimulation,
      summary,
      holdings,
      timestamp: new Date().toISOString()
    };
  }

  // 4. 주식 주문 (매수 / 매도)
  async sendOrder({ symbol, type = 'BUY', quantity, price = 0, orderType = 'LIMIT' }) {
    const token = await this.getAccessToken();
    
    // TR ID 분기 (실전 vs 모의)
    let trId = '';
    if (type === 'BUY') {
      trId = this.isSimulation ? 'VTTC0802U' : 'TTTC0802U';
    } else {
      trId = this.isSimulation ? 'VTTC0801U' : 'TTTC0801U';
    }

    const ordDvsn = orderType === 'MARKET' ? '01' : '00'; // 00: 지정가, 01: 시장가
    const ordUnpr = orderType === 'MARKET' ? '0' : String(Math.round(price));

    const body = {
      CANO: this.accountNo,
      ACNT_PRDT_CD: this.accountPrdt,
      PDNO: symbol,
      ORD_DVSN: ordDvsn,
      ORD_QTY: String(quantity),
      ORD_UNPR: ordUnpr
    };

    const res = await fetch(`${this.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
        appkey: this.appKey,
        appsecret: this.appSecret,
        tr_id: trId,
        custtype: 'P'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    });

    const data = await res.json();
    if (data.rt_cd !== '0') {
      throw new Error(data.msg1 || '주문 요청 실패');
    }

    return {
      success: true,
      orderNo: data.output?.ODNO || '',
      orderTime: data.output?.ORD_TMD || '',
      symbol,
      type,
      quantity,
      price: orderType === 'MARKET' ? '시장가' : price,
      message: data.msg1 || '주문이 정상 접수되었습니다.'
    };
  }
}

const kisService = new KisService();
module.exports = { kisService, KisService };
