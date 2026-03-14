import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ALGORITHM_DATA = {
  AES: {
    fullName: 'Advanced Encryption Standard (AES-256)',
    type: 'Блочный шифр',
    keySize: '256 бит',
    blockSize: '128 бит',
    mode: 'CBC (Cipher Block Chaining)',
    rounds: 14,
    year: '2001',
    standard: 'FIPS 197 / NIST',
    color: '#4f8ffc',
    description: 'Симметричный блочный шифр, принятый в качестве стандарта шифрования правительством США. Основан на подстановочно-перестановочной сети (SPN).',
    flow: [
      'Разделение открытого текста на 128-битные блоки',
      'AddRoundKey — XOR блока с раундовым ключом',
      'SubBytes — нелинейная подстановка через S-box',
      'ShiftRows — циклический сдвиг строк матрицы состояния',
      'MixColumns — перемешивание столбцов (кроме последнего раунда)',
      'Повторение 14 раундов с различными подключами',
    ],
    strengths: 'Высокая криптостойкость, аппаратное ускорение (AES-NI), стандарт индустрии',
    weaknesses: 'Теоретические атаки на уменьшенное число раундов (не практически значимы)',
  },
  DES: {
    fullName: 'Data Encryption Standard (DES)',
    type: 'Блочный шифр',
    keySize: '56 бит',
    blockSize: '64 бита',
    mode: 'CBC (Cipher Block Chaining)',
    rounds: 16,
    year: '1977',
    standard: 'FIPS 46-3 (отозван в 2005)',
    color: '#f87171',
    description: 'Один из первых широко принятых стандартов шифрования. Основан на сети Фейстеля. Считается устаревшим из-за малой длины ключа.',
    flow: [
      'Начальная перестановка (IP) 64-битного блока',
      'Разделение на левую (L) и правую (R) половины по 32 бита',
      'Функция F: расширение R до 48 бит → XOR с подключом → 8 S-блоков → перестановка P',
      'L\' = R, R\' = L ⊕ F(R, K)',
      'Повторение 16 раундов',
      'Финальная перестановка (IP⁻¹)',
    ],
    strengths: 'Историческое значение, хорошо изученная структура',
    weaknesses: 'Ключ 56 бит — уязвим к полному перебору (brute force за часы)',
  },
  BLOWFISH: {
    fullName: 'Blowfish',
    type: 'Блочный шифр',
    keySize: '128 бит',
    blockSize: '64 бита',
    mode: 'CBC (Cipher Block Chaining)',
    rounds: 16,
    year: '1993',
    standard: 'Автор: Брюс Шнайер',
    color: '#34d399',
    description: 'Быстрый блочный шифр на основе сети Фейстеля. Ключевое расписание использует модифицированные S-блоки, зависящие от ключа.',
    flow: [
      'Инициализация P-массива (18 элементов) и 4 S-блоков (256 элементов каждый) ключом',
      'Разделение блока на L (32 бита) и R (32 бита)',
      'L = L ⊕ P[i], R = R ⊕ F(L)',
      'Функция F: разбить на 4 байта → подстановка через S-блоки → сложение и XOR',
      'Повторение 16 раундов, финальный XOR с P[17] и P[16]',
    ],
    strengths: 'Быстрый, свободный от патентов, зависимость S-блоков от ключа',
    weaknesses: 'Малый блок 64 бита — уязвим к атакам birthday при > 2³² блоков',
  },
  RC4: {
    fullName: 'Rivest Cipher 4 (RC4 / ARC4)',
    type: 'Потоковый шифр',
    keySize: '128 бит',
    blockSize: '—',
    mode: 'Потоковый (XOR с ключевым потоком)',
    rounds: '—',
    year: '1987',
    standard: 'Автор: Рон Ривест (RSA Labs)',
    color: '#fbbf24',
    description: 'Потоковый шифр, генерирующий псевдослучайный ключевой поток для XOR с открытым текстом. Прост и быстр, но имеет известные уязвимости.',
    flow: [
      'KSA (Key-Scheduling Algorithm): инициализация перестановки S[0..255] ключом',
      'Перемешивание S-массива: swap(S[i], S[j]), j = (j + S[i] + key[i mod keylen]) mod 256',
      'PRGA (Pseudo-Random Generation Algorithm): генерация ключевого потока',
      'На каждом шаге: i++, j = j + S[i], swap → выход = S[(S[i] + S[j]) mod 256]',
      'Шифрование: C[k] = P[k] ⊕ keystreamByte[k]',
    ],
    strengths: 'Максимальная скорость, минимальный объём кода',
    weaknesses: 'Смещение в начале потока, уязвимости в WEP/TLS, запрещён в TLS 1.3',
  },
  '3DES': {
    fullName: 'Triple DES (3DES / TDEA)',
    type: 'Блочный шифр',
    keySize: '192 бита (3 × 56 бит)',
    blockSize: '64 бита',
    mode: 'CBC (Cipher Block Chaining)',
    rounds: '48 (3 × 16)',
    year: '1998',
    standard: 'NIST SP 800-67',
    color: '#a78bfa',
    description: 'Усиленная версия DES: трёхкратное применение DES с тремя различными ключами в режиме EDE (Encrypt-Decrypt-Encrypt).',
    flow: [
      'Разделение 192-битного ключа на K₁, K₂, K₃ (по 64 бита)',
      'Шаг 1: C₁ = DES_Encrypt(P, K₁)',
      'Шаг 2: C₂ = DES_Decrypt(C₁, K₂)',
      'Шаг 3: C₃ = DES_Encrypt(C₂, K₃)',
      'Каждый DES — 16 раундов сети Фейстеля',
      'Итого: 48 раундов преобразований',
    ],
    strengths: 'Обратная совместимость с DES, более длинный ключ (112 эффективных бит)',
    weaknesses: 'В 3 раза медленнее DES, блок 64 бита, постепенно выводится из стандартов',
  },
  GOST: {
    fullName: 'ГОСТ 28147-89 (Магма)',
    type: 'Блочный шифр',
    keySize: '256 бит',
    blockSize: '64 бита',
    mode: 'CBC (Cipher Block Chaining)',
    rounds: 32,
    year: '1989',
    standard: 'ГОСТ 28147-89 / ГОСТ 34.12-2018',
    color: '#f472b6',
    description: 'Российский стандарт блочного шифрования. Основан на сети Фейстеля с 32 раундами и 8 таблицами подстановки (S-блоками).',
    flow: [
      'Разделение 256-битного ключа на 8 подключей по 32 бита',
      'Разделение 64-битного блока на L (32 бита) и R (32 бита)',
      'Сложение R с подключом по модулю 2³²',
      'Подстановка через 8 S-блоков (4-битных) → 32 бита',
      'Циклический сдвиг влево на 11 бит',
      'XOR результата с L, обмен L и R',
      '24 раунда прямого порядка ключей + 8 раундов обратного',
    ],
    strengths: 'Длинный ключ 256 бит, простая структура, стандарт РФ',
    weaknesses: 'Малый блок 64 бита, не сертифицирован за пределами РФ',
  },
};

