import os
import requests
import yfinance as yf
from typing import Dict, Optional, Any
from dotenv import load_dotenv

load_dotenv()

class USStockClient:
    """미국 주식 시세 및 재무 지표 수집기 (Alpha Vantage + yfinance 하이브리드)"""

    def __init__(self, alpha_vantage_key: Optional[str] = None):
        self.av_key = alpha_vantage_key or os.getenv("ALPHA_VANTAGE_API_KEY")

    def get_stock_data_alpha_vantage(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Alpha Vantage API를 통한 종목 개요(OVERVIEW) 및 시세 조회"""
        if not self.av_key:
            return None

        # 1. OVERVIEW (재무/지표)
        url = "https://www.alphavantage.co/query"
        params = {
            "function": "OVERVIEW",
            "symbol": symbol,
            "apikey": self.av_key
        }

        try:
            res = requests.get(url, params=params, timeout=10)
            data = res.json()

            if not data or "Symbol" not in data:
                # 쿼터 소진 안내 또는 에러
                if "Note" in data or "Information" in data:
                    print(f"[AlphaVantage] 일일 호출 한도 도달: {data.get('Note') or data.get('Information')}")
                return None

            # 2. GLOBAL_QUOTE (현재가)
            quote_params = {
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": self.av_key
            }
            quote_res = requests.get(url, params=quote_params, timeout=10)
            quote_data = quote_res.json().get("Global Quote", {})

            price = float(quote_data.get("05. price", 0)) if quote_data.get("05. price") else None
            change_percent = quote_data.get("10. change percent", "0%").replace("%", "")
            change_rate = float(change_percent) if change_percent else 0.0

            return {
                "symbol": symbol,
                "name": data.get("Name", symbol),
                "market": data.get("Exchange", "US"),
                "asset_type": "ETF" if data.get("AssetType") == "ETF" else "STOCK",
                "sector": data.get("Sector", ""),
                "price": price,
                "change_rate": change_rate,
                "market_cap": float(data.get("MarketCapitalization", 0)) if data.get("MarketCapitalization") else None,
                "per": float(data.get("PERatio", 0)) if data.get("PERatio") and data.get("PERatio") != "None" else None,
                "pbr": float(data.get("PriceToBookRatio", 0)) if data.get("PriceToBookRatio") and data.get("PriceToBookRatio") != "None" else None,
                "psr": float(data.get("PriceToSalesRatioTTM", 0)) if data.get("PriceToSalesRatioTTM") and data.get("PriceToSalesRatioTTM") != "None" else None,
                "roe": float(data.get("ReturnOnEquityTTM", 0)) * 100 if data.get("ReturnOnEquityTTM") and data.get("ReturnOnEquityTTM") != "None" else None,
                "dividend_yield": float(data.get("DividendYield", 0)) * 100 if data.get("DividendYield") and data.get("DividendYield") != "None" else None,
                "high_52w": float(data.get("52WeekHigh", 0)) if data.get("52WeekHigh") else None,
                "low_52w": float(data.get("52WeekLow", 0)) if data.get("52WeekLow") else None,
            }
        except Exception as e:
            print(f"[AlphaVantage] 요청 에러 ({symbol}): {e}")
            return None

    def get_stock_data_yfinance(self, symbol: str) -> Optional[Dict[str, Any]]:
        """yfinance를 통한 미국 종목 데이터 수집 (Alpha Vantage 백업/무료)"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            if not info or "regularMarketPrice" not in info and "currentPrice" not in info:
                # 빠른 시세 확인
                fast_info = ticker.fast_info
                price = fast_info.last_price
                market_cap = fast_info.market_cap
            else:
                price = info.get("currentPrice") or info.get("regularMarketPrice")
                market_cap = info.get("marketCap")

            # 자산 구분 (ETF 판별)
            quote_type = info.get("quoteType", "EQUITY")
            asset_type = "ETF" if quote_type == "ETF" else ("MUTUALFUND" if quote_type == "MUTUALFUND" else "STOCK")

            return {
                "symbol": symbol,
                "name": info.get("shortName") or info.get("longName") or symbol,
                "market": info.get("exchange", "US"),
                "asset_type": asset_type,
                "sector": info.get("sector", ""),
                "price": price,
                "change_rate": info.get("regularMarketChangePercent", 0),
                "volume": info.get("regularMarketVolume", 0),
                "market_cap": market_cap,
                "per": info.get("trailingPE") or info.get("forwardPE"),
                "pbr": info.get("priceToBook"),
                "psr": info.get("priceToSalesTrailing12Months"),
                "roe": (info.get("returnOnEquity") * 100) if info.get("returnOnEquity") else None,
                "dividend_yield": (info.get("dividendYield") * 100) if info.get("dividendYield") else None,
                "high_52w": info.get("fiftyTwoWeekHigh"),
                "low_52w": info.get("fiftyTwoWeekLow"),
            }
        except Exception as e:
            print(f"[yfinance] 데이터 수집 실패 ({symbol}): {e}")
            return None

    def get_stock_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Alpha Vantage 시도 후 실패/한도 초과 시 yfinance로 자동 폴백"""
        data = None
        if self.av_key:
            data = self.get_stock_data_alpha_vantage(symbol)
        
        if not data:
            # yfinance 폴백
            data = self.get_stock_data_yfinance(symbol)

        return data
