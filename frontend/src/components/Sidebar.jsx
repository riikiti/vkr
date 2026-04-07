import { useState, useEffect } from 'react';
import { AlgorithmInfoButton } from './AlgorithmInfo';

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

const ALG_ICONS = {
  AES: { color: '#4f8ffc', type: 'block' },
  DES: { color: '#f87171', type: 'block' },
  BLOWFISH: { color: '#34d399', type: 'block' },
  TWOFISH: { color: '#22d3ee', type: 'block' },
  RC4: { color: '#fbbf24', type: 'stream' },
  RC6: { color: '#fb923c', type: 'block' },
  '3DES': { color: '#a78bfa', type: 'block' },
  GOST: { color: '#f472b6', type: 'block' },
};

const TEST_CASES = [
  {
    id: 'full',
    label: 'Полный анализ',
    description: 'Все алгоритмы, все типы, 1KB + 100KB',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    color: '#fbbf24',
    params: {
      algorithms: ['AES', 'DES', 'BLOWFISH', 'TWOFISH', 'RC4', 'RC6', '3DES', 'GOST'],
      data_types: ['text', 'binary', 'random', 'image', 'zeros', 'structured', 'incremental'],
      data_sizes: [1024, 102400],
      avalanche_iterations: 100,
    },
  },
  {
    id: 'block_vs_stream',
    label: 'Блочные vs Потоковые',
    description: 'Блочные (AES, Twofish, RC6) vs Потоковый (RC4)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    color: '#a78bfa',
    params: {
      algorithms: ['AES', 'TWOFISH', 'RC6', 'RC4'],
      data_types: ['text', 'binary', 'random', 'zeros', 'structured'],
      data_sizes: [1024, 10240, 102400],
      avalanche_iterations: 100,
    },
  },
  {
    id: 'entropy_contrast',
    label: 'Контраст энтропии',
    description: 'Нули vs Случайные — все алгоритмы',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    color: '#22d3ee',
    params: {
      algorithms: ['AES', 'DES', 'BLOWFISH', 'TWOFISH', 'RC4', 'RC6', '3DES', 'GOST'],
      data_types: ['zeros', 'binary', 'random'],
      data_sizes: [1024, 10240],
      avalanche_iterations: 100,
    },
  },
  {
    id: 'rc4_vs_rc6',
    label: 'RC4 vs RC6',
    description: 'Потоковый RC4 vs Блочный RC6 (Ривест)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
      </svg>
    ),
    color: '#fb923c',
    params: {
      algorithms: ['RC4', 'RC6'],
      data_types: ['text', 'binary', 'random', 'zeros', 'structured'],
      data_sizes: [1024, 10240, 102400],
      avalanche_iterations: 100,
    },
  },
  {
    id: 'blowfish_vs_twofish',
    label: 'Blowfish vs Twofish',
    description: 'Blowfish (1993) vs Twofish (1998, Шнайер)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    ),
    color: '#22d3ee',
    params: {
      algorithms: ['BLOWFISH', 'TWOFISH'],
      data_types: ['text', 'binary', 'random', 'zeros', 'structured'],
      data_sizes: [1024, 10240, 102400],
      avalanche_iterations: 100,
    },
  },
  {
    id: 'des_vs_3des',
    label: 'DES vs 3DES',
    description: 'DES (1977) vs Triple DES (усиленный)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>
      </svg>
    ),
    color: '#a78bfa',
    params: {
      algorithms: ['DES', '3DES'],
      data_types: ['text', 'binary', 'random', 'zeros', 'structured'],
      data_sizes: [1024, 10240, 102400],
      avalanche_iterations: 100,
    },
  },
  {
    id: 'des_vs_aes',
    label: 'DES vs AES',
    description: 'Старый стандарт (DES) vs Новый (AES-256)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20"/><path d="M2 12h20"/>
      </svg>
    ),
    color: '#4f8ffc',
    params: {
      algorithms: ['DES', 'AES'],
      data_types: ['text', 'binary', 'random', 'zeros', 'structured'],
      data_sizes: [1024, 10240, 102400],
      avalanche_iterations: 100,
    },
  },
  {
    id: 'quick',
    label: 'Быстрый тест',
    description: 'AES + DES, текст + случайные, 1KB',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
    color: '#34d399',
    params: {
      algorithms: ['AES', 'DES'],
      data_types: ['text', 'random'],
      data_sizes: [1024],
      avalanche_iterations: 50,
    },
  },
  {
    id: 'size_scaling',
    label: 'Масштабирование',
    description: 'AES — все размеры, текст + случайные',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
      </svg>
    ),
    color: '#fb923c',
    params: {
      algorithms: ['AES'],
      data_types: ['text', 'random', 'zeros'],
      data_sizes: [1024, 10240, 102400, 1048576],
      avalanche_iterations: 100,
    },
  },
];

