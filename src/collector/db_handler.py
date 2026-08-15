import sqlite3
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "stocks.db")

class StockDatabase:
    """SQLite 데이터베이스 관리 클래스"""

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """테이블 및 인덱스 초기화"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. 종목 기본 정보 및 현재 지표 테이블
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS stocks (
                symbol TEXT PRIMARY KEY,           -- 종목코드 (KR: 005930, US: AAPL)
                name TEXT NOT NULL,                -- 종목명
                market TEXT NOT NULL,              -- KRX, KOSDAQ, NYSE, NASDAQ 등
                asset_type TEXT DEFAULT 'STOCK',   -- STOCK, ETF, ETN, SPAC 등
                sector TEXT,                       -- 섹터/업종
                price REAL,                        -- 현재가
                change_rate REAL,                  -- 등락률 (%)
                volume INTEGER,                    -- 거래량
                trading_value REAL,                -- 거래대금
                market_cap REAL,                   -- 시가총액
                per REAL,                          -- PER
                pbr REAL,                          -- PBR
                psr REAL,                          -- PSR
                roe REAL,                          -- ROE (%)
                dividend_yield REAL,               -- 배당수익률 (%)
                high_52w REAL,                     -- 52주 신고가
                low_52w REAL,                      -- 52주 신저가
                rsi_14 REAL,                       -- RSI 14일 지표
                is_active INTEGER DEFAULT 1,       -- 상장 유지 여부
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 2. 기업 재무제표 테이블 (분기/연간)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS financials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                year INTEGER NOT NULL,
                quarter INTEGER NOT NULL,          -- 1, 2, 3, 4 (연간 결산은 4 or 0)
                revenue REAL,                      -- 매출액
                operating_income REAL,             -- 영업이익
                net_income REAL,                   -- 당기순이익
                debt_ratio REAL,                   -- 부채비율 (%)
                current_ratio REAL,                -- 유동비율 (%)
                interest_coverage REAL,            -- 이자보상배율
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(symbol, year, quarter)
            );
            """)

            # 3. 증시 주요 지수 및 환율 테이블
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS market_indices (
                index_code TEXT PRIMARY KEY,       -- KOSPI, KOSDAQ, SPX, IXIC, USDKRW 등
                name TEXT NOT NULL,                -- 지수/환율명
                current_value REAL NOT NULL,       -- 현재 지수/환율
                change_rate REAL,                  -- 등락률 (%)
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 인덱스 생성 (스크리너 고속 검색용)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stocks_market ON stocks (market);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stocks_asset_type ON stocks (asset_type);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stocks_per ON stocks (per);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stocks_pbr ON stocks (pbr);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stocks_roe ON stocks (roe);")

            conn.commit()

    def upsert_stock(self, stock_data: Dict[str, Any]):
        """종목 정보 생성 또는 업데이트"""
        stock_data["updated_at"] = datetime.now().isoformat()
        columns = list(stock_data.keys())
        placeholders = [f":{col}" for col in columns]
        update_clause = ", ".join([f"{col} = :{col}" for col in columns if col != "symbol"])

        query = f"""
        INSERT INTO stocks ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        ON CONFLICT(symbol) DO UPDATE SET
            {update_clause}
        """

        with self.get_connection() as conn:
            conn.cursor().execute(query, stock_data)
            conn.commit()

    def upsert_stocks_batch(self, stock_list: List[Dict[str, Any]]):
        """다수 종목 일괄 저장"""
        if not stock_list:
            return
        for item in stock_list:
            self.upsert_stock(item)

    def upsert_financials(self, fin_data: Dict[str, Any]):
        """재무제표 데이터 생성 또는 업데이트"""
        fin_data["updated_at"] = datetime.now().isoformat()
        columns = list(fin_data.keys())
        placeholders = [f":{col}" for col in columns]
        update_clause = ", ".join([f"{col} = :{col}" for col in columns if col not in ("symbol", "year", "quarter")])

        query = f"""
        INSERT INTO financials ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        ON CONFLICT(symbol, year, quarter) DO UPDATE SET
            {update_clause}
        """

        with self.get_connection() as conn:
            conn.cursor().execute(query, fin_data)
            conn.commit()

    def upsert_market_index(self, index_data: Dict[str, Any]):
        """시장 지수/환율 업데이트"""
        index_data["updated_at"] = datetime.now().isoformat()
        columns = list(index_data.keys())
        placeholders = [f":{col}" for col in columns]
        update_clause = ", ".join([f"{col} = :{col}" for col in columns if col != "index_code"])

        query = f"""
        INSERT INTO market_indices ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        ON CONFLICT(index_code) DO UPDATE SET
            {update_clause}
        """

        with self.get_connection() as conn:
            conn.cursor().execute(query, index_data)
            conn.commit()

    def get_stock(self, symbol: str) -> Optional[Dict[str, Any]]:
        """단일 종목 조회"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM stocks WHERE symbol = ?", (symbol,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def query_screener(self, 
                       market: Optional[str] = None,
                       asset_type: Optional[str] = 'STOCK',
                       min_roe: Optional[float] = None,
                       max_per: Optional[float] = None,
                       max_pbr: Optional[float] = None,
                       min_div: Optional[float] = None,
                       limit: int = 50) -> List[Dict[str, Any]]:
        """스크리너 필터 쿼리 실행"""
        conditions = ["is_active = 1"]
        params = []

        if market:
            conditions.append("market = ?")
            params.append(market)
        if asset_type:
            conditions.append("asset_type = ?")
            params.append(asset_type)
        if min_roe is not None:
            conditions.append("roe >= ?")
            params.append(min_roe)
        if max_per is not None:
            conditions.append("per > 0 AND per <= ?")
            params.append(max_per)
        if max_pbr is not None:
            conditions.append("pbr > 0 AND pbr <= ?")
            params.append(max_pbr)
        if min_div is not None:
            conditions.append("dividend_yield >= ?")
            params.append(min_div)

        where_clause = " AND ".join(conditions)
        query = f"SELECT * FROM stocks WHERE {where_clause} ORDER BY market_cap DESC LIMIT ?"
        params.append(limit)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            return [dict(row) for row in cursor.fetchall()]
