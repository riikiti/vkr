import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const SIZE_LABELS = {
  1024: '1 KB',
  10240: '10 KB',
  102400: '100 KB',
  1048576: '1 MB',
};

const DATA_TYPE_LABELS = {
  text: 'Текст',
  binary: 'Паттерн',
  random: 'Случайные',
  image: 'Изображение',
  zeros: 'Нули',
  structured: 'JSON',
  incremental: 'Счётчик',
};

const COLORS = ['#4f8ffc', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

function DistributionTab({ results }) {
  if (!results) return null;
  const { distribution_results = [] } = results;

  // Aggregate correlation by algorithm
  const algoCorr = {};
  distribution_results.forEach((r) => {
    if (!algoCorr[r.algorithm]) algoCorr[r.algorithm] = { pearson: 0, spearman: 0, count: 0 };
    algoCorr[r.algorithm].pearson += Math.abs(r.corr_pearson || 0);
    algoCorr[r.algorithm].spearman += Math.abs(r.corr_spearman || 0);
    algoCorr[r.algorithm].count += 1;
  });
  const corrChartData = Object.entries(algoCorr).map(([alg, v]) => ({
    algorithm: alg,
    pearson: +(v.pearson / v.count).toFixed(4),
    spearman: +(v.spearman / v.count).toFixed(4),
  }));

  const tooltipStyle = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border-light)',
    borderRadius: '12px',
    color: 'var(--color-text-primary)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  };

  return (
    <div className="flex flex-col" style={{ gap: '30px' }}>
      <div className="section-title"><h2>Статистическое распределение</h2></div>

      {/* Correlation Chart */}
      {corrChartData.length > 0 && (
        <div className="glass-card fade-in" style={{ padding: '20px' }}>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
            Средняя корреляция (|r|) по алгоритмам
          </h3>
          <p className="text-[11px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Чем ближе к 0, тем лучше — нет зависимости между открытым и шифротекстом
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={corrChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="algorithm" tick={{ fontSize: 12 }}/>
              <YAxis tick={{ fontSize: 11 }}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Bar dataKey="pearson" fill="#4f8ffc" radius={[4, 4, 0, 0]} name="Пирсон" barSize={25}/>
              <Bar dataKey="spearman" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Спирмен" barSize={25}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Statistical Metrics */}
      <div className="glass-card overflow-hidden fade-in-delay-1">
        <div className="px-6 flex flex-col items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingTop: '20px', paddingBottom: '20px' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
            Статистические моменты распределения
          </h3>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Идеал для равномерного [0, 255]: среднее = 127.5, дисперсия = 5461.25, асимм. = 0, эксцесс = -1.2
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Алгоритм</th>
                <th>Тип</th>
                <th>Размер</th>
                <th>Среднее</th>
                <th>Дисперсия</th>
                <th>Асимметрия</th>
                <th>Эксцесс</th>
              </tr>
            </thead>
            <tbody>
              {distribution_results.map((r, i) => (
                <tr key={i}>
                  <td className="font-semibold">{r.algorithm}</td>
                  <td>{DATA_TYPE_LABELS[r.data_type] || r.data_type}</td>
                  <td>{SIZE_LABELS[r.data_size] || r.data_size}</td>
                  <td className="font-mono text-xs">
                    <span style={{ color: Math.abs((r.dist_mean || 0) - 127.5) < 5 ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>
                      {r.dist_mean?.toFixed(2)}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{r.dist_variance?.toFixed(2)}</td>
                  <td className="font-mono text-xs">
                    <span style={{ color: Math.abs(r.dist_skewness || 0) < 0.1 ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>
                      {r.dist_skewness?.toFixed(4)}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{r.dist_kurtosis?.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chi-square */}
      <div className="glass-card overflow-hidden fade-in-delay-2">
        <div className="px-6 flex flex-col items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingTop: '20px', paddingBottom: '20px' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
            Тест хи-квадрат на равномерность
          </h3>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            p-значение &gt; 0.05 — распределение считается равномерным
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Алгоритм</th>
                <th>Тип</th>
                <th>Размер</th>
                <th>Chi-2 статистика</th>
                <th>p-значение</th>
                <th>Равномерность</th>
              </tr>
            </thead>
            <tbody>
              {distribution_results.map((r, i) => (
                <tr key={i}>
                  <td className="font-semibold">{r.algorithm}</td>
                  <td>{DATA_TYPE_LABELS[r.data_type] || r.data_type}</td>
                  <td>{SIZE_LABELS[r.data_size] || r.data_size}</td>
                  <td className="font-mono text-xs">{r.freq_chi2_stat?.toFixed(2)}</td>
                  <td className="font-mono text-xs">{r.freq_p_value?.toFixed(4)}</td>
                  <td>
                    <span className={`chip ${r.freq_is_uniform ? 'chip-good' : 'chip-bad'}`}>
                      <span className="w-1.5 h-1.5 rounded-full"
                        style={{ background: r.freq_is_uniform ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}/>
                      {r.freq_is_uniform ? 'Да' : 'Нет'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correlation */}
      <div className="glass-card overflow-hidden fade-in-delay-3">
        <div className="px-6 flex items-center justify-center" style={{ borderBottom: '1px solid var(--color-border)', paddingTop: '20px', paddingBottom: '20px' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
            Корреляционные метрики
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Алгоритм</th>
                <th>Тип</th>
                <th>Размер</th>
                <th>Пирсон</th>
                <th>Спирмен</th>
                <th>Автокорр. (lag1)</th>
                <th>Индекс совпадений</th>
              </tr>
            </thead>
            <tbody>
              {distribution_results.map((r, i) => (
                <tr key={i}>
                  <td className="font-semibold">{r.algorithm}</td>
                  <td>{DATA_TYPE_LABELS[r.data_type] || r.data_type}</td>
                  <td>{SIZE_LABELS[r.data_size] || r.data_size}</td>
                  <td className="font-mono text-xs">
                    <span style={{ color: Math.abs(r.corr_pearson || 0) < 0.05 ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>
                      {r.corr_pearson?.toFixed(4)}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{r.corr_spearman?.toFixed(4)}</td>
                  <td className="font-mono text-xs">{r.autocorr_lag1?.toFixed(4)}</td>
                  <td className="font-mono text-xs">{r.index_of_coincidence?.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DistributionTab;
