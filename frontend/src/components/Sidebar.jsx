import { useState, useEffect } from 'react';

const SIZE_LABELS = {
  1024: '1 KB',
  10240: '10 KB',
  102400: '100 KB',
  1048576: '1 MB',
};

const DATA_TYPE_LABELS = {
  text: 'Текст',
  binary: 'Бинарные',
  random: 'Случайные',
  image: 'Изображение',
};

const ALG_ICONS = {
  AES: { color: '#4f8ffc', type: 'block' },
  DES: { color: '#f87171', type: 'block' },
  BLOWFISH: { color: '#34d399', type: 'block' },
  RC4: { color: '#fbbf24', type: 'stream' },
  CHACHA20: { color: '#a78bfa', type: 'stream' },
};

function Sidebar({ config, onRun, loading }) {
  const [algorithms, setAlgorithms] = useState([]);
  const [dataTypes, setDataTypes] = useState([]);
  const [dataSizes, setDataSizes] = useState([]);
  const [avalancheIterations, setAvalancheIterations] = useState(100);

  const availableAlgorithms = config?.algorithms || ['AES', 'DES', 'BLOWFISH', 'RC4', 'CHACHA20'];
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

  const handleRun = () => {
    if (algorithms.length === 0 || dataTypes.length === 0 || dataSizes.length === 0) return;
    onRun({
      algorithms,
      data_types: dataTypes,
      data_sizes: dataSizes,
      avalanche_iterations: avalancheIterations,
    });
  };

  return (
    <aside className="flex flex-col h-full overflow-hidden"
      style={{
        width: '300px',
        minWidth: '300px',
        background: 'linear-gradient(180deg, var(--color-bg-secondary) 0%, #0d1220 100%)',
        borderRight: '1px solid var(--color-border)',
      }}>
      {/* Logo */}
      <div className="px-5 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #4f8ffc, #a78bfa)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>CryptoAnalyzer</h1>
            <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>Research Platform</p>
          </div>
        </div>
      </div>

      <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border-light), transparent)' }}/>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Algorithms */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
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
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  } : {
                    background: 'rgba(26,32,53,0.6)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5"
                    style={{ background: active ? info.color : 'var(--color-text-muted)' }}/>
                  {alg}
                </button>
              );
            })}
          </div>
        </section>

        {/* Data Types */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Типы данных
            </h3>
            <button onClick={() => selectAll(availableDataTypes, dataTypes, setDataTypes)}
              className="text-[10px] font-medium cursor-pointer hover:underline"
              style={{ color: 'var(--color-accent-blue)', background: 'none', border: 'none' }}>
              {dataTypes.length === availableDataTypes.length ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableDataTypes.map((dt) => {
              const active = dataTypes.includes(dt);
              return (
                <button key={dt}
                  onClick={() => toggleItem(dataTypes, setDataTypes, dt)}
                  className="cursor-pointer"
                  style={active ? {
                    background: 'rgba(34,211,238,0.12)',
                    border: '1px solid rgba(34,211,238,0.35)',
                    color: 'var(--color-accent-cyan)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  } : {
                    background: 'rgba(26,32,53,0.6)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    padding: '6px 12px',
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
        </section>

        {/* Data Sizes */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
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
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  } : {
                    background: 'rgba(26,32,53,0.6)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    padding: '6px 12px',
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

        {/* Avalanche Iterations */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
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
        <div className="rounded-xl p-3" style={{ background: 'rgba(79,143,252,0.06)', border: '1px solid rgba(79,143,252,0.12)' }}>
          <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            Будет выполнено <span className="font-semibold" style={{ color: 'var(--color-accent-blue)' }}>
              {Math.max(1, algorithms.length * dataTypes.length * dataSizes.length)}
            </span> комбинаций
          </p>
        </div>
      </div>

      {/* Run Button */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button onClick={handleRun}
          disabled={loading || algorithms.length === 0 || dataTypes.length === 0 || dataSizes.length === 0}
          className="btn-gradient w-full py-3 rounded-xl font-semibold text-sm cursor-pointer flex items-center justify-center gap-2">
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
