import { createCanvas } from 'canvas';
import { writeFileSync, readFileSync } from 'fs';

const OUT = 'C:/Users/Ruslan/Проекты/вкр/docs/scientific_article/charts';

// Parse API results
const algos = ['AES', 'DES', '3DES', 'BLOWFISH', 'TWOFISH', 'RC4', 'RC6', 'GOST'];
const data = {};
for (const algo of algos) {
  try {
    const raw = JSON.parse(readFileSync(`C:/Users/Ruslan/AppData/Local/Temp/api_parts/${algo}.json`, 'utf-8'));
    data[algo] = raw;
  } catch { console.log(`Skipping ${algo}`); }
}

// Extract entropy data for text input (largest available size)
function getEntropyForText(algo) {
  const results = data[algo]?.entropy_results || [];
  const textResults = results.filter(r => r.data_type === 'text');
  // Get largest size
  textResults.sort((a, b) => b.data_size - a.data_size);
  return textResults[0] || null;
}

function getAvalanche(algo) {
  const results = data[algo]?.avalanche_results || [];
  // Get largest size
  results.sort((a, b) => b.data_size - a.data_size);
  return results[0] || null;
}

function getRanking(algo) {
  return data[algo]?.ranking?.[0] || null;
}

// ===================== CHART 1: Entropy Bar Chart =====================
function drawEntropyChart() {
  const W = 800, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const margin = { top: 50, right: 30, bottom: 80, left: 80 };
  const chartW = W - margin.left - margin.right;
  const chartH = H - margin.top - margin.bottom;

  // Data
  const labels = algos;
  const values = labels.map(a => getEntropyForText(a)?.shannon_entropy_cipher || 0);
  const maxVal = 8.0;
  const minVal = Math.min(...values.filter(v => v > 0)) - 0.005;

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Энтропия Шеннона шифртекста по алгоритмам', W / 2, 30);

  // Bars
  const barWidth = chartW / labels.length * 0.6;
  const gap = chartW / labels.length;

  // Y axis
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + chartH);
  ctx.lineTo(margin.left + chartW, margin.top + chartH);
  ctx.stroke();

  // Y axis labels and grid
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#333333';
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const val = minVal + (maxVal - minVal) * i / ySteps;
    const y = margin.top + chartH - (chartH * i / ySteps);
    ctx.fillText(val.toFixed(3), margin.left - 8, y + 4);
    // Grid line
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartW, y);
    ctx.stroke();
  }

  // Max line (8.0)
  ctx.strokeStyle = '#cc0000';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  const maxY = margin.top + chartH - chartH * ((maxVal - minVal) / (maxVal - minVal));
  ctx.beginPath();
  ctx.moveTo(margin.left, maxY);
  ctx.lineTo(margin.left + chartW, maxY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#cc0000';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('макс: 8.000', margin.left + chartW - 80, maxY - 5);

  // Draw bars
  const colors = ['#2196F3', '#f44336', '#FF9800', '#4CAF50', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];
  for (let i = 0; i < labels.length; i++) {
    const val = values[i];
    if (val === 0) continue;
    const barH = chartH * ((val - minVal) / (maxVal - minVal));
    const x = margin.left + gap * i + (gap - barWidth) / 2;
    const y = margin.top + chartH - barH;

    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, barWidth, barH);

    // Value label on top
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(val.toFixed(4), x + barWidth / 2, y - 5);

    // X label
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.save();
    ctx.translate(x + barWidth / 2, margin.top + chartH + 15);
    ctx.fillText(labels[i], 0, 0);
    ctx.restore();
  }

  // Y axis title
  ctx.save();
  ctx.translate(15, margin.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#333333';
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('H(X), бит/байт', 0, 0);
  ctx.restore();

  writeFileSync(`${OUT}/chart1_entropy.png`, canvas.toBuffer('image/png'));
  console.log('Chart 1: Entropy saved');
}

// ===================== CHART 2: Avalanche Effect =====================
function drawAvalancheChart() {
  const W = 800, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const margin = { top: 50, right: 30, bottom: 80, left: 80 };
  const chartW = W - margin.left - margin.right;
  const chartH = H - margin.top - margin.bottom;

  // Filter out RC4 (stream cipher, different avalanche logic)
  const blockAlgos = algos.filter(a => a !== 'RC4');
  const avalData = blockAlgos.map(a => getAvalanche(a));

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Коэффициент лавинного эффекта алгоритмов шифрования', W / 2, 30);

  // Axes
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + chartH);
  ctx.lineTo(margin.left + chartW, margin.top + chartH);
  ctx.stroke();

  const maxVal = 0.6;
  const minVal = 0;
  const gap = chartW / blockAlgos.length;
  const barWidth = gap * 0.5;

  // Y grid
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#333333';
  for (let i = 0; i <= 6; i++) {
    const val = i * 0.1;
    const y = margin.top + chartH - chartH * (val / maxVal);
    ctx.fillText(val.toFixed(1), margin.left - 8, y + 4);
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartW, y);
    ctx.stroke();
  }

  // Ideal line at 0.5
  ctx.strokeStyle = '#cc0000';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  const idealY = margin.top + chartH - chartH * (0.5 / maxVal);
  ctx.beginPath();
  ctx.moveTo(margin.left, idealY);
  ctx.lineTo(margin.left + chartW, idealY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#cc0000';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('идеал (0.5)', margin.left + chartW - 80, idealY - 5);

  // Bars with error bars
  const colors = ['#2196F3', '#f44336', '#FF9800', '#4CAF50', '#9C27B0', '#795548', '#607D8B'];
  for (let i = 0; i < blockAlgos.length; i++) {
    const d = avalData[i];
    if (!d) continue;
    const mean = d.avalanche_mean;
    const std = d.avalanche_std;
    const barH = chartH * (mean / maxVal);
    const x = margin.left + gap * i + (gap - barWidth) / 2;
    const y = margin.top + chartH - barH;

    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, barWidth, barH);

    // Error bar
    const errTop = margin.top + chartH - chartH * ((mean + std) / maxVal);
    const errBot = margin.top + chartH - chartH * (Math.max(0, mean - std) / maxVal);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + barWidth / 2, errTop);
    ctx.lineTo(x + barWidth / 2, errBot);
    ctx.stroke();
    // Caps
    ctx.beginPath();
    ctx.moveTo(x + barWidth / 2 - 5, errTop);
    ctx.lineTo(x + barWidth / 2 + 5, errTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + barWidth / 2 - 5, errBot);
    ctx.lineTo(x + barWidth / 2 + 5, errBot);
    ctx.stroke();

    // Value
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(mean.toFixed(4), x + barWidth / 2, y - 8);

    // Label
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.fillText(blockAlgos[i], x + barWidth / 2, margin.top + chartH + 18);
  }

  // Y axis title
  ctx.save();
  ctx.translate(15, margin.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#333333';
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Коэффициент лавинного эффекта', 0, 0);
  ctx.restore();

  writeFileSync(`${OUT}/chart2_avalanche.png`, canvas.toBuffer('image/png'));
  console.log('Chart 2: Avalanche saved');
}

