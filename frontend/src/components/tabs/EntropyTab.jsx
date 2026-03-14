import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine,
} from 'recharts';

const COLORS = ['#4f8ffc', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'];

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

const tooltipStyle = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-light)',
  borderRadius: '12px',
  color: 'var(--color-text-primary)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

function EntropyTab({ results }) {
  if (!results) return null;
  const { entropy_results = [] } = results;

  const algoMap = {};
  entropy_results.forEach((r) => {
    if (!algoMap[r.algorithm]) algoMap[r.algorithm] = { sum: 0, count: 0 };
    algoMap[r.algorithm].sum += r.shannon_entropy_cipher || 0;
    algoMap[r.algorithm].count += 1;
  });
  const barData = Object.entries(algoMap).map(([alg, v]) => ({
    algorithm: alg,
    entropy: +(v.sum / v.count).toFixed(4),
  }));

  const algorithms = [...new Set(entropy_results.map((r) => r.algorithm))];
  const sizes = [...new Set(entropy_results.map((r) => r.data_size))].sort((a, b) => a - b);
  const lineData = sizes.map((size) => {
    const point = { size: SIZE_LABELS[size] || `${size}B` };
    algorithms.forEach((alg) => {
      const entries = entropy_results.filter((r) => r.algorithm === alg && r.data_size === size);
      if (entries.length > 0) {
        point[alg] = +(entries.reduce((s, e) => s + (e.shannon_entropy_cipher || 0), 0) / entries.length).toFixed(4);
      }
    });
    return point;
  });

  return (
    <div className="flex flex-col" style={{ gap: '30px' }}>
      <div className="section-title"><h2>Анализ энтропии</h2></div>

      <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: '30px' }}>
        <div className="glass-card fade-in" style={{ padding: '20px' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
              Энтропия Шеннона по алгоритмам
            </h3>
            <span className="text-[10px] px-2 py-1 rounded-md font-medium"
              style={{ background: 'rgba(79,143,252,0.1)', color: 'var(--color-accent-blue)' }}>
              макс: 8.0 бит/байт
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f8ffc" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#4f8ffc" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="algorithm" tick={{ fontSize: 12 }}/>
              <YAxis domain={[7.5, 8.05]} tick={{ fontSize: 11 }}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <ReferenceLine y={8.0} stroke="#34d399" strokeDasharray="5 5" label={{ value: 'Макс.', fill: '#34d399', fontSize: 10 }}/>
              <Bar dataKey="entropy" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="Энтропия" barSize={40}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card fade-in-delay-1" style={{ padding: '20px' }}>
          <h3 className="font-semibold mb-5" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
            Энтропия vs размер данных
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="size" tick={{ fontSize: 12 }}/>
              <YAxis domain={[7, 8.1]} tick={{ fontSize: 11 }}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend/>
              {algorithms.map((alg, i) => (
                <Line key={alg} type="monotone" dataKey={alg} stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5} dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
                  activeDot={{ r: 6, strokeWidth: 2 }} name={alg}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card overflow-hidden fade-in-delay-2">
        <div className="px-6 flex items-center justify-center" style={{ borderBottom: '1px solid var(--color-border)', paddingTop: '20px', paddingBottom: '20px' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>Подробные метрики</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Алгоритм</th>
                <th>Тип</th>
                <th>Размер</th>
                <th>Энтропия (откр.)</th>
                <th>Энтропия (шифр)</th>
                <th>KL-дивергенция</th>
                <th>Время (с)</th>
              </tr>
            </thead>
            <tbody>
              {entropy_results.map((r, i) => (
                <tr key={i}>
                  <td className="font-semibold">{r.algorithm}</td>
                  <td>{DATA_TYPE_LABELS[r.data_type] || r.data_type}</td>
                  <td>{SIZE_LABELS[r.data_size] || r.data_size}</td>
                  <td className="font-mono text-xs">{r.shannon_entropy_plain?.toFixed(4)}</td>
                  <td>
                    <span className="font-mono text-xs font-medium" style={{
                      color: (r.shannon_entropy_cipher || 0) > 7.99 ? 'var(--color-accent-green)' : 'var(--color-text-primary)'
                    }}>
                      {r.shannon_entropy_cipher?.toFixed(4)}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{r.kl_divergence?.toFixed(6)}</td>
                  <td className="font-mono text-xs">{(r.encrypt_time_sec || r.encrypt_time)?.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EntropyTab;
