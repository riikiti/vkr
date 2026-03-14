import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function MetricInfoModal({ title, children, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="info-modal-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className="info-modal-body">
          <h2 className="info-title">{title}</h2>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function MetricInfoButton({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="info-btn" title={title}>
        <span>i</span>
      </button>
      {open && (
        <MetricInfoModal title={title} onClose={() => setOpen(false)}>
          {children}
        </MetricInfoModal>
      )}
    </>
  );
}

/* ============ PREDEFINED METRIC INFOS ============ */

export function ShannonEntropyInfo() {
  return (
    <MetricInfoButton title="Энтропия Шеннона">
      <p className="info-text">Мера неопределённости случайной величины. Чем выше энтропия шифротекста, тем он более «случаен».</p>
      <div className="formula">
        H(X) = − <span className="sum">∑</span><sub>i=0</sub><sup>255</sup> p(x<sub>i</sub>) · log<sub>2</sub> p(x<sub>i</sub>)
      </div>
      <div className="info-section">
        <h3>Интерпретация</h3>
        <ul className="info-list">
          <li><strong>H = 8.0</strong> — идеально равномерное распределение (максимум для байтов)</li>
          <li><strong>H = 0</strong> — все байты одинаковы (нулевая неопределённость)</li>
          <li><strong>H &gt; 7.9</strong> — хороший результат для шифротекста</li>
        </ul>
      </div>
      <div className="info-section">
        <h3>Нормализованная оценка</h3>
        <div className="formula">S<sub>entropy</sub> = H(cipher) / 8.0</div>
        <p className="info-text">Значение ∈ [0, 1], где 1 — идеально.</p>
      </div>
    </MetricInfoButton>
  );
}

export function KLDivergenceInfo() {
  return (
    <MetricInfoButton title="KL-дивергенция">
      <p className="info-text">Мера расстояния между наблюдаемым распределением байтов и идеальным равномерным.</p>
      <div className="formula">
        D<sub>KL</sub>(P ∥ Q) = <span className="sum">∑</span><sub>i=0</sub><sup>255</sup> P(x<sub>i</sub>) · log<sub>2</sub> <span className="frac"><span className="frac-num">P(x<sub>i</sub>)</span><span className="frac-den">Q(x<sub>i</sub>)</span></span>
      </div>
      <div className="info-section">
        <h3>Параметры</h3>
        <ul className="info-list">
          <li><strong>P</strong> — эмпирическое распределение байтов шифротекста</li>
          <li><strong>Q = 1/256</strong> — идеальное равномерное распределение</li>
          <li><strong>D<sub>KL</sub> = 0</strong> — полное совпадение с равномерным (идеал)</li>
          <li>Используется сглаживание Лапласа для избежания log(0)</li>
        </ul>
      </div>
    </MetricInfoButton>
  );
}

export function AvalancheCoefficientInfo() {
  return (
    <MetricInfoButton title="Коэффициент лавинного эффекта">
      <p className="info-text">Показывает долю изменённых бит шифротекста при инвертировании 1 бита открытого текста.</p>
      <div className="formula">
        A = <span className="frac"><span className="frac-num">Hamming(C, C′)</span><span className="frac-den">|C| × 8</span></span>
      </div>
      <div className="info-section">
        <h3>Методика</h3>
        <ul className="info-list">
          <li>Генерируется случайный открытый текст P</li>
          <li>Создаётся P′ — копия с 1 инвертированным битом</li>
          <li>Оба варианта шифруются одним ключом: C = E(P, K), C′ = E(P′, K)</li>
          <li>Подсчитывается расстояние Хэмминга (различающиеся биты)</li>
          <li>Процедура повторяется N раз (по умолчанию 100)</li>
        </ul>
      </div>
      <div className="info-section">
        <h3>Расстояние Хэмминга</h3>
        <div className="formula">
          d(C, C′) = <span className="sum">∑</span><sub>i</sub> popcount(C<sub>i</sub> ⊕ C′<sub>i</sub>)
        </div>
      </div>
    </MetricInfoButton>
  );
}

export function ChiSquareInfo() {
  return (
    <MetricInfoButton title="Тест хи-квадрат (χ²)">
      <p className="info-text">Статистический критерий проверки гипотезы о равномерности распределения байтов.</p>
      <div className="formula">
        χ² = <span className="sum">∑</span><sub>i=0</sub><sup>255</sup> <span className="frac"><span className="frac-num">(O<sub>i</sub> − E<sub>i</sub>)²</span><span className="frac-den">E<sub>i</sub></span></span>
      </div>
      <div className="info-section">
        <h3>Параметры</h3>
        <ul className="info-list">
          <li><strong>O<sub>i</sub></strong> — наблюдаемая частота байта i</li>
          <li><strong>E<sub>i</sub> = N / 256</strong> — ожидаемая частота</li>
          <li><strong>df = 255</strong> — число степеней свободы</li>
          <li><strong>p-value &gt; 0.05</strong> — распределение равномерно (H₀ не отвергается)</li>
        </ul>
      </div>
    </MetricInfoButton>
  );
}

export function CorrelationInfo() {
  return (
    <MetricInfoButton title="Корреляция Пирсона">
      <p className="info-text">Измеряет линейную зависимость между байтами открытого текста и шифротекста.</p>
      <div className="formula">
        r = <span className="frac"><span className="frac-num"><span className="sum">∑</span>(x<sub>i</sub> − x̄)(y<sub>i</sub> − ȳ)</span><span className="frac-den">√(<span className="sum">∑</span>(x<sub>i</sub> − x̄)² · <span className="sum">∑</span>(y<sub>i</sub> − ȳ)²)</span></span>
      </div>
      <div className="info-section">
        <h3>Интерпретация</h3>
        <ul className="info-list">
          <li><strong>|r| ≈ 0</strong> — нет линейной зависимости (идеал для шифра)</li>
          <li><strong>|r| &gt; 0.1</strong> — возможная утечка информации</li>
          <li><strong>|r| = 1</strong> — полная линейная зависимость</li>
        </ul>
      </div>
    </MetricInfoButton>
  );
}

export function MutualInformationInfo() {
  return (
    <MetricInfoButton title="Взаимная информация">
      <p className="info-text">Количество информации об открытом тексте, содержащейся в шифротексте.</p>
      <div className="formula">
        I(X; Y) = H(Y) − H(Y|X)
      </div>
      <div className="info-section">
        <h3>Компоненты</h3>
        <ul className="info-list">
          <li><strong>H(Y)</strong> — энтропия шифротекста</li>
          <li><strong>H(Y|X)</strong> — условная энтропия шифротекста при известном открытом тексте</li>
          <li><strong>I = 0</strong> — шифротекст полностью независим от plaintext (идеал)</li>
          <li><strong>I &gt; 0</strong> — часть информации «утекает» через шифротекст</li>
        </ul>
      </div>
    </MetricInfoButton>
  );
}

export function FrequencyDistributionInfo() {
  return (
    <MetricInfoButton title="Частотное распределение">
      <p className="info-text">Анализ частоты появления каждого из 256 возможных значений байтов в шифротексте.</p>
      <div className="info-section">
        <h3>Ожидаемое поведение</h3>
        <ul className="info-list">
          <li><strong>Идеальный шифр:</strong> все 256 значений встречаются с частотой ≈ N/256</li>
          <li><strong>Отклонение от 1/256</strong> — рассчитывается как |f<sub>i</sub> − 1/256|</li>
          <li>Визуализация: столбчатая диаграмма частот по байтам 0–255</li>
        </ul>
      </div>
      <div className="info-section">
        <h3>Связанные метрики</h3>
        <ul className="info-list">
          <li><strong>Асимметрия (skewness)</strong> — отклонение от симметрии, идеал ≈ 0</li>
          <li><strong>Эксцесс (kurtosis)</strong> — «тяжесть хвостов», идеал ≈ −1.2 для равномерного</li>
          <li><strong>Индекс совпадений (IC)</strong> — вероятность совпадения двух случайных байтов, идеал ≈ 0.00391</li>
        </ul>
      </div>
    </MetricInfoButton>
  );
}

export default MetricInfoButton;