// ===================== CHART 3: Grouped Bar Chart =====================
function drawGroupedBarChart() {
  const W = 900, H = 520;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const margin = { top: 50, right: 30, bottom: 90, left: 70 };
  const chartW = W - margin.left - margin.right;
  const chartH = H - margin.top - margin.bottom;

  const showAlgos = ['AES', 'DES', '3DES', 'BLOWFISH', 'TWOFISH', 'RC6', 'GOST'];
  const metrics = [
    { key: 'score_entropy', label: 'Энтропия', color: '#2196F3' },
    { key: 'score_avalanche', label: 'Лавинный эффект', color: '#4CAF50' },
    { key: 'score_corr', label: 'Корреляция', color: '#FF9800' },
  ];

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Комплексная оценка криптостойкости алгоритмов', W / 2, 30);

  // Axes
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + chartH);
  ctx.lineTo(margin.left + chartW, margin.top + chartH);
  ctx.stroke();

  // Y range: 0.96 .. 1.00
  const minVal = 0.96;
  const maxVal = 1.005;
  const ySteps = 5;

  // Y grid + labels
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#333333';
  for (let i = 0; i <= ySteps; i++) {
    const val = minVal + (maxVal - minVal) * i / ySteps;
    const y = margin.top + chartH - (chartH * i / ySteps);
    ctx.fillText(val.toFixed(3), margin.left - 8, y + 4);
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartW, y);
    ctx.stroke();
  }

  // Ideal line at 1.0
  ctx.strokeStyle = '#cc0000';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  const idealY = margin.top + chartH - chartH * ((1.0 - minVal) / (maxVal - minVal));
  ctx.beginPath();
  ctx.moveTo(margin.left, idealY);
  ctx.lineTo(margin.left + chartW, idealY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#cc0000';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('идеал (1.0)', margin.left + chartW - 80, idealY - 5);

  // Grouped bars
  const numAlgos = showAlgos.length;
  const numMetrics = metrics.length;
  const groupW = chartW / numAlgos;
  const barW = groupW * 0.7 / numMetrics;
  const groupPad = groupW * 0.15;

  for (let ai = 0; ai < numAlgos; ai++) {
    const r = getRanking(showAlgos[ai]);
    if (!r) continue;

    for (let mi = 0; mi < numMetrics; mi++) {
      const val = r[metrics[mi].key] || 0;
      const clampedVal = Math.max(minVal, Math.min(maxVal, val));
      const barH = chartH * ((clampedVal - minVal) / (maxVal - minVal));
      const x = margin.left + groupW * ai + groupPad + barW * mi;
      const y = margin.top + chartH - barH;

      ctx.fillStyle = metrics[mi].color;
      ctx.fillRect(x, y, barW - 1, barH);

      // Value on top
      ctx.fillStyle = '#000000';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(val.toFixed(3), x + barW / 2, y - 3);
    }

    // Algo label
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(showAlgos[ai], margin.left + groupW * ai + groupW / 2, margin.top + chartH + 18);
  }

  // Y axis title
  ctx.save();
  ctx.translate(15, margin.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#333333';
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Оценка (0–1)', 0, 0);
  ctx.restore();

  // Legend
  let legendX = margin.left + 20;
  const legendY = H - 25;
  ctx.font = '12px Arial';
  for (const m of metrics) {
    ctx.fillStyle = m.color;
    ctx.fillRect(legendX, legendY - 9, 14, 14);
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.fillText(m.label, legendX + 18, legendY + 3);
    legendX += 180;
  }

  writeFileSync(`${OUT}/chart3_radar.png`, canvas.toBuffer('image/png'));
  console.log('Chart 3: Grouped bar saved');
}

// Create output directory and generate
import { mkdirSync } from 'fs';
try { mkdirSync(OUT, { recursive: true }); } catch {}

drawEntropyChart();
drawAvalancheChart();
drawGroupedBarChart();
console.log('All charts generated!');