function AlgorithmInfoModal({ algorithm, onClose }) {
  const data = ALGORITHM_DATA[algorithm];
  if (!data) return null;

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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: `${data.color}18`, color: data.color }}>
              {algorithm.slice(0, 2)}
            </div>
            <div>
              <h2 className="info-title" style={{ marginBottom: 0 }}>{data.fullName}</h2>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {data.type} · {data.year} · {data.standard}
              </span>
            </div>
          </div>

          <p className="info-text" style={{ marginTop: '16px' }}>{data.description}</p>

          {/* Specs grid */}
          <div className="alg-specs-grid">
            <div className="alg-spec">
              <span className="alg-spec-label">Ключ</span>
              <span className="alg-spec-value">{data.keySize}</span>
            </div>
            <div className="alg-spec">
              <span className="alg-spec-label">Блок</span>
              <span className="alg-spec-value">{data.blockSize}</span>
            </div>
            <div className="alg-spec">
              <span className="alg-spec-label">Раунды</span>
              <span className="alg-spec-value">{data.rounds}</span>
            </div>
            <div className="alg-spec">
              <span className="alg-spec-label">Режим</span>
              <span className="alg-spec-value">{data.mode}</span>
            </div>
          </div>

          <div className="info-section">
            <h3>Алгоритм работы</h3>
            <div className="alg-flow">
              {data.flow.map((step, i) => (
                <div key={i} className="alg-flow-step">
                  <div className="alg-flow-num">{i + 1}</div>
                  <p className="alg-flow-text">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="info-section">
            <h3>Оценка</h3>
            <div className="alg-eval">
              <div className="alg-eval-item alg-eval-good">
                <span className="alg-eval-icon">✓</span>
                <p>{data.strengths}</p>
              </div>
              <div className="alg-eval-item alg-eval-bad">
                <span className="alg-eval-icon">✗</span>
                <p>{data.weaknesses}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AlgorithmInfoButton({ algorithm }) {
  const [open, setOpen] = useState(false);
  const data = ALGORITHM_DATA[algorithm];
  if (!data) return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="alg-info-btn"
        title={`О ${algorithm}`}
        style={{ color: data.color }}
      >
        <span>i</span>
      </button>
      {open && <AlgorithmInfoModal algorithm={algorithm} onClose={() => setOpen(false)} />}
    </>
  );
}

export default AlgorithmInfoButton;