const CUSTOM_VALIDATORS = {
  text: (data) => {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(
        typeof data === 'string' ? new TextEncoder().encode(data) : data
      );
      return null;
    } catch {
      return 'Данные не являются валидным UTF-8 текстом';
    }
  },
  structured: (data) => {
    try {
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
      JSON.parse(text);
      return null;
    } catch {
      return 'Данные не являются валидным JSON';
    }
  },
  image: (data) => {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    if (bytes.length < 4) return 'Файл слишком маленький для изображения';
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const jpg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const bmp = bytes[0] === 0x42 && bytes[1] === 0x4D;
    const gif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
    if (!png && !jpg && !bmp && !gif) return 'Файл не является изображением (поддерживаются PNG, JPEG, BMP, GIF)';
    return null;
  },
  zeros: (data) => {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    const allZeros = bytes.every(b => b === 0);
    if (!allZeros) return 'Данные должны состоять только из нулевых байтов';
    return null;
  },
};

function Sidebar({ config, onRun, loading, isOpen, onClose }) {
  const [algorithms, setAlgorithms] = useState([]);
  const [dataTypes, setDataTypes] = useState([]);
  const [dataSizes, setDataSizes] = useState([]);
  const [avalancheIterations, setAvalancheIterations] = useState(100);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customFile, setCustomFile] = useState(null);
  const [customFileBytes, setCustomFileBytes] = useState(null);
  const [customError, setCustomError] = useState(null);

  const availableAlgorithms = config?.algorithms || ['AES', 'DES', 'BLOWFISH', 'TWOFISH', 'RC4', 'RC6', '3DES', 'GOST'];
  const availableDataTypes = config?.data_types || ['text', 'binary', 'random', 'image'];
  const availableDataSizes = config?.data_sizes || [1024, 10240, 102400, 1048576];

  useEffect(() => {
    if (config) {
      setAlgorithms(config.algorithms || []);
      setDataTypes(config.data_types || []);
      setDataSizes(config.data_sizes || []);
    }
  }, [config]);


  const toggleItem = (list, setList, item) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const selectAll = (available, current, setter) => {
    if (current.length === available.length) {
      setter([]);
    } else {
      setter([...available]);
    }
  };

  const validateCustomData = () => {
    if (!customMode) return true;

    const hasTextInput = customText.trim().length > 0;
    const hasFileInput = customFileBytes !== null;

    if (!hasTextInput && !hasFileInput) {
      setCustomError('Введите данные или загрузите файл');
      return false;
    }

    if (dataTypes.length !== 1) {
      setCustomError('При загрузке своих данных выберите один тип данных');
      return false;
    }

    const selectedType = dataTypes[0];
    const validator = CUSTOM_VALIDATORS[selectedType];

    if (validator) {
      const rawData = hasFileInput ? customFileBytes : customText;
      const error = validator(rawData);
      if (error) {
        setCustomError(error);
        return false;
      }
    }

    setCustomError(null);
    return true;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCustomFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomFileBytes(new Uint8Array(ev.target.result));
      setCustomError(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const getCustomDataBase64 = () => {
    if (customFileBytes) {
      let binary = '';
      for (let i = 0; i < customFileBytes.length; i++) {
        binary += String.fromCharCode(customFileBytes[i]);
      }
      return btoa(binary);
    }
    return btoa(unescape(encodeURIComponent(customText)));
  };

  const handleRun = () => {
    if (algorithms.length === 0 || dataTypes.length === 0) return;
    if (!customMode && dataSizes.length === 0) return;
    if (!validateCustomData()) return;

    const params = {
      algorithms,
      data_types: dataTypes,
      data_sizes: customMode ? [0] : dataSizes,
      avalanche_iterations: avalancheIterations,
    };

    if (customMode) {
      params.custom_data = getCustomDataBase64();
    }

    onRun(params);
  };

  const handleTestCase = (tc) => {
    if (loading) return;
    setCustomMode(false);
    setCustomError(null);
    setAlgorithms(tc.params.algorithms);
    setDataTypes(tc.params.data_types);
    setDataSizes(tc.params.data_sizes);
    setAvalancheIterations(tc.params.avalanche_iterations);
    onRun(tc.params);
  };

  return (
    <aside className={`sidebar flex flex-col h-full overflow-hidden${isOpen ? ' sidebar-open' : ''}`}
      style={{
        background: 'linear-gradient(180deg, var(--color-bg-secondary) 0%, #0d1220 100%)',
        borderRight: '1px solid var(--color-border)',
      }}>
      {/* Logo */}
      <div className="shrink-0" style={{ padding: '30px' }}>
        <div className="flex items-center gap-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #4f8ffc, #a78bfa)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>CryptoAnalyzer</h1>
            <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>Research Platform</p>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border-light), transparent)' }}/>

      <div className="flex-1 overflow-y-auto" style={{ padding: '15px' }}>

        {/* Test Cases */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Тестовые кейсы
          </h3>
          <div className="flex flex-col gap-2">
            {TEST_CASES.map((tc) => (
              <button key={tc.id}
                onClick={() => handleTestCase(tc)}
                disabled={loading}
                className="w-full text-left rounded-xl px-4 py-3 cursor-pointer transition-all duration-200"
                style={{
                  background: `${tc.color}08`,
                  border: `1px solid ${tc.color}25`,
                  opacity: loading ? 0.5 : 1,
                }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${tc.color}18`, color: tc.color }}>
                    {tc.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {tc.label}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {tc.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border-light), transparent)' }}/>

        {/* Algorithms */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Алгоритмы
            </h3>
            <button onClick={() => selectAll(availableAlgorithms, algorithms, setAlgorithms)}
              className="text-[10px] font-medium cursor-pointer hover:underline"
              style={{ color: 'var(--color-accent-blue)', background: 'none', border: 'none' }}>
              {algorithms.length === availableAlgorithms.length ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableAlgorithms.map((alg) => {
              const active = algorithms.includes(alg);
              const info = ALG_ICONS[alg] || { color: '#4f8ffc', type: 'block' };
              return (
                <button key={alg}
                  onClick={() => toggleItem(algorithms, setAlgorithms, alg)}
                  className="tag-btn cursor-pointer"
                  style={active ? {
                    background: `${info.color}18`,
                    borderColor: `${info.color}50`,
                    color: info.color,
                    border: `1px solid ${info.color}50`,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  } : {
                    background: 'rgba(26,32,53,0.6)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5"
                    style={{ background: active ? info.color : 'var(--color-text-muted)' }}/>
                  {alg}
                  <AlgorithmInfoButton algorithm={alg} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Data Types */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Типы данных
            </h3>
            {!customMode && (
              <button onClick={() => selectAll(availableDataTypes, dataTypes, setDataTypes)}
                className="text-[10px] font-medium cursor-pointer hover:underline"
                style={{ color: 'var(--color-accent-blue)', background: 'none', border: 'none' }}>
                {dataTypes.length === availableDataTypes.length ? 'Снять все' : 'Выбрать все'}
              </button>
            )}
          </div>

          {/* Radio: Генерация / Свои данные */}
          <div className="flex gap-2 mb-3">
            {[
              { value: false, label: 'Генерация' },
              { value: true, label: 'Свои данные' },
            ].map((opt) => (
              <button key={String(opt.value)}
                onClick={() => {
                  setCustomMode(opt.value);
                  setCustomError(null);
                  if (opt.value && dataTypes.length > 1) setDataTypes([dataTypes[0]]);
                }}
                className="flex-1 flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  background: customMode === opt.value ? 'rgba(79,143,252,0.15)' : 'rgba(26,32,53,0.6)',
                  border: `1px solid ${customMode === opt.value ? 'rgba(79,143,252,0.4)' : 'var(--color-border)'}`,
                  color: customMode === opt.value ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                }}>
                <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full"
                  style={{
                    border: `2px solid ${customMode === opt.value ? 'var(--color-accent-blue)' : 'var(--color-text-muted)'}`,
                  }}>
                  {customMode === opt.value && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent-blue)' }}/>
                  )}
                </span>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {availableDataTypes.map((dt) => {
              const active = dataTypes.includes(dt);
              return (
                <button key={dt}
                  onClick={() => {
                    if (customMode) {
                      setDataTypes([dt]);
                      setCustomError(null);
                    } else {
                      toggleItem(dataTypes, setDataTypes, dt);
                    }
                  }}
                  className="cursor-pointer"
                  style={active ? {
                    background: 'rgba(34,211,238,0.12)',
                    border: '1px solid rgba(34,211,238,0.35)',
                    color: 'var(--color-accent-cyan)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  } : {
                    background: 'rgba(26,32,53,0.6)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>
                  {DATA_TYPE_LABELS[dt] || dt}
                </button>
              );
            })}
          </div>

          {/* Custom data input */}
          {customMode && (
            <div className="mt-3 flex flex-col gap-2">
              {dataTypes[0] && !['image'].includes(dataTypes[0]) ? (
                <textarea
                  value={customText}
                  onChange={(e) => { setCustomText(e.target.value); setCustomError(null); }}
                  placeholder={
                    dataTypes[0] === 'structured'
                      ? '{"key": "value", "data": [1, 2, 3]}'
                      : dataTypes[0] === 'text'
                      ? 'Введите текст для анализа...'
                      : 'Введите данные...'
                  }
                  rows={4}
                  style={{
                    background: 'rgba(26,32,53,0.8)',
                    border: `1px solid ${customError ? 'rgba(248,113,113,0.5)' : 'var(--color-border)'}`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical',
                    fontFamily: dataTypes[0] === 'structured' ? 'monospace' : 'inherit',
                  }}
                />
              ) : null}

              <label className="flex items-center gap-2 cursor-pointer"
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(26,32,53,0.8)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {customFile ? customFile.name : 'Загрузить файл'}
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>

              {customFile && (
                <div className="flex items-center justify-between" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  <span>{(customFile.size / 1024).toFixed(1)} KB</span>
                  <button onClick={() => { setCustomFile(null); setCustomFileBytes(null); setCustomError(null); }}
                    className="cursor-pointer hover:underline"
                    style={{ color: 'var(--color-accent-red)', background: 'none', border: 'none', fontSize: '0.7rem' }}>
                    Удалить
                  </button>
                </div>
              )}

              {customError && (
                <div className="flex items-center gap-2" style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.25)',
                  fontSize: '0.7rem',
                  color: 'var(--color-accent-red)',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {customError}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Data Sizes */}
        {!customMode && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Размеры данных
            </h3>
            <button onClick={() => selectAll(availableDataSizes, dataSizes, setDataSizes)}
              className="text-[10px] font-medium cursor-pointer hover:underline"
              style={{ color: 'var(--color-accent-blue)', background: 'none', border: 'none' }}>
              {dataSizes.length === availableDataSizes.length ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableDataSizes.map((size) => {
              const active = dataSizes.includes(size);
              return (
                <button key={size}
                  onClick={() => toggleItem(dataSizes, setDataSizes, size)}
                  className="cursor-pointer"
                  style={active ? {
                    background: 'rgba(167,139,250,0.12)',
                    border: '1px solid rgba(167,139,250,0.35)',
                    color: 'var(--color-accent-purple)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  } : {
                    background: 'rgba(26,32,53,0.6)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>
                  {SIZE_LABELS[size] || `${size} B`}
                </button>
              );
            })}
          </div>
        </section>
        )}

        {/* Avalanche Iterations */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Итерации лавинного теста
          </h3>
          <div className="flex items-center gap-3">
            <input type="range" min={10} max={500} step={10}
              value={avalancheIterations}
              onChange={(e) => setAvalancheIterations(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(90deg, var(--color-accent-blue) ${((avalancheIterations - 10) / 490) * 100}%, var(--color-border) ${((avalancheIterations - 10) / 490) * 100}%)` }}
            />
            <span className="text-sm font-mono font-medium w-10 text-right" style={{ color: 'var(--color-text-primary)' }}>
              {avalancheIterations}
            </span>
          </div>
        </section>

        {/* Experiment info */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(79,143,252,0.06)', border: '1px solid rgba(79,143,252,0.12)' }}>
          <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            {customMode ? (
              <>
                Анализ своих данных по <span className="font-semibold" style={{ color: 'var(--color-accent-blue)' }}>
                  {algorithms.length}
                </span> алгоритм{algorithms.length === 1 ? 'у' : 'ам'}
              </>
            ) : (
              <>
                Будет выполнено <span className="font-semibold" style={{ color: 'var(--color-accent-blue)' }}>
                  {Math.max(1, algorithms.length * dataTypes.length * dataSizes.length)}
                </span> комбинаций
              </>
            )}
          </p>
        </div>
      </div>

      {/* Run Button */}
      <div className="px-6 py-5 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button onClick={handleRun}
          disabled={loading || algorithms.length === 0 || dataTypes.length === 0 || (!customMode && dataSizes.length === 0)}
          className="btn-gradient w-full rounded-xl font-semibold text-sm cursor-pointer flex items-center justify-center gap-2" style={{ padding: '16px' }}>
          {loading ? (
            <>
              <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Выполняется...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Запустить эксперимент
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
