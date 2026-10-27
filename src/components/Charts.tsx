import { useId } from 'react';
import { compact } from '../domain/config';

export function DeliveryChart({ total = 1000000, period = 'week', compactView = false }: { total?: number; period?: string; compactView?: boolean }) {
  const gradient = useId().replaceAll(':', '');
  const count = period === 'week' ? 7 : 14;
  const values = Array.from({ length: count }, (_, i) => .3 + i * .035 + Math.sin(i * 1.4) * .14);
  const max = Math.max(...values) * 1.3;
  const points = values.map((value, i) => [50 + i / (count - 1) * 620, 180 - value / max * 140]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return <div className={`delivery-chart ${compactView ? 'chart-compact' : ''}`}><svg viewBox="0 0 710 230" role="img" aria-label={`Illustrative ${period} audience trend, ${compact(total)} total impressions`}><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9ab8a3" stopOpacity=".35" /><stop offset="1" stopColor="#dce7de" stopOpacity="0" /></linearGradient></defs>{[0, 1, 2, 3].map(i => <g key={i}><path d={`M50 ${40 + i * 47} H675`} stroke="#e9ebe5" strokeDasharray="3 5" /><text x="0" y={44 + i * 47} className="chart-label">{compact(total * (3 - i) / 30)}</text></g>)}<path d={`${line} L670 182 L50 182Z`} fill={`url(#${gradient})`} /><path d={line} fill="none" stroke="#376a51" strokeWidth="2.5" strokeLinejoin="round" /><path d={points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${(y + 18 + Math.cos(i) * 12).toFixed(1)}`).join(' ')} fill="none" stroke="#d89184" strokeWidth="2" strokeDasharray="5 5" />{points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#fff" stroke="#376a51" strokeWidth="2" />)}{(period === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['2 Nov', '4 Nov', '6 Nov', '8 Nov', '10 Nov', '12 Nov', '14 Nov']).map((day, i) => <text key={day} x={50 + i * 620 / 6} y="214" textAnchor="middle" className="chart-label">{day}</text>)}</svg><div className="chart-legend"><span><i />Measured audience</span><span><i className="coral" />Forecast</span><small>Illustrative trend</small></div></div>;
}
export function Donut({ value, label, detail }: { value: number; label: string; detail?: string }) {
  const bounded = Math.min(100, Math.max(0, value));
  return <div className="donut"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="64" fill="none" stroke="#e9ede5" strokeWidth="11" /><circle cx="80" cy="80" r="64" fill="none" stroke="#497356" strokeWidth="11" strokeDasharray={`${bounded * 4.02} 402`} strokeLinecap="round" transform="rotate(-90 80 80)" /></svg><div><strong>{Math.round(bounded)}%</strong><span>{label}</span></div>{detail && <small>{detail}</small>}</div>;
}
