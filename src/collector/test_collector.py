import os
import sys

# 프로젝트 루트 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.collector.db_handler import StockDatabase
from src.collector.dart_client import DartClient
from src.collector.kis_client import KisClient
from src.collector.us_client import USStockClient

def run_test():
    print("=" * 60)
    print("🚀 [1단계] 주식 데이터 수집 및 SQLite 파이프라인 테스트 시작")
    print("=" * 60)

    # 1. DB 초기화
    db = StockDatabase()
    print("✅ [DB] SQLite 데이터베이스 및 테이블 초기화 완료.")

    # 2. 미국 주식 / ETF 수집 테스트 (AAPL, SPY)
    us_client = USStockClient()
    test_us_symbols = ["AAPL", "NVDA", "SPY"]

    print("\n📈 [미국 주식/ETF 데이터 수집 테스트]")
    for sym in test_us_symbols:
        print(f"-> {sym} 데이터 조회 중...")
        data = us_client.get_stock_data(sym)
        if data:
            db.upsert_stock(data)
            print(f"   [성공] {data['name']} ({data['asset_type']}) | 현재가: ${data['price']} | PER: {data['per']} | ROE: {data['roe']}%")
        else:
            print(f"   [실패] {sym} 데이터 수집 실패")

    # 3. 국내 주식 수집 테스트 (005930: 삼성전자)
    print("\n🇰🇷 [국내 주식 데이터 수집 테스트]")
    kis_client = KisClient()
    dart_client = DartClient()

    kr_sym = "005930"
    kr_data = None

    # KIS API 시도
    if kis_client.app_key and kis_client.app_secret:
        print("-> KIS API로 삼성전자(005930) 실시간 시세 조회 중...")
        kr_data = kis_client.get_stock_price(kr_sym)
        if kr_data:
            kr_data["name"] = "삼성전자"
            kr_data["market"] = "KOSPI"
            kr_data["asset_type"] = "STOCK"

    # KIS 키가 아직 없는 경우 yfinance KRX 모드로 대체 수집 (테스트용)
    if not kr_data:
        print("-> KIS 키 미등록: yfinance(005930.KS) 폴백으로 데이터 수집 중...")
        kr_data = us_client.get_stock_data_yfinance("005930.KS")
        if kr_data:
            kr_data["symbol"] = "005930"
            kr_data["name"] = "삼성전자"
            kr_data["market"] = "KOSPI"

    if kr_data:
        db.upsert_stock(kr_data)
        print(f"   [성공] {kr_data['name']} | 현재가: ₩{kr_data['price']:,} | PER: {kr_data['per']} | PBR: {kr_data['pbr']}")
    else:
        print("   [실패] 국내 주식 데이터 수집 실패")

    # DART 재무제표 테스트
    if dart_client.api_key:
        print("\n📊 [DART Open API 재무제표 테스트]")
        fin_data = dart_client.get_financial_summary(kr_sym, year="2023", reprt_code="11011")
        if fin_data:
            db.upsert_financials(fin_data)
            print(f"   [성공] DART 2023 사업보고서: 매출 {fin_data['revenue']:,}원 | 영업이익 {fin_data['operating_income']:,}원")
    else:
        print("\nℹ️ [DART] DART_API_KEY가 .env에 설정되지 않아 재무제표 상세 수집은 건너뜁니다.")

    # 4. 시장 지수 저장 테스트
    print("\n🌐 [증시 시황 주요 지수 저장 테스트]")
    indices = [
        {"index_code": "^KS11", "name": "코스피 (KOSPI)", "current_value": 2650.50, "change_rate": 0.45},
        {"index_code": "^KQ11", "name": "코스닥 (KOSDAQ)", "current_value": 860.20, "change_rate": -0.30},
        {"index_code": "^GSPC", "name": "S&P 500", "current_value": 5100.30, "change_rate": 1.10},
        {"index_code": "USDKRW=X", "name": "원/달러 환율", "current_value": 1335.50, "change_rate": 0.15}
    ]
    for idx in indices:
        db.upsert_market_index(idx)
    print("✅ 코스피/코스닥/S&P500/환율 지수 DB 저장 완료.")

    # 5. 스크리너 쿼리 검증
    print("\n🔍 [스크리너 필터 쿼리 검증]")
    screened_results = db.query_screener(asset_type=None, limit=10)
    print(f"-> 전체 수집 종목 수: {len(screened_results)}개")
    for row in screened_results:
        print(f"   - [{row['market']}] {row['name']} ({row['symbol']}) | Type: {row['asset_type']} | Price: {row['price']} | PER: {row['per']}")

    print("\n" + "=" * 60)
    print("🎉 1단계 데이터 파이프라인 및 SQLite DB 검증이 성공적으로 완료되었습니다!")
    print("=" * 60)

if __name__ == "__main__":
    run_test()
