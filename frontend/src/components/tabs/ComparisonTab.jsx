import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#4f8ffc', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

function ComparisonTab({ results }) {
  if (!results) return null;
  const { ranking = [] } = results;

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'var(--color-accent-green)';
    if (score >= 0.6) return 'var(--color-accent-yellow)';
    return 'var(--color-accent-red)';
  };

  // Score columns (score_entropy, score_kl, etc.)
  const scoreKeys = ranking.length > 0
    ? Object.keys(ranking[0]).filter((k) => k.startsWith('score_'))
    : [];

  const METRIC_LABELS = {
    score_entropy: 'Энтропия',
    score_kl: 'KL-дивергенция',
    score_avalanche: 'Лавинный',
    score_corr: 'Корреляция',
  };

  // Radar chart data from score_ columns
  const radarData = scoreKeys.map((key) => {
    const point = { metric: METRIC_LABELS[key] || key };
    ranking.forEach((r) => {
      point[r.algorithm] = +(r[key] || 0).toFixed(4);
    });
    return point;
  });

  const medalColors = ['#fbbf24', '#94a3b8', '#cd7f32'];

  return (
    <div className="flex flex-col" style={{ gap: '30px' }}>
      <div className="section-title"><h2>Сравнение алгоритмов</h2></div>

      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 fade-in" style={{ gap: '30px' }}>
        {ranking.slice(0, 3).map((r, i) => (
          <div key={r.algorithm} className="glass-card text-center relative overflow-hidden" style={{ padding: '20px' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: medalColors[i] }}/>
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ background: `${medalColors[i]}20`, color: medalColors[i] }}>
              {r.rank}
            </div>
            <h4 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{r.algorithm}</h4>
            <p className="text-2xl font-bold mb-1" style={{ color: getScoreColor(r.total_score || 0) }}>
              {((r.total_score || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Комплексная оценка</p>
          </div>
        ))}
      </div>

      {/* Radar */}
      {radarData.length > 0 && (
        <div className="glass-card fade-in-delay-1" style={{ padding: '20px' }}>
          <h3 className="font-semibold mb-5" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
            Радарная диаграмма метрик
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border)"/>
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}/>
              <PolarRadiusAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} domain={[0, 1]}/>
              {ranking.map((r, i) => (
                <Radar key={r.algorithm} name={r.algorithm} dataKey={r.algorithm}
                  stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.1} strokeWidth={2}/>
              ))}
              <Legend/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ranking table */}
      <div className="glass-card overflow-hidden fade-in-delay-2">
        <div className="px-6 flex items-center justify-center" style={{ borderBottom: '1px solid var(--color-border)', paddingTop: '20px', paddingBottom: '20px' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
            Детальный рейтинг
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ранг</th>
                <th>Алгоритм</th>
                <th>Итого</th>
                {scoreKeys.map((key) => (
                  <th key={key}>{METRIC_LABELS[key] || key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.algorithm}>
                  <td>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: i < 3 ? `${medalColors[i]}20` : 'rgba(90,106,138,0.1)',
                        color: i < 3 ? medalColors[i] : 'var(--color-text-muted)',
                      }}>
                      {r.rank}
                    </div>
                  </td>
                  <td className="font-semibold">{r.algorithm}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${((r.total_score || 0) * 100)}%`,
                          background: getScoreColor(r.total_score || 0),
                        }}/>
                      </div>
                      <span className="text-xs font-mono font-semibold" style={{ color: getScoreColor(r.total_score || 0) }}>
                        {r.total_score?.toFixed(3) ?? 'N/A'}
                      </span>
                    </div>
                  </td>
                  {scoreKeys.map((key) => (
                    <td key={key} className="font-mono text-xs">
                      {typeof r[key] === 'number' ? r[key].toFixed(4) : 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score bars */}
      <div className="glass-card fade-in-delay-3" style={{ padding: '20px' }}>
        <h3 className="font-semibold mb-6" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
          Визуальное сравнение
        </h3>
        <div className="space-y-5">
          {ranking.map((r, i) => (
            <div key={r.algorithm} className="flex items-center gap-4">
              <span className="text-sm font-semibold w-28 shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                {r.algorithm}
              </span>
              <div className="flex-1 h-8 rounded-lg overflow-hidden relative" style={{ background: 'var(--color-border)' }}>
                <div className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700"
                  style={{
                    width: `${((r.total_score || 0) * 100)}%`,
                    background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}44, ${COLORS[i % COLORS.length]})`,
                    minWidth: '60px',
                  }}>
                  <span className="text-xs font-bold text-white drop-shadow">{((r.total_score || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ComparisonTab;
