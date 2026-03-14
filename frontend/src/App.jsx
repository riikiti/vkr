import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import OverviewTab from './components/tabs/OverviewTab';
import EntropyTab from './components/tabs/EntropyTab';
import AvalancheTab from './components/tabs/AvalancheTab';
import DistributionTab from './components/tabs/DistributionTab';
import ComparisonTab from './components/tabs/ComparisonTab';
import ReportTab from './components/tabs/ReportTab';
import { getConfig, runExperiment } from './api/client';

const TABS = [
  { id: 'overview', label: 'Обзор', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { id: 'entropy', label: 'Энтропия', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  )},
  { id: 'avalanche', label: 'Лавинный эффект', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  )},
  { id: 'distribution', label: 'Распределение', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
    </svg>
  )},
  { id: 'comparison', label: 'Сравнение', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-6"/><path d="M2 20h20"/>
    </svg>
  )},
  { id: 'report', label: 'Отчёт', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )},
];

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    document.title = tab ? `${tab.label} — CryptoAnalyzer` : 'CryptoAnalyzer';
  }, [activeTab]);

  useEffect(() => {
    getConfig()
      .then((res) => setConfig(res.data))
      .catch(() => {
        setConfig({
          algorithms: ['AES', 'DES', 'BLOWFISH', 'RC4', '3DES', 'GOST'],
          data_types: ['text', 'binary', 'random', 'image'],
          data_sizes: [1024, 10240, 102400, 1048576],
        });
      });
  }, []);

  const handleRunExperiment = async (params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runExperiment(params);
      setResults(res.data);
      setActiveTab('overview');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Ошибка выполнения эксперимента');
    } finally {
      setLoading(false);
    }
  };

  const renderTab = () => {
    if (!results) {
      return (
        <div className="flex items-center justify-center h-full fade-in">
          <div className="flex flex-col items-center max-w-md" style={{ gap: '20px' }}>
            <div className="rounded-2xl flex items-center justify-center"
                 style={{ width: '144px', height: '144px', background: 'linear-gradient(135deg, rgba(79,143,252,0.15), rgba(167,139,250,0.15))' }}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <defs>
                  <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4f8ffc"/>
                    <stop offset="100%" stopColor="#a78bfa"/>
                  </linearGradient>
                </defs>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              CryptoAnalyzer
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              Платформа исследования криптостойкости алгоритмов шифрования с применением энтропийного анализа
            </p>
            <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              Настройте параметры в боковой панели и запустите эксперимент
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview': return <OverviewTab results={results} />;
      case 'entropy': return <EntropyTab results={results} />;
      case 'avalanche': return <AvalancheTab results={results} />;
      case 'distribution': return <DistributionTab results={results} />;
      case 'comparison': return <ComparisonTab results={results} />;
      case 'report': return <ReportTab results={results} />;
      default: return null;
    }
  };

  const handleRunAndCloseSidebar = (params) => {
    setSidebarOpen(false);
    handleRunExperiment(params);
  };

  return (
    <div className="flex h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        config={config}
        onRun={handleRunAndCloseSidebar}
        loading={loading}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <header className="flex items-center shrink-0"
          style={{
            paddingLeft: '30px',
            paddingRight: '30px',
            background: 'linear-gradient(180deg, var(--color-bg-secondary), var(--color-bg-primary))',
            minHeight: '60px',
            borderBottom: '1px solid var(--color-border)',
          }}>
          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', marginRight: '12px', padding: '4px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <nav className="flex tab-nav" style={{ gap: '20px' }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap"
                  style={{
                    color: isActive ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                    background: isActive ? 'rgba(79,143,252,0.1)' : 'transparent',
                  }}>
                  {tab.icon}
                  <span className="tab-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Error */}
        {error && (
          <div className="mx-8 mt-5 px-5 py-4 rounded-xl text-sm flex items-center gap-3 fade-in"
            style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-accent-red)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center fade-in" style={{ gap: '20px' }}>
              <div className="relative" style={{ width: '120px', height: '120px' }}>
                <div className="absolute inset-0 rounded-full pulse-glow"
                  style={{ border: '4px solid rgba(79,143,252,0.2)' }}/>
                <div className="absolute inset-0 rounded-full spinner"
                  style={{ border: '4px solid transparent', borderTopColor: 'var(--color-accent-blue)' }}/>
                <div className="absolute rounded-full spinner"
                  style={{ inset: '12px', border: '3px solid transparent', borderTopColor: 'var(--color-accent-purple)', animationDirection: 'reverse', animationDuration: '1.5s' }}/>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Выполнение эксперимента...</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Это может занять некоторое время</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <main className="flex-1 overflow-auto" style={{ padding: '30px' }}>
            <div className={`fade-in max-w-[1600px]${!results ? ' h-full' : ''}`}>{renderTab()}</div>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
