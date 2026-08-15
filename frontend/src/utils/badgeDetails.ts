export interface BadgeDetailInfo {
  type: 'risk' | 'momentum';
  title: string;
  desc: string;
  reason: string;
}

export interface ActiveTooltipState extends BadgeDetailInfo {
  name: string;
  x: number;
  y: number;
}

export const BADGE_DETAILS: Record<string, BadgeDetailInfo> = {
  // --- 1. 위험 지표 감지 사유 ---
  '고부채': {
    type: 'risk',
    title: '고부채 리스크 (부채비율 200% 이상)',
    desc: '자기자본 대비 차입금 등 타인 자본 의존도가 높아 금리 인상기 이자 부담이 커집니다.',
    reason: '부채비율이 200%를 초과하여 재무 레버리지 축소 및 현금흐름 점검 필요'
  },
  '초고부채': {
    type: 'risk',
    title: '초고부채 위험 (부채비율 300% 초과)',
    desc: '부채비율이 300%를 초과하여 재무적 위험 수위가 매우 높은 위험 상태입니다.',
    reason: '유동성 위기 및 자금 조달 차질 시 큰 타격을 받을 수 있어 극도의 주의 필요'
  },
  '가치함정': {
    type: 'risk',
    title: '가치함정(Value Trap) 의심',
    desc: 'PBR 0.5배 미만으로 저평가되어 보이나, ROE가 3% 이하로 극히 낮아 만성 저수익 상태입니다.',
    reason: '구조적인 업황 부진이나 수익성 결여로 인해 주가가 장기 정체될 가능성 농후'
  },
  '실적적자': {
    type: 'risk',
    title: '실적 적자 (당기순손실 / 마이너스 ROE)',
    desc: '최근 결산 또는 분기 실적이 적자 상태로 순이익을 내지 못하고 있습니다.',
    reason: '적자가 장기화될 경우 자본 잠식 및 밸류에이션 훼손 위험 존재'
  },
  '이자보상': {
    type: 'risk',
    title: '이자보상배율 1.0 미만 (한계기업)',
    desc: '영업이익으로 금융 이자 비용조차 갚지 못하는 상태입니다.',
    reason: '영업활동 현금창출 능력 부족으로 이자 상환 능력이 취약함'
  },
  '과열': {
    type: 'risk',
    title: '단기 과열 (RSI 75 이상 과매수)',
    desc: '단기 주가 폭등으로 인해 보조지표가 극단적인 과열 구간에 진입했습니다.',
    reason: '단기 차익실현 매물 출회 및 급격한 가격 조정에 노출될 수 있음'
  },
  '유동비율': {
    type: 'risk',
    title: '단기 유동비율 부족 (100% 미만)',
    desc: '1년 이내 만기 도래 부채 대비 현금화 가능한 유동자산이 부족합니다.',
    reason: '단기 채무 상환 압박 및 유동성 관리 필요'
  },

  // --- 2. 모멘텀 상위 지표 사유 ---
  '신고가 돌파': {
    type: 'momentum',
    title: '52주 신고가 돌파 임박 (95% 이상)',
    desc: '현재 주가가 52주 최고가 대비 95% 이상에 위치하여 역사적 고점 돌파를 시도 중입니다.',
    reason: '상단 매물대가 없어 강한 추세 추종 모멘텀이 발생하기 가장 좋은 기술적 구간'
  },
  '신고가 근접': {
    type: 'momentum',
    title: '52주 신고가 근접 (90% 이상)',
    desc: '최고가 대비 90% 이상 위치로 강력한 중기 상승 추세를 증명하고 있습니다.',
    reason: '시장 주도주에서 전형적으로 나타나는 강한 매수세 및 가격 탄력성 유지'
  },
  '추세강세': {
    type: 'momentum',
    title: '골든 모멘텀 구간 (RSI 55~70)',
    desc: '과열(75↑)되지 않으면서도 탄력적인 상승 탄력이 지속되는 최적의 매수 강세 구간입니다.',
    reason: '건전한 우상향 추세가 진행 중이며 조정 시 지지력이 견고함'
  },
  '고수익 성장': {
    type: 'momentum',
    title: '고수익 성장 펀더멘털 (ROE 15% 이상)',
    desc: '자기자본이익률(ROE)이 15% 이상으로 기업의 탁월한 자본 창출력이 주가를 견인합니다.',
    reason: '워런 버핏의 복리 성장 모델에 부합하는 높은 자본 수익성과 실적 모멘텀'
  },
  '상승탄력': {
    type: 'momentum',
    title: '단기 상승 탄력 (+3% 이상 급등)',
    desc: '당일 거래량이 동반되며 +3% 이상의 강한 가격 탄력이 발생했습니다.',
    reason: '단기 시장의 관심과 매수 수급이 집중되는 모멘텀 발생'
  }
};

// 배지 이름으로 상세 정보 검색 (접두어 매칭 지원)
export function getBadgeDetail(badgeName: string, type: 'risk' | 'momentum'): BadgeDetailInfo {
  if (BADGE_DETAILS[badgeName]) return BADGE_DETAILS[badgeName];

  for (const [key, val] of Object.entries(BADGE_DETAILS)) {
    if (badgeName.startsWith(key)) return val;
  }

  return {
    type,
    title: badgeName,
    desc: type === 'risk' ? '재무 건전성 및 밸류에이션 리스크 요인' : '가격 탄력성 및 수급 모멘텀 신호',
    reason: type === 'risk' ? '퀀트 리스크 감지 기준에 의해 식별됨' : '퀀트 모멘텀 성장 기준에 의해 식별됨'
  };
}

// 배지 바로 옆(우측 또는 좌측)에 정확하게 밀착되는 팝업 위치 계산
export function calculateBadgeTooltipPosition(
  rect: DOMRect,
  tooltipWidth = 320,
  tooltipHeight = 160
): { x: number; y: number } {
  // 1. 기본 위치: 배지 우측 바로 옆 (+12px)
  let x = rect.right + 12;
  let y = rect.top - 8;

  // 2. 우측 화면 공간이 부족한 경우: 배지 좌측 바로 옆 (-12px)
  if (x + tooltipWidth > window.innerWidth - 16) {
    x = rect.left - tooltipWidth - 12;
  }

  // 3. 만약 화면이 좁아서 좌측으로도 넘칠 경우: 화면 좌측 마진 16px에 맞추고 배지 바로 아래로 배치
  if (x < 16) {
    x = Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16));
    y = rect.bottom + 10;
  }

  // 4. 세로 화면(상/하) 경계 내 클램핑
  if (y + tooltipHeight > window.innerHeight - 16) {
    y = window.innerHeight - tooltipHeight - 16;
  }
  if (y < 16) {
    y = 16;
  }

  return { x, y };
}
