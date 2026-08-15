import os
import json
import time
import requests
from typing import Dict, Optional, Any
from dotenv import load_dotenv

load_dotenv()

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "cache")

class KisClient:
    """한국투자증권 KIS Developers API 클라이언트"""

    def __init__(self, 
                 app_key: Optional[str] = None, 
                 app_secret: Optional[str] = None,
                 is_simulation: bool = True):
        self.app_key = app_key or os.getenv("KIS_APP_KEY", "")
        self.app_secret = app_secret or os.getenv("KIS_APP_SECRET", "")
        
        sim_env = os.getenv("KIS_IS_SIMULATION", "True").lower() in ("true", "1", "t")
        self.is_simulation = is_simulation if is_simulation is not None else sim_env

        if self.is_simulation:
            self.base_url = "https://openapivts.koreainvestment.com:29443"
        else:
            self.base_url = "https://openapi.koreainvestment.com:9443"

        self.access_token = None
        self.token_expiry = 0
        os.makedirs(CACHE_DIR, exist_ok=True)
        self._load_cached_token()

    def _load_cached_token(self):
        """캐시된 액세스 토큰 불러오기"""
        cache_file = os.path.join(CACHE_DIR, "kis_token.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("expiry", 0) > time.time() + 600:  # 만료 10분 전까지 유효
                        self.access_token = data.get("access_token")
                        self.token_expiry = data.get("expiry")
            except Exception as e:
                print(f"[KIS] 토큰 캐시 로드 실패: {e}")

    def get_access_token(self) -> Optional[str]:
        """OAuth 토큰 발급"""
        if self.access_token and self.token_expiry > time.time() + 600:
            return self.access_token

        if not self.app_key or not self.app_secret:
            print("[KIS] App Key 또는 App Secret이 설정되지 않았습니다.")
            return None

        url = f"{self.base_url}/oauth2/tokenP"
        headers = {"content-type": "application/json"}
        body = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret
        }

        try:
            res = requests.post(url, headers=headers, json=body, timeout=10)
            data = res.json()

            if "access_token" in data:
                self.access_token = data["access_token"]
                expires_in = int(data.get("expires_in", 86400))
                self.token_expiry = time.time() + expires_in

                cache_file = os.path.join(CACHE_DIR, "kis_token.json")
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump({
                        "access_token": self.access_token,
                        "expiry": self.token_expiry
                    }, f)

                print("[KIS] 접근 토큰(Access Token) 발급 완료.")
                return self.access_token
            else:
                print(f"[KIS] 토큰 발급 실패: {data}")
                return None
        except Exception as e:
            print(f"[KIS] 토큰 요청 에러: {e}")
            return None

    def get_stock_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """국내 주식 현재가 및 주요 지표 조회 (inquire-price)"""
        token = self.get_access_token()
        if not token:
            return None

        url = f"{self.base_url}/uapi/domestic-stock/v1/quotations/inquire-price"
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": "FHKST01010100"  # 국내주식 시세 조회 tr_id
        }
        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": symbol
        }

        try:
            res = requests.get(url, headers=headers, params=params, timeout=10)
            data = res.json()

            if data.get("rt_cd") != "0":
                print(f"[KIS] 시세 조회 실패 ({symbol}): {data.get('msg1')}")
                return None

            output = data.get("output", {})
            return {
                "symbol": symbol,
                "price": float(output.get("stck_prpr", 0)),
                "change_rate": float(output.get("prdy_ctrt", 0)),
                "volume": int(output.get("acml_vol", 0)),
                "trading_value": float(output.get("acml_tr_pbmn", 0)),
                "high_52w": float(output.get("w52_hgpr", 0)),
                "low_52w": float(output.get("w52_lwpr", 0)),
                "per": float(output.get("per", 0)) if output.get("per") else None,
                "pbr": float(output.get("pbr", 0)) if output.get("pbr") else None,
                "market_cap": float(output.get("hts_avls", 0)) * 100000000 if output.get("hts_avls") else None # 억원 -> 원
            }
        except Exception as e:
            print(f"[KIS] 시세 조회 에러 ({symbol}): {e}")
            return None
