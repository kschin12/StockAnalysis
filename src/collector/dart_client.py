import os
import io
import zipfile
import json
import xml.etree.ElementTree as ET
import requests
from typing import Dict, Optional, Any, List
from dotenv import load_dotenv

load_dotenv()

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "cache")

class DartClient:
    """DART Open API 클라이언트"""

    BASE_URL = "https://opendart.fss.or.kr/api"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("DART_API_KEY")
        self.corp_code_map: Dict[str, str] = {}  # stock_code(6자리) -> corp_code(8자리)
        self.name_map: Dict[str, str] = {}       # stock_code -> corp_name
        os.makedirs(CACHE_DIR, exist_ok=True)
        self._load_cached_corp_codes()

    def _load_cached_corp_codes(self):
        """캐시된 corp_code 매핑 파일이 있으면 로드"""
        cache_file = os.path.join(CACHE_DIR, "dart_corp_codes.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.corp_code_map = data.get("stock_to_corp", {})
                    self.name_map = data.get("stock_to_name", {})
            except Exception as e:
                print(f"[DART] 캐시 로드 실패: {e}")

    def update_corp_code_mapping(self) -> bool:
        """DART 전체 고유번호(corpCode.xml)를 다운로드하여 상장사 매핑 테이블 업데이트"""
        if not self.api_key:
            print("[DART] API 키가 설정되지 않아 고유번호를 다운로드할 수 없습니다.")
            return False

        url = f"{self.BASE_URL}/corpCode.xml"
        params = {"crtfc_key": self.api_key}

        try:
            print("[DART] 기업 고유번호(corpCode.xml) 다운로드 중...")
            response = requests.get(url, params=params, timeout=30)
            if response.status_code != 200:
                print(f"[DART] 다운로드 실패: HTTP {response.status_code}")
                return False

            with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                xml_filename = z.namelist()[0]
                with z.open(xml_filename) as xml_file:
                    tree = ET.parse(xml_file)
                    root = tree.getroot()

                    stock_to_corp = {}
                    stock_to_name = {}

                    for item in root.findall("list"):
                        stock_code = item.findtext("stock_code", "").strip()
                        corp_code = item.findtext("corp_code", "").strip()
                        corp_name = item.findtext("corp_name", "").strip()

                        # 상장사만 필터 (stock_code가 있는 경우)
                        if stock_code and len(stock_code) == 6:
                            stock_to_corp[stock_code] = corp_code
                            stock_to_name[stock_code] = corp_name

                    self.corp_code_map = stock_to_corp
                    self.name_map = stock_to_name

                    # 캐시 저장
                    cache_file = os.path.join(CACHE_DIR, "dart_corp_codes.json")
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump({
                            "stock_to_corp": stock_to_corp,
                            "stock_to_name": stock_to_name
                        }, f, ensure_ascii=False, indent=2)

                    print(f"[DART] 매핑 완료: 상장사 {len(stock_to_corp)}개사 정보 캐싱됨.")
                    return True
        except Exception as e:
            print(f"[DART] 고유번호 파싱 에러: {e}")
            return False

    def get_financial_summary(self, stock_code: str, year: str = "2023", reprt_code: str = "11011") -> Optional[Dict[str, Any]]:
        """
        단일회사 주요계정 재무제표 조회
        - reprt_code: 1분기(11013), 반기(11012), 3분기(11014), 사업보고서/연간(11011)
        """
        if not self.api_key:
            print("[DART] API 키가 없습니다.")
            return None

        corp_code = self.corp_code_map.get(stock_code)
        if not corp_code:
            # 매핑 시도
            if not self.update_corp_code_mapping():
                return None
            corp_code = self.corp_code_map.get(stock_code)
            if not corp_code:
                print(f"[DART] 종목코드 {stock_code}에 해당하는 DART 고유번호를 찾을 수 없습니다.")
                return None

        url = f"{self.BASE_URL}/fnlttSinglAcnt.json"
        params = {
            "crtfc_key": self.api_key,
            "corp_code": corp_code,
            "bsns_year": year,
            "reprt_code": reprt_code
        }

        try:
            res = requests.get(url, params=params, timeout=10)
            data = res.json()

            if data.get("status") != "000":
                print(f"[DART] 응답 메시지: {data.get('message')}")
                return None

            result = {
                "symbol": stock_code,
                "year": int(year),
                "quarter": 4 if reprt_code == "11011" else (1 if reprt_code == "11013" else (2 if reprt_code == "11012" else 3)),
                "revenue": None,
                "operating_income": None,
                "net_income": None
            }

            for item in data.get("list", []):
                account_nm = item.get("account_nm", "")
                amount_str = item.get("thstrm_amount", "").replace(",", "")
                amount = float(amount_str) if amount_str and amount_str != "-" else None

                if "매출액" in account_nm or "수익(매출액)" in account_nm:
                    result["revenue"] = amount
                elif "영업이익" in account_nm:
                    result["operating_income"] = amount
                elif "당기순이익" in account_nm:
                    result["net_income"] = amount

            return result
        except Exception as e:
            print(f"[DART] 재무제표 요청 에러: {e}")
            return None
