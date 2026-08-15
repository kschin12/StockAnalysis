import type { LineData, HistogramData } from 'lightweight-charts';

export interface RealCandleItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// 1. 봉 주기 집계 (일봉 / 주봉 / 월봉)
export function aggregateCandles(candles: RealCandleItem[], interval: 'D' | 'W' | 'M'): RealCandleItem[] {
  if (interval === 'D' || !candles || candles.length === 0) return candles;

  const groups = new Map<string, RealCandleItem[]>();

  for (const c of candles) {
    let key: string;
    const parts = c.time.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day));

    if (interval === 'W') {
      const dayOfWeek = d.getUTCDay();
      const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(Date.UTC(year, month, diff));
      key = monday.toISOString().split('T')[0];
    } else {
      key = `${parts[0]}-${parts[1]}-01`;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(c);
  }

  const aggregated: RealCandleItem[] = [];
  for (const [keyTime, list] of groups.entries()) {
    const open = list[0].open;
    const close = list[list.length - 1].close;
    const high = Math.max(...list.map(l => l.high));
    const low = Math.min(...list.map(l => l.low));
    const volume = list.reduce((sum, l) => sum + (l.volume || 0), 0);

    aggregated.push({
      time: keyTime,
      open,
      high,
      low,
      close,
      volume
    });
  }

  return aggregated.sort((a, b) => a.time.localeCompare(b.time));
}

// 2. 이동평균선 (SMA) 계산
export function calculateSMA(candles: RealCandleItem[], period: number): LineData[] {
  const result: LineData[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i >= period - 1) {
      const slice = candles.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, c) => sum + c.close, 0) / period;
      result.push({ time: candles[i].time as any, value: Math.round(avg * 100) / 100 });
    }
  }
  return result;
}

// 3. 볼린저 밴드 (20일, ±2σ)
export function calculateBollingerBands(candles: RealCandleItem[], period = 20, multiplier = 2): {
  upper: LineData[];
  lower: LineData[];
  middle: LineData[];
} {
  const upper: LineData[] = [];
  const lower: LineData[] = [];
  const middle: LineData[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i >= period - 1) {
      const slice = candles.slice(i - period + 1, i + 1);
      const mean = slice.reduce((sum, c) => sum + c.close, 0) / period;
      const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      const u = Math.round((mean + multiplier * stdDev) * 100) / 100;
      const l = Math.round((mean - multiplier * stdDev) * 100) / 100;
      const m = Math.round(mean * 100) / 100;

      upper.push({ time: candles[i].time as any, value: u });
      lower.push({ time: candles[i].time as any, value: l });
      middle.push({ time: candles[i].time as any, value: m });
    }
  }
  return { upper, lower, middle };
}

// 4. RSI (14일)
export function calculateRSI(candles: RealCandleItem[], period = 14): LineData[] {
  const result: LineData[] = [];
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
  let rsi = 100 - (100 / (1 + rs));
  result.push({ time: candles[period].time as any, value: Math.round(rsi * 10) / 10 });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    result.push({ time: candles[i].time as any, value: Math.round(rsi * 10) / 10 });
  }

  return result;
}

function calculateEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

// 5. MACD (12, 26, 9)
export function calculateMACD(candles: RealCandleItem[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): {
  macdLine: LineData[];
  signalLine: LineData[];
  histogram: HistogramData[];
} {
  if (candles.length < slowPeriod) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  const closes = candles.map(c => c.close);
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdValues: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdValues.push(fastEMA[i] - slowEMA[i]);
  }

  const validMacdValues = macdValues.slice(slowPeriod - 1);
  const validTimes = candles.slice(slowPeriod - 1).map(c => c.time);
  const signalValues = calculateEMA(validMacdValues, signalPeriod);

  const macdLine: LineData[] = [];
  const signalLine: LineData[] = [];
  const histogram: HistogramData[] = [];

  for (let i = 0; i < validTimes.length; i++) {
    const m = Math.round(validMacdValues[i] * 100) / 100;
    const s = Math.round(signalValues[i] * 100) / 100;
    const h = Math.round((m - s) * 100) / 100;

    macdLine.push({ time: validTimes[i] as any, value: m });
    signalLine.push({ time: validTimes[i] as any, value: s });
    histogram.push({
      time: validTimes[i] as any,
      value: h,
      color: h >= 0 ? 'rgba(16, 185, 129, 0.65)' : 'rgba(244, 63, 94, 0.65)'
    });
  }

  return { macdLine, signalLine, histogram };
}
