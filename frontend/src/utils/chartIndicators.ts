export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// 1. 단순 이동평균선 (SMA)
export function calculateSMA(candles: Candle[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  if (candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  result.push({ time: candles[period - 1].time, value: sum / period });

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    result.push({ time: candles[i].time, value: sum / period });
  }

  return result;
}

// 2. 볼린저 밴드 (Bollinger Bands - 20일, 2 표준편차)
export interface BollingerBandsResult {
  upper: { time: string; value: number }[];
  middle: { time: string; value: number }[];
  lower: { time: string; value: number }[];
}

export function calculateBollingerBands(candles: Candle[], period: number = 20, multiplier: number = 2): BollingerBandsResult {
  const upper: { time: string; value: number }[] = [];
  const middle: { time: string; value: number }[] = [];
  const lower: { time: string; value: number }[] = [];

  if (candles.length < period) return { upper, middle, lower };

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((acc, c) => acc + c.close, 0) / period;
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const time = candles[i].time;
    middle.push({ time, value: mean });
    upper.push({ time, value: mean + multiplier * stdDev });
    lower.push({ time, value: mean - multiplier * stdDev });
  }

  return { upper, middle, lower };
}

// 3. RSI (상대강도지수 - 14일, Wilder's Smoothing)
export function calculateRSI(candles: Candle[], period: number = 14): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
  result.push({ time: candles[period].time, value: rsi });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const currentGain = diff >= 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    result.push({ time: candles[i].time, value: rsi });
  }

  return result;
}

// 4. 지수이동평균 (EMA)
function calculateEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaValues: number[] = [];
  if (values.length < period) return emaValues;

  // 첫 값은 단순 이동평균
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let currentEMA = sum / period;
  emaValues.push(currentEMA);

  for (let i = period; i < values.length; i++) {
    currentEMA = values[i] * k + currentEMA * (1 - k);
    emaValues.push(currentEMA);
  }

  return emaValues;
}

// 5. MACD (12, 26, 9)
export interface MACDResult {
  macd: { time: string; value: number }[];
  signal: { time: string; value: number }[];
  histogram: { time: string; value: number; color: string }[];
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const result: MACDResult = { macd: [], signal: [], histogram: [] };
  if (candles.length < slowPeriod + signalPeriod) return result;

  const closes = candles.map(c => c.close);
  const times = candles.map(c => c.time);

  // EMA 12와 EMA 26 계산
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  // EMA26이 시작되는 인덱스 = slowPeriod - 1
  // EMA12는 fastPeriod - 1부터 시작하므로 인덱스 오프셋 보정
  const offsetFast = slowPeriod - fastPeriod;
  const macdValues: number[] = [];
  const macdTimes: string[] = [];

  for (let i = 0; i < emaSlow.length; i++) {
    const fastVal = emaFast[i + offsetFast];
    const slowVal = emaSlow[i];
    macdValues.push(fastVal - slowVal);
    macdTimes.push(times[slowPeriod - 1 + i]);
  }

  // Signal Line (MACD의 9일 EMA)
  const signalEMA = calculateEMA(macdValues, signalPeriod);
  const signalOffset = signalPeriod - 1;

  for (let i = 0; i < signalEMA.length; i++) {
    const t = macdTimes[i + signalOffset];
    const macdVal = macdValues[i + signalOffset];
    const signalVal = signalEMA[i];
    const histVal = macdVal - signalVal;

    result.macd.push({ time: t, value: macdVal });
    result.signal.push({ time: t, value: signalVal });
    result.histogram.push({
      time: t,
      value: histVal,
      color: histVal >= 0 ? '#10b981' : '#f43f5e'
    });
  }

  return result;
}

// 6. 캔들 집계 변환 (일봉 -> 주봉 / 월봉)
export type ChartInterval = 'D' | 'W' | 'M';

export function aggregateCandles(candles: Candle[], interval: ChartInterval): Candle[] {
  if (interval === 'D' || candles.length === 0) return candles;

  const aggregated: Candle[] = [];
  let currentGroup: Candle[] = [];
  let currentKey = '';

  for (const c of candles) {
    const date = new Date(c.time);
    let key = '';

    if (interval === 'W') {
      // 해당 날짜가 속한 주의 월요일 날짜를 키로 사용
      const day = date.getUTCDay(); // 0(Sun) ~ 6(Sat)
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
      key = monday.toISOString().slice(0, 10);
    } else if (interval === 'M') {
      // YYYY-MM
      key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    if (currentKey !== '' && currentKey !== key) {
      // 이전 그룹 집계 완료
      if (currentGroup.length > 0) {
        aggregated.push(collapseCandleGroup(currentGroup));
      }
      currentGroup = [c];
      currentKey = key;
    } else {
      currentKey = key;
      currentGroup.push(c);
    }
  }

  // 마지막 그룹 추가
  if (currentGroup.length > 0) {
    aggregated.push(collapseCandleGroup(currentGroup));
  }

  return aggregated;
}

function collapseCandleGroup(group: Candle[]): Candle {
  const open = group[0].open;
  const close = group[group.length - 1].close;
  const time = group[group.length - 1].time; // 해당 기간의 마지막 거래일 기준
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;

  for (const item of group) {
    if (item.high > high) high = item.high;
    if (item.low < low) low = item.low;
    volume += (item.volume || 0);
  }

  return {
    time,
    open,
    high,
    low,
    close,
    volume
  };
}
