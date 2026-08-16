import React, { useState, useEffect } from 'react';
import { X, RefreshCw, PieChart, ShieldCheck, AlertCircle, ShoppingCart } from 'lucide-react';

interface KisSummary {
  deposit: number;
  totalAsset: number;
  stockEvaluation: number;
  totalPurchase: number;
  totalProfitLoss: number;
  totalProfitRate: number;
}

interface KisHolding {
  symbol: string;
  name: string;
  quantity: number;
  orderableQty: number;
  avgPrice: number;
  currentPrice: number;
  purchaseAmount: number;
  evaluationAmount: number;
  profitLoss: number;
  profitRate: number;
}

interface KisStatus {
  configured: boolean;
  isSimulation: boolean;
  accountNoMasked: string;
  hasToken: boolean;
}

interface KisAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
}

export const KisAccountModal: React.FC<KisAccountModalProps> = ({ isOpen, onClose, defaultSymbol = '' }) => {
  const [status, setStatus] = useState<KisStatus | null>(null);
  const [summary, setSummary] = useState<KisSummary | null>(null);
  const [holdings, setHoldings] = useState<KisHolding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'balance' | 'order'>('balance');

  // 주문 폼 상태
  const [orderSymbol, setOrderSymbol] = useState(defaultSymbol);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderPriceType, setOrderPriceType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [orderQty, setOrderQty] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<string | null>(null);

  const fetchKisData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. 상태 조회
      const stRes = await fetch('/api/kis/status');
      if (stRes.ok) {
        const stData = await stRes.json();
        setStatus(stData);
      }

      // 2. 잔고 조회
      const balRes = await fetch('/api/kis/balance');
      if (balRes.ok) {
        const balData = await balRes.json();
        setSummary(balData.summary);
        setHoldings(balData.holdings || []);
      } else {
        const errData = await balRes.json();
        setError(errData.error || '잔고 조회 실패');
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKisData();
      if (defaultSymbol) setOrderSymbol(defaultSymbol);
    }
  }, [isOpen, defaultSymbol]);

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSymbol || !orderQty) {
      alert('종목코드와 수량을 입력해주세요.');
      return;
    }

    if (!confirm(`${orderSymbol} 종목을 ${orderQty}주 ${orderType === 'BUY' ? '매수' : '매도'} 주문하시겠습니까?`)) {
      return;
    }

    setIsOrdering(true);
    setOrderResult(null);
    try {
      const res = await fetch('/api/kis/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: orderSymbol.trim(),
          type: orderType,
          quantity: parseInt(orderQty, 10),
          price: orderPriceType === 'MARKET' ? 0 : parseFloat(orderPrice) || 0,
          orderType: orderPriceType
        })
      });
      const data = await res.json();
      if (res.ok) {
        setOrderResult(`✅ ${data.message} (주문번호: ${data.orderNo || '접수완료'})`);
        fetchKisData(); // 잔고 즉시 갱신
      } else {
        setOrderResult(`❌ 주문 실패: ${data.error}`);
      }
    } catch (err: any) {
      setOrderResult(`❌ 주문 에러: ${err.message}`);
    } finally {
      setIsOrdering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#131b2e',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                  한국투자증권 Open API 실계좌 연동
                </h3>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: status?.isSimulation ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: status?.isSimulation ? '#f59e0b' : '#10b981',
                  border: `1px solid ${status?.isSimulation ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                }}>
                  {status?.isSimulation ? '모의투자 모드' : '실계좌 라이브'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                계좌번호: <strong>{status?.accountNoMasked || '조회 중...'}</strong> • 24시간 Access Token 자동 갱신 활성화
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchKisData}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              새로고침
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.15)',
          padding: '0 24px'
        }}>
          <button
            onClick={() => setActiveTab('balance')}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'balance' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'balance' ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'balance' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <PieChart size={16} />
            실시간 자산 & 보유종목
          </button>
          <button
            onClick={() => setActiveTab('order')}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'order' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'order' ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'order' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShoppingCart size={16} />
            원클릭 주식 주문 (매수/매도)
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} />
              <div>{error} (잠시 후 새로고침을 누르시면 정상 조회됩니다.)</div>
            </div>
          )}

          {activeTab === 'balance' && (
            <>
              {/* Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                marginBottom: '24px'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '14px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>총 자산 (평가액+예수금)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    ₩{(summary?.totalAsset || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '14px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>D+2 출금가능 예수금</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa' }}>
                    ₩{(summary?.deposit || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '14px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>주식 총 평가금액</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    ₩{(summary?.stockEvaluation || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '14px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>총 평가손익 (수익률)</div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: (summary?.totalProfitLoss || 0) >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {(summary?.totalProfitLoss || 0) >= 0 ? '+' : ''}₩{(summary?.totalProfitLoss || 0).toLocaleString()}
                    <span style={{ fontSize: '0.85rem' }}>
                      ({(summary?.totalProfitRate || 0) >= 0 ? '+' : ''}{(summary?.totalProfitRate || 0).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Holdings Table */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                  보유 주식 포트폴리오 ({holdings.length}종목)
                </h4>
                {holdings.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px' }}>
                    현재 보유 중인 국내 주식 종목이 없습니다.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left' }}>종목명</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>보유수량</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>매입단가</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>현재가</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>평가금액</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>평가손익</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>수익률</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>주문</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map(h => (
                          <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                              {h.name} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({h.symbol})</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{h.quantity.toLocaleString()}주</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>₩{h.avgPrice.toLocaleString()}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>₩{h.currentPrice.toLocaleString()}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>₩{h.evaluationAmount.toLocaleString()}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: h.profitLoss >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontWeight: 600 }}>
                              {h.profitLoss >= 0 ? '+' : ''}₩{h.profitLoss.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: h.profitRate >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontWeight: 700 }}>
                              {h.profitRate >= 0 ? `+${h.profitRate.toFixed(2)}%` : `${h.profitRate.toFixed(2)}%`}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  setOrderSymbol(h.symbol);
                                  setOrderType('SELL');
                                  setOrderQty(String(h.orderableQty || h.quantity));
                                  setOrderPrice(String(h.currentPrice));
                                  setActiveTab('order');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.72rem', color: '#60a5fa', borderColor: '#3b82f6' }}
                              >
                                매도
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'order' && (
            <form onSubmit={handleSendOrder} style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setOrderType('BUY')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    background: orderType === 'BUY' ? '#ef4444' : 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  매수 (BUY)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('SELL')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    background: orderType === 'SELL' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  매도 (SELL)
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  종목코드 (6자리)
                </label>
                <input
                  type="text"
                  value={orderSymbol}
                  onChange={(e) => setOrderSymbol(e.target.value)}
                  placeholder="예: 005930"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    주문 유형
                  </label>
                  <select
                    value={orderPriceType}
                    onChange={(e) => setOrderPriceType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="LIMIT">지정가</option>
                    <option value="MARKET">시장가</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    주문 수량 (주)
                  </label>
                  <input
                    type="number"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    placeholder="예: 10"
                    min="1"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              {orderPriceType === 'LIMIT' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    주문 단가 (원)
                  </label>
                  <input
                    type="number"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    placeholder="예: 75000"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isOrdering}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: orderType === 'BUY' ? '#ef4444' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '8px',
                  fontSize: '0.95rem'
                }}
              >
                {isOrdering ? '주문 전송 중...' : `${orderType === 'BUY' ? '매수 주문 실행' : '매도 주문 실행'}`}
              </button>

              {orderResult && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: orderResult.startsWith('✅') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: orderResult.startsWith('✅') ? '#34d399' : '#f87171',
                  fontSize: '0.85rem',
                  textAlign: 'center'
                }}>
                  {orderResult}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
