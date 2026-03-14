import { useState } from 'react';

const ALGO_COLORS = {
  AES: '#4f8ffc',
  DES: '#f87171',
  '3DES': '#fb923c',
  BLOWFISH: '#a78bfa',
  RC4: '#34d399',
  GOST: '#fbbf24',
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

const STEP_ICONS = {
  1: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  2: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  3: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  4: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>
    </svg>
  ),
  5: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  6: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  7: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
};

function MiniFreqChart({ freq, color, height = 60 }) {
  if (!freq || freq.length === 0) return null;
  const max = Math.max(...freq, 1);
  const width = 256;

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)', padding: '8px' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {freq.map((v, i) => {
          const barH = (v / max) * (height - 4);
          return (
            <rect key={i} x={i} y={height - barH - 2} width={1} height={barH} fill={color || '#4f8ffc'} opacity={0.8} />
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
        <span>0x00</span>
        <span>Распределение байтов (0-255)</span>
        <span>0xFF</span>
      </div>
    </div>
  );
}

function StepCard({ step, algoColor }) {
  const [expanded, setExpanded] = useState(step.step === 1 || step.step === 5 || step.step === 7);

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-[44px] bottom-0 w-[2px]" style={{ background: 'var(--color-border)' }} />
      <div className="flex" style={{ gap: '16px' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10"
          style={{
            background: step.match === false ? 'rgba(248,113,113,0.2)' : `${algoColor}20`,
            border: `2px solid ${step.match === false ? '#f87171' : algoColor}`,
            color: step.match === false ? '#f87171' : algoColor,
          }}>
          {STEP_ICONS[step.step] || <span className="text-sm font-bold">{step.step}</span>}
        </div>
        <div className="flex-1 rounded-xl transition-all duration-200 cursor-pointer"
          style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', padding: '16px', marginBottom: '12px' }}
          onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{step.title}</h4>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{step.description}</p>
            </div>
            <div className="flex items-center" style={{ gap: '8px' }}>
              {step.entropy !== undefined && (
                <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: `${algoColor}15`, color: algoColor }}>H={step.entropy}</span>
              )}
              {step.data_size !== undefined && (
                <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(90,106,138,0.1)', color: 'var(--color-text-muted)' }}>{step.data_size} B</span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          {expanded && (
            <div className="mt-3 flex flex-col" style={{ gap: '10px' }}>
              {step.data_text && (
                <div className="rounded-lg" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px' }}>
                  <div className="text-[10px] uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Превью</div>
                  <div className="font-mono text-xs break-all" style={{ color: step.match === false ? '#f87171' : 'var(--color-text-primary)', lineHeight: '1.6' }}>{step.data_text}</div>
                </div>
              )}
              {step.data_hex && (
                <div className="rounded-lg" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px' }}>
                  <div className="text-[10px] uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>HEX</div>
                  <div className="font-mono text-[11px] break-all" style={{ color: algoColor, lineHeight: '1.8', letterSpacing: '0.5px' }}>{step.data_hex}</div>
                </div>
              )}
              {step.iv_hex && (
                <div className="rounded-lg" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px' }}>
                  <div className="text-[10px] uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>IV (вектор инициализации)</div>
                  <div className="font-mono text-[11px] break-all" style={{ color: '#fbbf24', lineHeight: '1.8' }}>{step.iv_hex}</div>
                </div>
              )}
              <div className="flex flex-wrap" style={{ gap: '6px' }}>
                {step.key_size_bits && <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(79,143,252,0.1)', color: 'var(--color-accent-blue)' }}>Ключ: {step.key_size_bits} бит</span>}
                {step.padding_bytes !== undefined && <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--color-accent-purple)' }}>+{step.padding_bytes} байт паддинга</span>}
                {step.num_blocks && <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--color-accent-yellow)' }}>{step.num_blocks} блоков</span>}
                {step.block_size && <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(90,106,138,0.1)', color: 'var(--color-text-muted)' }}>Блок: {step.block_size} байт</span>}
                {step.encrypt_time_ms !== undefined && <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-accent-green)' }}>{step.encrypt_time_ms} мс</span>}
                {step.size_overhead !== undefined && <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-accent-red)' }}>+{step.size_overhead} байт overhead</span>}
                {step.match !== undefined && (
                  <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{
                    background: step.match ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    color: step.match ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
                  }}>{step.match ? 'Совпадает с оригиналом' : 'Не совпадает!'}</span>
                )}
              </div>
              {step.freq && <MiniFreqChart freq={step.freq} color={algoColor} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlgoTrace({ trace }) {
  const color = ALGO_COLORS[trace.algorithm] || '#4f8ffc';

  return (
    <div className="glass-card fade-in" style={{ padding: '24px' }}>
      <div className="flex items-center justify-between mb-5 flex-wrap" style={{ gap: '12px' }}>
        <div className="flex items-center" style={{ gap: '12px' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ background: `${color}20`, color }}>
            {trace.algorithm.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {trace.algorithm}
              <span className="text-xs font-normal ml-2" style={{ color: 'var(--color-text-muted)' }}>{trace.data_type_label}</span>
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {trace.mode} | Ключ {trace.key_size_bits} бит
              {trace.block_size ? ` | Блок ${trace.block_size} байт` : ' | Потоковый'}
              {' | '}{trace.data_size} байт
            </p>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: '16px' }}>
          <div className="text-center">
            <div className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Энтропия (вход)</div>
            <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-text-secondary)' }}>{trace.entropy_plain}</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          <div className="text-center">
            <div className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Энтропия (выход)</div>
            <div className="font-mono font-bold text-sm" style={{ color }}>{trace.entropy_cipher}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        {trace.steps.map((step, i) => (
          <StepCard key={i} step={step} algoColor={color} />
        ))}
      </div>
    </div>
  );
}

function EncryptionTraceTab({ traceData }) {
  if (!traceData) {
    return (
      <div className="flex flex-col" style={{ gap: '24px' }}>
        <div className="section-title"><h2>Путь шифрования</h2></div>
        <div className="flex items-center justify-center fade-in" style={{ minHeight: '300px' }}>
          <div className="flex flex-col items-center" style={{ gap: '16px' }}>
            <div className="rounded-2xl flex items-center justify-center"
              style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, rgba(79,143,252,0.12), rgba(167,139,250,0.12))' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="url(#traceGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4f8ffc"/><stop offset="100%" stopColor="#a78bfa"/>
                  </linearGradient>
                </defs>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Запустите эксперимент в боковой панели
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Трассировка шифрования рассчитается автоматически с теми же параметрами
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: '24px' }}>
      <div className="section-title"><h2>Путь шифрования</h2></div>

      {/* Info banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl fade-in" style={{ background: 'rgba(79,143,252,0.08)', border: '1px solid rgba(79,143,252,0.15)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Размер выборки: <span className="font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>{traceData.data_size} байт</span>
          <span className="mx-2" style={{ color: 'var(--color-border)' }}>|</span>
          Типы: {traceData.data_types.map(dt => DATA_TYPE_LABELS[dt] || dt).join(', ')}
          <span className="mx-2" style={{ color: 'var(--color-border)' }}>|</span>
          {traceData.traces.length} {traceData.traces.length === 1 ? 'трассировка' : 'трассировок'}
        </span>
      </div>

      {traceData.traces.map((trace, i) => (
        <AlgoTrace key={`${trace.algorithm}-${trace.data_type}-${i}`} trace={trace} />
      ))}
    </div>
  );
}

export default EncryptionTraceTab;
