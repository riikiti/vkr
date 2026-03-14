import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ErrorBar, Cell,
} from 'recharts';
import { AvalancheInfo } from '../InfoModal';
import { AvalancheCoefficientInfo } from '../MetricInfo';

const COLORS = ['#4f8ffc', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

function AvalancheTab({ results }) {
  if (!results) return null;
  const { avalanche_results = [] } = results;

  // Aggregate by algorithm (may have multiple sizes)
  const algoMap = {};
  avalanche_results.forEach((r) => {
    if (!algoMap[r.algorithm]) algoMap[r.algorithm] = { means: [], stds: [], mins: [], maxs: [], goods: [] };
    algoMap[r.algorithm].means.push(r.avalanche_mean);
    algoMap[r.algorithm].stds.push(r.avalanche_std);
    algoMap[r.algorithm].mins.push(r.avalanche_min);
    algoMap[r.algorithm].maxs.push(r.avalanche_max);
    algoMap[r.algorithm].goods.push(r.is_good);
  });

  const chartData = Object.entries(algoMap).map(([alg, v]) => {
    const avgMean = v.means.reduce((a, b) => a + b, 0) / v.means.length;
    const avgStd = v.stds.reduce((a, b) => a + b, 0) / v.stds.length;
    return {
      algorithm: alg,
      mean: +avgMean.toFixed(4),
      std: +avgStd.toFixed(4),
      errorY: [+avgStd.toFixed(4), +avgStd.toFixed(4)],
      min: Math.min(...v.mins),
      max: Math.max(...v.maxs),
      isGood: v.goods.every(Boolean),
    };
  });

  const tooltipStyle = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border-light)',
    borderRadius: '12px',
    color: 'var(--color-text-primary)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  };

  return (
    <div className="flex flex-col" style={{ gap: '30px' }}>
      <div className="section-title"><h2>Лавинный эффект</h2><AvalancheInfo /></div>

      <div className="rounded-xl flex items-start gap-4 fade-in"
        style={{ padding: '20px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-purple)" strokeWidth="2" className="shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Что такое лавинный эффект?
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            При изменении 1 бита открытого текста идеальный шифр должен изменить ~50% бит шифротекста.
            Коэффициент 0.5 означает идеальное рассеивание. Допустимое отклонение: ±0.1.
          </p>
        </div>
      </div>

      <div className="glass-card fade-in-delay-1" style={{ padding: '20px' }}>
        <h3 className="font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
          Коэффициент лавинного эффекта
          <AvalancheCoefficientInfo />
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="algorithm" tick={{ fontSize: 12 }}/>
            <YAxis domain={[0, 1]} tick={{ fontSize: 11 }}/>
            <Tooltip contentStyle={tooltipStyle}
              formatter={(value, name) => [value, name === 'mean' ? 'Среднее' : name]}/>
            <ReferenceLine y={0.5} stroke="#34d399" strokeDasharray="6 4" strokeWidth={1.5}
              label={{ value: 'Идеал (0.5)', fill: '#34d399', fontSize: 11 }}/>
            <ReferenceLine y={0.4} stroke="rgba(248,113,113,0.3)" strokeDasharray="3 3"/>
            <ReferenceLine y={0.6} stroke="rgba(248,113,113,0.3)" strokeDasharray="3 3"/>
            <Bar dataKey="mean" radius={[8, 8, 0, 0]} name="Среднее" barSize={45}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8}/>
              ))}
              <ErrorBar dataKey="errorY" width={10} stroke="var(--color-text-secondary)" strokeWidth={1.5}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 fade-in-delay-2" style={{ gap: '30px' }}>
        {chartData.map((r, i) => (
          <div key={r.algorithm} className="glass-card" style={{ padding: '20px' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}/>
                <h4 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{r.algorithm}</h4>
              </div>
              <span className={`chip ${r.isGood ? 'chip-good' : 'chip-bad'}`}>
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: r.isGood ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}/>
                {r.isGood ? 'Хорошо' : 'Плохо'}
              </span>
            </div>

            <div className="mb-5">
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div className="absolute h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(r.mean * 100)}%`,
                    background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}88, ${COLORS[i % COLORS.length]})`,
                  }}/>
                <div className="absolute top-0 h-full w-px" style={{ left: '50%', background: 'var(--color-accent-green)' }}/>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>0.0</span>
                <span className="text-[10px] font-medium" style={{ color: COLORS[i % COLORS.length] }}>{r.mean.toFixed(4)}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>1.0</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Ст. откл.</p>
                <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.std.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Диапазон</p>
                <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {r.min.toFixed(3)}-{r.max.toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AvalancheTab;
