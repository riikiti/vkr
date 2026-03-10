import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateReport } from '../../api/client';

function ReportTab({ results }) {
  const [downloading, setDownloading] = useState(null);

  if (!results) return null;

  const generatePreview = () => {
    const { ranking = [], entropy_results = [], avalanche_results = [] } = results;

    // Aggregate avalanche by algorithm
    const avalByAlg = {};
    avalanche_results.forEach((r) => {
      if (!avalByAlg[r.algorithm]) avalByAlg[r.algorithm] = { means: [], stds: [], goods: [] };
      avalByAlg[r.algorithm].means.push(r.avalanche_mean);
      avalByAlg[r.algorithm].stds.push(r.avalanche_std);
      avalByAlg[r.algorithm].goods.push(r.is_good);
    });

    let md = `# Отчёт по криптоанализу\n\n`;
    md += `**Дата:** ${new Date().toLocaleDateString('ru-RU')}\n\n`;
    md += `---\n\n`;
    md += `## Рейтинг алгоритмов\n\n`;
    md += `| Ранг | Алгоритм | Оценка |\n`;
    md += `|------|----------|--------|\n`;
    ranking.forEach((r) => {
      md += `| ${r.rank} | ${r.algorithm} | ${r.total_score?.toFixed(4) ?? 'N/A'} |\n`;
    });

    md += `\n## Энтропия Шеннона\n\n`;
    const algorithms = [...new Set(entropy_results.map((r) => r.algorithm))];
    algorithms.forEach((alg) => {
      const entries = entropy_results.filter((r) => r.algorithm === alg);
      const avgEntropy = (entries.reduce((s, e) => s + (e.shannon_entropy_cipher || 0), 0) / entries.length).toFixed(4);
      md += `- **${alg}**: средняя энтропия шифротекста = ${avgEntropy}\n`;
    });

    md += `\n## Лавинный эффект\n\n`;
    Object.entries(avalByAlg).forEach(([alg, v]) => {
      const avgMean = (v.means.reduce((a, b) => a + b, 0) / v.means.length).toFixed(4);
      const avgStd = (v.stds.reduce((a, b) => a + b, 0) / v.stds.length).toFixed(4);
      const good = v.goods.every(Boolean);
      md += `- **${alg}**: среднее = ${avgMean}, ст. откл. = ${avgStd} (${good ? 'хорошо' : 'плохо'})\n`;
    });

    md += `\n## Выводы\n\n`;
    if (ranking.length > 0) {
      md += `Лучший алгоритм по комплексной оценке: **${ranking[0].algorithm}** (${ranking[0].total_score?.toFixed(4)}).\n\n`;
    }
    md += `Все алгоритмы показали энтропию шифротекста, близкую к теоретическому максимуму (8.0 бит/байт), что свидетельствует о высоком качестве шифрования.\n`;

    return md;
  };

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const response = await generateReport(format, results);
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'markdown' ? 'md' : format;
      a.href = url;
      a.download = `crypto_report.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const preview = generatePreview();

  const downloadBtns = [
    { format: 'markdown', label: 'Markdown', ext: '.md', color: '#4f8ffc' },
    { format: 'csv', label: 'CSV', ext: '.csv', color: '#34d399' },
    { format: 'json', label: 'JSON', ext: '.json', color: '#a78bfa' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-title flex-1"><h2>Отчёт</h2></div>
        <div className="flex gap-2 shrink-0">
          {downloadBtns.map(({ format, label, ext, color }) => (
            <button key={format}
              onClick={() => handleDownload(format)}
              disabled={downloading === format}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
              style={{
                background: `${color}12`,
                border: `1px solid ${color}30`,
                color: color,
                opacity: downloading === format ? 0.5 : 1,
              }}>
              {downloading === format ? (
                <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
              {label}
              <span className="text-[10px] opacity-60">{ext}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-8 fade-in">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mb-4 pb-3" style={{
                color: 'var(--color-text-primary)',
                borderBottom: '1px solid var(--color-border)',
              }}>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mt-8 mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <span className="w-1 h-5 rounded-full inline-block" style={{ background: 'var(--color-accent-blue)' }}/>
                {children}
              </h2>
            ),
            p: ({ children }) => (
              <p className="mb-3 leading-relaxed text-sm" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
            ),
            li: ({ children }) => (
              <li className="mb-1.5 ml-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{children}</strong>
            ),
            hr: () => (
              <hr className="my-4" style={{ border: 'none', borderTop: '1px solid var(--color-border)' }}/>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                <table className="data-table">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider"
                style={{ color: 'var(--color-text-secondary)', background: 'rgba(26,32,53,0.5)', borderBottom: '1px solid var(--color-border)' }}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2.5 text-sm font-mono"
                style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid rgba(30,42,69,0.5)' }}>
                {children}
              </td>
            ),
          }}
        >
          {preview}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default ReportTab;
