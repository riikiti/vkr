import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateReport } from '../../api/client';

function ReportTab({ results }) {
  const [downloading, setDownloading] = useState(null);

  if (!results) return null;

  const DATA_TYPE_NAMES = {
    text: 'Естественный текст',
    binary: 'Бинарный паттерн',
    random: 'Случайные данные',
    image: 'Изображение',
    zeros: 'Нулевые данные',
    structured: 'JSON-структура',
    incremental: 'Счётчик',
  };

  const generatePreview = () => {
    const { ranking = [], entropy_results = [], avalanche_results = [], distribution_results = [] } = results;

    const algorithms = [...new Set(entropy_results.map((r) => r.algorithm))];
    const dataTypes = [...new Set(entropy_results.map((r) => r.data_type))];

    const avalByAlg = {};
    avalanche_results.forEach((r) => {
      if (!avalByAlg[r.algorithm]) avalByAlg[r.algorithm] = { means: [], stds: [], goods: [] };
      avalByAlg[r.algorithm].means.push(r.avalanche_mean);
      avalByAlg[r.algorithm].stds.push(r.avalanche_std);
      avalByAlg[r.algorithm].goods.push(r.is_good);
    });

    const entropyByAlgType = {};
    entropy_results.forEach((r) => {
      const key = `${r.algorithm}|${r.data_type}`;
      if (!entropyByAlgType[key]) entropyByAlgType[key] = { plain: [], cipher: [], kl: [], mi: [] };
      entropyByAlgType[key].plain.push(r.shannon_entropy_plain || 0);
      entropyByAlgType[key].cipher.push(r.shannon_entropy_cipher || 0);
      entropyByAlgType[key].kl.push(r.kl_divergence || 0);
      entropyByAlgType[key].mi.push(r.mutual_information || 0);
    });

    const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    let md = `# Исследование криптостойкости алгоритмов шифрования с применением энтропийного анализа\n\n`;
    md += `**Дата исследования:** ${new Date().toLocaleDateString('ru-RU')}\n\n`;
    md += `**Исследуемые алгоритмы:** ${algorithms.join(', ')}\n\n`;
    md += `**Типы входных данных:** ${dataTypes.map(dt => DATA_TYPE_NAMES[dt] || dt).join(', ')}\n\n`;
    md += `---\n\n`;

    // === 1. RANKING ===
    md += `## 1. Итоговый рейтинг криптостойкости\n\n`;
    md += `| Ранг | Алгоритм | Тип | Оценка | Энтропия | KL-диверг. | Лавинный | Корреляция |\n`;
    md += `| ---- | -------- | --- | ------ | -------- | ---------- | -------- | ---------- |\n`;
    ranking.forEach((r) => {
      const type = ['AES', 'DES', 'BLOWFISH'].includes(r.algorithm) ? 'Блочный' : 'Потоковый';
      md += `| ${r.rank} | ${r.algorithm} | ${type} | ${r.total_score?.toFixed(4) ?? 'N/A'} | ${r.score_entropy?.toFixed(4) ?? '-'} | ${r.score_kl?.toFixed(4) ?? '-'} | ${r.score_avalanche?.toFixed(4) ?? '-'} | ${r.score_corr?.toFixed(4) ?? '-'} |\n`;
    });

    // === 2. ENTROPY BY DATA TYPE ===
    md += `\n## 2. Энтропия Шеннона: влияние типа входных данных\n\n`;
    md += `Ключевой вопрос: насколько хорошо алгоритм маскирует структуру исходных данных?\n\n`;

    md += `| Алгоритм | Тип данных | H(откр.) | H(шифр.) | Прирост | KL-дивергенция |\n`;
    md += `| -------- | ---------- | -------- | -------- | ------- | -------------- |\n`;
    algorithms.forEach((alg) => {
      dataTypes.forEach((dt) => {
        const data = entropyByAlgType[`${alg}|${dt}`];
        if (!data) return;
        const plainH = avg(data.plain);
        const cipherH = avg(data.cipher);
        const kl = avg(data.kl);
        const gain = cipherH - plainH;
        md += `| ${alg} | ${DATA_TYPE_NAMES[dt] || dt} | ${plainH.toFixed(4)} | ${cipherH.toFixed(4)} | ${gain >= 0 ? '+' : ''}${gain.toFixed(4)} | ${kl.toFixed(6)} |\n`;
      });
    });

    md += `\nH(откр.) — энтропия открытого текста, H(шифр.) — энтропия шифротекста. Прирост показывает, насколько алгоритм увеличил энтропию. Идеальное значение H(шифр.) = 8.0 бит/байт.\n`;

    // === 3. KEY OBSERVATIONS ===
    md += `\n## 3. Ключевые наблюдения: зависимость от входных данных\n\n`;

    const contrastRows = [];
    algorithms.forEach((alg) => {
      let minPlain = Infinity, maxPlain = -Infinity;
      let minCipher = Infinity, maxCipher = -Infinity;
      let minCipherType = '';

      dataTypes.forEach((dt) => {
        const data = entropyByAlgType[`${alg}|${dt}`];
        if (!data) return;
        const ph = avg(data.plain);
        const ch = avg(data.cipher);
        if (ph < minPlain) minPlain = ph;
        if (ph > maxPlain) maxPlain = ph;
        if (ch < minCipher) { minCipher = ch; minCipherType = dt; }
        if (ch > maxCipher) maxCipher = ch;
      });

      contrastRows.push({ alg, entropyRange: `${minPlain.toFixed(2)}–${maxPlain.toFixed(2)}`, cipherRange: `${minCipher.toFixed(4)}–${maxCipher.toFixed(4)}`, cipherSpread: maxCipher - minCipher, worstType: minCipherType });
    });

    contrastRows.forEach((row) => {
      md += `- **${row.alg}**: входная энтропия варьировалась от ${row.entropyRange} бит/байт, энтропия шифротекста: ${row.cipherRange}. `;
      if (row.cipherSpread < 0.01) {
        md += `Алгоритм стабилен — результат не зависит от типа входных данных.\n`;
      } else {
        md += `Разброс: ${row.cipherSpread.toFixed(4)} — наихудший результат на данных типа «${DATA_TYPE_NAMES[row.worstType] || row.worstType}».\n`;
      }
    });

    // === 4. AVALANCHE ===
    md += `\n## 4. Лавинный эффект\n\n`;
    md += `Идеальный коэффициент лавинного эффекта = 0.5 (изменение 1 бита открытого текста должно изменить ~50% бит шифротекста).\n\n`;

    md += `| Алгоритм | Среднее | Ст. откл. | Отклонение от идеала | Оценка |\n`;
    md += `| -------- | ------- | --------- | -------------------- | ------ |\n`;
    Object.entries(avalByAlg).forEach(([alg, v]) => {
      const mean = avg(v.means);
      const std = avg(v.stds);
      const deviation = Math.abs(mean - 0.5);
      const good = v.goods.every(Boolean);
      md += `| ${alg} | ${mean.toFixed(4)} | ${std.toFixed(4)} | ${deviation.toFixed(4)} | ${good ? 'Хорошо' : 'Плохо'} |\n`;
    });

    const streamAlgs = algorithms.filter(a => ['RC4', 'CHACHA20'].includes(a));
    const blockAlgs = algorithms.filter(a => ['AES', 'DES', 'BLOWFISH'].includes(a));
    if (streamAlgs.length > 0 && blockAlgs.length > 0) {
      const blockAvg = avg(blockAlgs.map(a => avalByAlg[a] ? avg(avalByAlg[a].means) : 0));
      const streamAvg = avg(streamAlgs.map(a => avalByAlg[a] ? avg(avalByAlg[a].means) : 0));
      md += `\n**Сравнение типов шифров:**\n\n`;
      md += `- Блочные шифры (${blockAlgs.join(', ')}): среднее = ${blockAvg.toFixed(4)}\n`;
      md += `- Потоковые шифры (${streamAlgs.join(', ')}): среднее = ${streamAvg.toFixed(4)}\n`;
      if (Math.abs(blockAvg - streamAvg) > 0.05) {
        md += `- Различие обусловлено архитектурой: потоковые шифры (XOR с ключевым потоком) при изменении 1 бита открытого текста изменяют только 1 бит шифротекста, что снижает коэффициент лавинного эффекта.\n`;
      }
    }

    // === 5. MUTUAL INFORMATION ===
    md += `\n## 5. Взаимная информация (утечка данных)\n\n`;
    md += `Взаимная информация I(X;Y) показывает, сколько бит информации об открытом тексте можно извлечь из шифротекста. Идеал: I = 0.\n\n`;

    algorithms.forEach((alg) => {
      const miValues = [];
      dataTypes.forEach((dt) => {
        const data = entropyByAlgType[`${alg}|${dt}`];
        if (data) miValues.push({ type: dt, mi: avg(data.mi) });
      });
      if (miValues.length === 0) return;
      const avgMI = avg(miValues.map(v => v.mi));
      const worst = miValues.reduce((a, b) => a.mi > b.mi ? a : b);
      md += `- **${alg}**: средняя I = ${avgMI.toFixed(4)} бит`;
      if (worst.mi > 0.1) {
        md += ` (наибольшая утечка на «${DATA_TYPE_NAMES[worst.type] || worst.type}»: ${worst.mi.toFixed(4)})`;
      }
      md += `\n`;
    });

    // === 6. DISTRIBUTION ===
    if (distribution_results.length > 0) {
      md += `\n## 6. Статистические тесты распределения\n\n`;

      const uniformResults = {};
      distribution_results.forEach((r) => {
        if (!uniformResults[r.algorithm]) uniformResults[r.algorithm] = { pass: 0, fail: 0, total: 0 };
        uniformResults[r.algorithm].total++;
        if (r.freq_is_uniform) uniformResults[r.algorithm].pass++;
        else uniformResults[r.algorithm].fail++;
      });

      md += `**Тест хи-квадрат на равномерность** (p > 0.05 — равномерное распределение):\n\n`;
      md += `| Алгоритм | Пройдено | Всего | Процент |\n`;
      md += `| -------- | -------- | ----- | ------- |\n`;
      Object.entries(uniformResults).forEach(([alg, v]) => {
        const pct = ((v.pass / v.total) * 100).toFixed(0);
        md += `| ${alg} | ${v.pass} | ${v.total} | ${pct}% |\n`;
      });

      const corrByAlg = {};
      distribution_results.forEach((r) => {
        if (!corrByAlg[r.algorithm]) corrByAlg[r.algorithm] = [];
        corrByAlg[r.algorithm].push(Math.abs(r.corr_pearson || 0));
      });

      md += `\n**Корреляция открытый текст — шифротекст** (идеал: r ≈ 0):\n\n`;
      md += `| Алгоритм | Средний \\|r\\| | Оценка |\n`;
      md += `| -------- | ------------ | ------ |\n`;
      Object.entries(corrByAlg).forEach(([alg, vals]) => {
        const avgCorr = avg(vals);
        const label = avgCorr < 0.05 ? 'Отлично' : avgCorr < 0.1 ? 'Хорошо' : 'Повышенная';
        md += `| ${alg} | ${avgCorr.toFixed(4)} | ${label} |\n`;
      });
    }

    // === 7. CONCLUSIONS ===
    md += `\n## ${distribution_results.length > 0 ? '7' : '6'}. Выводы\n\n`;

    if (ranking.length > 0) {
      const best = ranking[0];
      const worst = ranking[ranking.length - 1];
      md += `1. **Лучший алгоритм** по комплексной оценке — **${best.algorithm}** (${(best.total_score * 100).toFixed(1)}%).`;
      if (best.algorithm === 'AES' || best.algorithm === 'CHACHA20') {
        md += ` Это подтверждает его статус современного стандарта шифрования.`;
      }
      md += `\n\n`;

      md += `2. **Наименее криптостойкий** — **${worst.algorithm}** (${(worst.total_score * 100).toFixed(1)}%).`;
      if (worst.algorithm === 'DES' || worst.algorithm === 'RC4') {
        md += ` Результат ожидаем — алгоритм считается устаревшим и не рекомендуется к использованию.`;
      }
      md += `\n\n`;
    }

    md += `3. **Влияние типа данных:** все исследованные алгоритмы показали способность приводить энтропию шифротекста к значениям, близким к теоретическому максимуму (8.0 бит/байт), независимо от энтропии входных данных — от нулевых данных (0 бит) до случайных (8 бит).\n\n`;
    md += `4. **Блочные vs потоковые:** блочные шифры (AES, DES, Blowfish) обеспечивают лучший лавинный эффект благодаря многораундовым подстановкам и перестановкам. Потоковые шифры (RC4, ChaCha20) выполняют XOR с ключевым потоком, что обеспечивает высокую энтропию, но не создаёт лавинного эффекта при изменении открытого текста.\n\n`;
    md += `5. **Практическая рекомендация:** для задач, требующих высокой криптостойкости, рекомендуется использовать AES-256 или ChaCha20. DES и RC4 не следует применять в новых системах.\n`;

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
    <div className="flex flex-col" style={{ gap: '30px' }}>
      <div className="flex items-center justify-between">
        <div className="section-title flex-1"><h2>Отчёт</h2></div>
        <div className="flex gap-3 shrink-0">
          {downloadBtns.map(({ format, label, ext, color }) => (
            <button key={format}
              onClick={() => handleDownload(format)}
              disabled={downloading === format}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer"
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

      <div className="glass-card fade-in report-content" style={{ padding: '40px' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="font-bold pb-5" style={{
                color: 'var(--color-text-primary)',
                borderBottom: '2px solid var(--color-border-light)',
                lineHeight: '1.4',
                fontSize: '1.75rem',
                marginBottom: '30px',
              }}>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="font-bold pb-3 flex items-center gap-3" style={{
                color: 'var(--color-text-primary)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '1.35rem',
                marginTop: '50px',
                marginBottom: '25px',
              }}>
                <span className="w-1 h-6 rounded-full shrink-0" style={{ background: 'var(--color-accent-blue)' }}/>
                {children}
              </h2>
            ),
            p: ({ children }) => (
              <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)', lineHeight: '1.85', fontSize: '1rem', marginBottom: '20px' }}>{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="space-y-3 pl-1" style={{ marginBottom: '20px' }}>{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="space-y-4 pl-1" style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', marginBottom: '20px' }}>{children}</ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed" style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: '1.85', paddingLeft: '0.5rem' }}>{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{children}</strong>
            ),
            hr: () => (
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginTop: '30px', marginBottom: '30px' }}/>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto rounded-xl" style={{
                marginTop: '20px',
                marginBottom: '20px',
                border: '1px solid var(--color-border)',
                background: 'rgba(17, 24, 39, 0.4)',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9375rem',
                }}>{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead style={{ background: 'rgba(26, 32, 53, 0.8)' }}>{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody>{children}</tbody>
            ),
            tr: ({ children }) => (
              <tr style={{ borderBottom: '1px solid rgba(30, 42, 69, 0.6)' }}>{children}</tr>
            ),
            th: ({ children }) => (
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontWeight: 600,
                fontSize: '0.8125rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-secondary)',
                borderBottom: '2px solid var(--color-border-light)',
                whiteSpace: 'nowrap',
              }}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td style={{
                padding: '10px 16px',
                color: 'var(--color-text-primary)',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
                fontSize: '0.9375rem',
                whiteSpace: 'nowrap',
              }}>
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
