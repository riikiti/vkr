import { OverviewInfo } from '../InfoModal';

function MetricCard({ title, value, subtitle, colorClass, icon }) {
  return (
    <div className={`${colorClass} rounded-2xl transition-all duration-300 fade-in`} style={{ padding: '20px' }}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          {title}
        </p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
      )}
    </div>
  );
}

function OverviewTab({ results }) {
  if (!results) return null;

  const { entropy_results = [], avalanche_results = [], ranking = [], summary = [] } = results;

  const avgEntropy = entropy_results.length > 0
    ? (entropy_results.reduce((s, r) => s + (r.shannon_entropy_cipher || 0), 0) / entropy_results.length).toFixed(4)
    : 'N/A';

  const avgAvalanche = avalanche_results.length > 0
    ? (avalanche_results.reduce((s, r) => s + (r.avalanche_mean || 0), 0) / avalanche_results.length).toFixed(4)
    : 'N/A';

  const bestAlgorithm = ranking.length > 0 ? ranking[0].algorithm : 'N/A';
  const bestScore = ranking.length > 0 ? ranking[0].total_score?.toFixed(4) : '';
  const totalExperiments = entropy_results.length;

  // Build summary lookup by algorithm
  const summaryMap = {};
  (Array.isArray(summary) ? summary : []).forEach((s) => {
    if (s.algorithm) summaryMap[s.algorithm] = s;
  });

  return (
    <div className="flex flex-col" style={{ gap: '30px' }}>
      <div className="section-title">
        <h2>Обзор результатов</h2>
        <OverviewInfo />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4" style={{ gap: '30px' }}>
        <MetricCard title="Лучший алгоритм" value={bestAlgorithm}
          subtitle={bestScore ? `Комплексная оценка: ${bestScore}` : ''}
          colorClass="metric-card-green"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-green)" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
        />
        <MetricCard title="Средняя энтропия" value={avgEntropy}
          subtitle="Шеннон (шифротекст), макс: 8.0"
          colorClass="metric-card-blue"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-blue)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
        />
        <MetricCard title="Лавинный эффект" value={avgAvalanche}
          subtitle="Идеальное значение: 0.5000"
          colorClass="metric-card-purple"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-purple)" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
        />
        <MetricCard title="Экспериментов" value={totalExperiments}
          subtitle="Комбинаций алгоритм x тип x размер"
          colorClass="metric-card-yellow"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-yellow)" strokeWidth="2"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z"/><path d="M6 9.01V9"/></svg>}
        />
      </div>

      <div className="glass-card overflow-hidden fade-in-delay-1">
        <div className="px-6 flex items-center justify-center" style={{ borderBottom: '1px solid var(--color-border)', paddingTop: '20px', paddingBottom: '20px' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
            Сводка по алгоритмам
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ранг</th>
                <th>Алгоритм</th>
                <th>Энтропия (шифр)</th>
                <th>KL-дивергенция</th>
                <th>Лавинный эффект</th>
                <th>Оценка</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => {
                const sum = summaryMap[r.algorithm] || {};
                return (
                  <tr key={r.algorithm}>
                    <td>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          background: i === 0 ? 'rgba(52,211,153,0.15)' : i === 1 ? 'rgba(79,143,252,0.12)' : 'rgba(90,106,138,0.1)',
                          color: i === 0 ? 'var(--color-accent-green)' : i === 1 ? 'var(--color-accent-blue)' : 'var(--color-text-muted)',
                        }}>
                        {r.rank}
                      </div>
                    </td>
                    <td className="font-semibold">{r.algorithm}</td>
                    <td className="font-mono text-xs">{sum.shannon_entropy_cipher?.toFixed(4) ?? 'N/A'}</td>
                    <td className="font-mono text-xs">{sum.kl_divergence?.toFixed(6) ?? 'N/A'}</td>
                    <td className="font-mono text-xs">{sum.avalanche_mean?.toFixed(4) ?? 'N/A'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)', maxWidth: '80px' }}>
                          <div className="h-full rounded-full" style={{
                            width: `${((r.total_score || 0) * 100)}%`,
                            background: (r.total_score || 0) >= 0.8 ? 'var(--color-accent-green)' : (r.total_score || 0) >= 0.6 ? 'var(--color-accent-yellow)' : 'var(--color-accent-red)',
                          }}/>
                        </div>
                        <span className="text-xs font-mono font-medium">{r.total_score?.toFixed(3) ?? 'N/A'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
