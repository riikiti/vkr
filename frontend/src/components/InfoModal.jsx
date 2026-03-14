import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function InfoModal({ children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="info-btn"
        title="Подробнее о методике"
      >
        <span>i</span>
      </button>

      {open && createPortal(
        <div className="info-modal-overlay" onClick={() => setOpen(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <button className="info-modal-close" onClick={() => setOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="info-modal-body">
              {children}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ============ CONTENT FOR EACH TAB ============ */

export function OverviewInfo() {
  return (
    <InfoModal>
      <h2 className="info-title">Обзор результатов</h2>
      <p className="info-text">
        Страница агрегирует ключевые метрики по всем алгоритмам и отображает сводную таблицу.
      </p>

      <div className="info-section">
        <h3>Комплексная оценка криптостойкости</h3>
        <p className="info-text">
          Итоговый балл каждого алгоритма вычисляется как среднее арифметическое четырёх нормализованных метрик:
        </p>
        <div className="formula">
          S<sub>total</sub> = <span className="frac"><span className="frac-num">S<sub>entropy</sub> + S<sub>KL</sub> + S<sub>avalanche</sub> + S<sub>corr</sub></span><span className="frac-den">4</span></span>
        </div>
        <p className="info-text">где каждая компонента ∈ [0, 1]:</p>
        <ul className="info-list">
          <li><strong>S<sub>entropy</sub></strong> — нормализованная энтропия шифротекста (H / 8.0)</li>
          <li><strong>S<sub>KL</sub></strong> — оценка KL-дивергенции: 1 − (KL / KL<sub>max</sub>)</li>
          <li><strong>S<sub>avalanche</sub></strong> — оценка лавинного эффекта: 1 − |μ − 0.5| × 2</li>
          <li><strong>S<sub>corr</sub></strong> — оценка корреляции: 1 − |r|</li>
        </ul>
      </div>

      <div className="info-section">
        <h3>Метрики-карточки</h3>
        <ul className="info-list">
          <li><strong>Средняя энтропия</strong> — среднее H(шифротекст) по всем экспериментам</li>
          <li><strong>Лавинный эффект</strong> — среднее отклонение от идеала (0.5)</li>
          <li><strong>KL-дивергенция</strong> — среднее отклонение от равномерного распределения</li>
          <li><strong>Лучший алгоритм</strong> — алгоритм с максимальным S<sub>total</sub></li>
        </ul>
      </div>
    </InfoModal>
  );
}

export function EntropyInfo() {
  return (
    <InfoModal>
      <h2 className="info-title">Анализ энтропии</h2>
      <p className="info-text">
        Энтропийный анализ оценивает степень случайности шифротекста и его отклонение от идеального равномерного распределения.
      </p>

      <div className="info-section">
        <h3>Энтропия Шеннона</h3>
        <p className="info-text">
          Мера неопределённости (информационного содержания) последовательности байтов:
        </p>
        <div className="formula">
          H(X) = − <span className="sum">∑</span><sub>i=0</sub><sup>255</sup> p(x<sub>i</sub>) · log<sub>2</sub> p(x<sub>i</sub>)
        </div>
        <p className="info-text">
          Для идеально случайной последовательности байтов H = 8.0 бит/байт.
          Каждый байт несёт максимум информации, когда все 256 значений равновероятны.
        </p>
      </div>

      <div className="info-section">
        <h3>KL-дивергенция (расстояние Кульбака-Лейблера)</h3>
        <p className="info-text">
          Мера отклонения распределения байтов шифротекста от идеального равномерного:
        </p>
        <div className="formula">
          D<sub>KL</sub>(P ∥ Q) = <span className="sum">∑</span><sub>i=0</sub><sup>255</sup> P(x<sub>i</sub>) · log<sub>2</sub> <span className="frac"><span className="frac-num">P(x<sub>i</sub>)</span><span className="frac-den">Q(x<sub>i</sub>)</span></span>
        </div>
        <p className="info-text">
          где P — наблюдаемое распределение, Q = 1/256 — равномерное. Идеал: D<sub>KL</sub> → 0.
        </p>
      </div>

      <div className="info-section">
        <h3>Условная энтропия</h3>
        <p className="info-text">
          Остаточная неопределённость шифротекста при известном открытом тексте:
        </p>
        <div className="formula">
          H(Y|X) = − <span className="sum">∑</span><sub>x,y</sub> p(x, y) · log<sub>2</sub> p(y|x)
        </div>
        <p className="info-text">
          Высокая условная энтропия означает, что знание открытого текста не помогает предсказать шифротекст.
        </p>
      </div>

      <div className="info-section">
        <h3>Взаимная информация</h3>
        <p className="info-text">
          Количество информации об открытом тексте, которое «утекает» через шифротекст:
        </p>
        <div className="formula">
          I(X; Y) = H(Y) − H(Y|X)
        </div>
        <p className="info-text">
          Идеал: I = 0 — шифротекст не содержит информации об открытом тексте.
        </p>
      </div>
    </InfoModal>
  );
}

export function AvalancheInfo() {
  return (
    <InfoModal>
      <h2 className="info-title">Лавинный эффект</h2>
      <p className="info-text">
        Лавинный эффект — ключевое свойство криптографического алгоритма: минимальное изменение входа должно вызывать значительное изменение выхода.
      </p>

      <div className="info-section">
        <h3>Коэффициент лавинного эффекта</h3>
        <p className="info-text">
          Для каждой итерации: инвертируется 1 случайный бит открытого текста, затем оба варианта шифруются одним ключом:
        </p>
        <div className="formula">
          A = <span className="frac"><span className="frac-num">Hamming(C, C′)</span><span className="frac-den">|C| × 8</span></span>
        </div>
        <p className="info-text">
          где C — шифротекст исходных данных, C′ — шифротекст после изменения 1 бита, |C| — длина в байтах.
        </p>
      </div>

      <div className="info-section">
        <h3>Расстояние Хэмминга</h3>
        <div className="formula">
          Hamming(C, C′) = <span className="sum">∑</span><sub>i</sub> popcount(C<sub>i</sub> ⊕ C′<sub>i</sub>)
        </div>
        <p className="info-text">
          Подсчёт количества различающихся бит через XOR и подсчёт единичных бит.
        </p>
      </div>

      <div className="info-section">
        <h3>Интерпретация</h3>
        <ul className="info-list">
          <li><strong>A ≈ 0.5</strong> — идеальный лавинный эффект (~50% бит изменилось)</li>
          <li><strong>A &lt; 0.4</strong> — слабое рассеивание (плохо)</li>
          <li><strong>A &gt; 0.6</strong> — аномальная диффузия (подозрительно)</li>
        </ul>
        <p className="info-text">
          Статистика рассчитывается по N итерациям (по умолчанию 100): среднее μ, стандартное отклонение σ, min, max.
        </p>
      </div>
    </InfoModal>
  );
}

export function DistributionInfo() {
  return (
    <InfoModal>
      <h2 className="info-title">Статистическое распределение</h2>
      <p className="info-text">
        Статистические тесты проверяют свойства шифротекста: равномерность распределения, независимость от открытого текста, отсутствие паттернов.
      </p>

      <div className="info-section">
        <h3>Тест хи-квадрат (χ²) на равномерность</h3>
        <p className="info-text">
          Проверяет гипотезу H₀: «байты шифротекста распределены равномерно»:
        </p>
        <div className="formula">
          χ² = <span className="sum">∑</span><sub>i=0</sub><sup>255</sup> <span className="frac"><span className="frac-num">(O<sub>i</sub> − E<sub>i</sub>)²</span><span className="frac-den">E<sub>i</sub></span></span>
        </div>
        <p className="info-text">
          где O<sub>i</sub> — наблюдаемая частота байта i, E<sub>i</sub> = N/256 — ожидаемая частота.
          При p-value &gt; 0.05 гипотеза равномерности не отвергается.
        </p>
      </div>

      <div className="info-section">
        <h3>Корреляция Пирсона</h3>
        <p className="info-text">
          Измеряет линейную зависимость между байтами открытого текста и шифротекста:
        </p>
        <div className="formula">
          r = <span className="frac"><span className="frac-num"><span className="sum">∑</span>(x<sub>i</sub> − x̄)(y<sub>i</sub> − ȳ)</span><span className="frac-den">√(<span className="sum">∑</span>(x<sub>i</sub> − x̄)² · <span className="sum">∑</span>(y<sub>i</sub> − ȳ)²)</span></span>
        </div>
        <p className="info-text">
          Идеал: |r| ≈ 0. Значение |r| &gt; 0.1 указывает на статистическую зависимость.
        </p>
      </div>

      <div className="info-section">
        <h3>Индекс совпадений (IC)</h3>
        <div className="formula">
          IC = <span className="frac"><span className="frac-num"><span className="sum">∑</span><sub>i=0</sub><sup>255</sup> n<sub>i</sub>(n<sub>i</sub> − 1)</span><span className="frac-den">N(N − 1)</span></span>
        </div>
        <p className="info-text">
          Вероятность совпадения двух случайно выбранных байтов. Для случайных данных IC ≈ 1/256 ≈ 0.00391.
        </p>
      </div>

      <div className="info-section">
        <h3>Моменты распределения</h3>
        <ul className="info-list">
          <li><strong>Асимметрия (skewness)</strong> — отклонение от симметрии (идеал ≈ 0)</li>
          <li><strong>Эксцесс (kurtosis)</strong> — «тяжесть хвостов» (идеал ≈ −1.2 для равномерного)</li>
        </ul>
      </div>
    </InfoModal>
  );
}

export function ComparisonInfo() {
  return (
    <InfoModal>
      <h2 className="info-title">Сравнение алгоритмов</h2>
      <p className="info-text">
        Мультикритериальное ранжирование алгоритмов по четырём нормализованным метрикам.
      </p>

      <div className="info-section">
        <h3>Метрики ранжирования</h3>
        <div className="formula-block">
          <div className="formula">S<sub>entropy</sub> = H(cipher) / 8.0</div>
          <div className="formula">S<sub>KL</sub> = 1 − D<sub>KL</sub> / max(D<sub>KL</sub>)</div>
          <div className="formula">S<sub>avalanche</sub> = 1 − |μ<sub>A</sub> − 0.5| × 2</div>
          <div className="formula">S<sub>corr</sub> = 1 − |r<sub>Pearson</sub>|</div>
        </div>
      </div>

      <div className="info-section">
        <h3>Итоговый рейтинг</h3>
        <div className="formula">
          S<sub>total</sub> = <span className="frac"><span className="frac-num">1</span><span className="frac-den">n</span></span> <span className="sum">∑</span><sub>k=1</sub><sup>n</sup> S<sub>k</sub>
        </div>
        <p className="info-text">
          Алгоритмы сортируются по убыванию S<sub>total</sub>. Значение 1.0 соответствует идеальному шифру.
        </p>
      </div>

      <div className="info-section">
        <h3>Радарная диаграмма</h3>
        <p className="info-text">
          Визуализирует профиль каждого алгоритма по всем метрикам. Чем ближе к окружности — тем лучше.
          Позволяет визуально выявить сильные и слабые стороны каждого алгоритма.
        </p>
      </div>
    </InfoModal>
  );
}

export function ReportInfo() {
  return (
    <InfoModal>
      <h2 className="info-title">Отчёт</h2>
      <p className="info-text">
        Автоматически сгенерированный отчёт по результатам экспериментального исследования.
      </p>

      <div className="info-section">
        <h3>Структура отчёта</h3>
        <ul className="info-list">
          <li><strong>Рейтинг криптостойкости</strong> — итоговая таблица ранжирования</li>
          <li><strong>Энтропия по типам данных</strong> — как тип входа влияет на H(шифр.)</li>
          <li><strong>Лавинный эффект</strong> — коэффициенты и сравнение блочных/потоковых</li>
          <li><strong>Взаимная информация</strong> — утечка данных по каждому алгоритму</li>
          <li><strong>Статистические тесты</strong> — χ², корреляция</li>
          <li><strong>Анализ чувствительности</strong> — стабильность метода при изменении параметров</li>
          <li><strong>Сравнение с NIST SP 800-22</strong> — соответствие стандартным тестам</li>
          <li><strong>Перспективы развития</strong> — направления дальнейшей работы</li>
        </ul>
      </div>

      <div className="info-section">
        <h3>Форматы экспорта</h3>
        <ul className="info-list">
          <li><strong>Markdown (.md)</strong> — структурированный текст с таблицами</li>
          <li><strong>CSV (.csv)</strong> — табличные данные для Excel/Python</li>
          <li><strong>JSON (.json)</strong> — машиночитаемый формат</li>
        </ul>
      </div>
    </InfoModal>
  );
}

export default InfoModal;
