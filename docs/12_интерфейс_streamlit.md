# 12. Веб-интерфейс (Streamlit)

**Папка:** `interface/`
**Файл:** `dashboard_app.py`
**Запуск:** `streamlit run interface/dashboard_app.py`

---

## 12.1 Назначение

Интерактивный аналитический дашборд, который позволяет:
- Выбрать алгоритм(ы) для анализа
- Выбрать тип и размер входных данных
- Запустить эксперимент прямо из браузера
- Просмотреть графики и таблицы в реальном времени
- Скачать результаты в CSV и JSON

**Фреймворк:** Streamlit ≥ 1.28

---

## 12.2 Структура интерфейса

```
dashboard_app.py
│
├── Sidebar (панель управления)
│   ├── Выбор алгоритмов (multiselect)
│   ├── Выбор типа данных (selectbox)
│   ├── Выбор размеров данных (multiselect)
│   ├── Число итераций теста лавинного эффекта (slider)
│   └── Кнопка "Запустить эксперимент"
│
└── Main area (вкладки)
    ├── Обзор          → сводный дашборд + KPI-метрики
    ├── Энтропия       → графики энтропии
    ├── Лавинный эффект → графики avalanche
    ├── Распределение  → гистограммы байтов
    ├── Сравнение      → таблица рейтинга алгоритмов
    └── Отчёт          → Markdown-отчёт + кнопки скачивания
```

---

## 12.3 Реализация `dashboard_app.py`

```python
# interface/dashboard_app.py
import streamlit as st
import pandas as pd

from config import ALGORITHMS, DATA_SIZES, DATA_TYPES, AVALANCHE_TESTS
from core.encryption import get_cipher
from core.entropy import analyze_all
from core.statistics import analyze_all_statistics
from core.avalanche.avalanche_test import run_avalanche_test
from data_generation import generate_data
from analytics.metrics_calculator import calculate_algorithm_summary, rank_algorithms
from analytics.research_report import generate_markdown_report
from visualization.entropy_plots import plot_entropy_by_algorithm, plot_entropy_interactive
from visualization.distribution_plots import plot_byte_histogram_comparison
from visualization.avalanche_plots import plot_avalanche_comparison, plot_avalanche_distribution
from visualization.dashboards import create_comparison_dashboard

# ─────────────────────────────────────────────────────────────
# Конфигурация страницы
# ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Криптоанализ: энтропийный анализ",
    page_icon="🔐",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("Исследование криптостойкости алгоритмов шифрования")
st.markdown("**Метод:** энтропийный анализ | **ВКР** | Информатика и ВТ")
st.divider()

# ─────────────────────────────────────────────────────────────
# Боковая панель — параметры эксперимента
# ─────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Параметры эксперимента")

    selected_algos = st.multiselect(
        "Алгоритмы шифрования",
        options=ALGORITHMS,
        default=ALGORITHMS,
    )

    selected_data_types = st.multiselect(
        "Типы входных данных",
        options=DATA_TYPES,
        default=["text", "random"],
    )

    selected_sizes = st.multiselect(
        "Размеры данных (байт)",
        options=DATA_SIZES,
        default=[1024, 102400],
        format_func=lambda x: f"{x:,} байт",
    )

    n_avalanche = st.slider(
        "Итераций теста лавинного эффекта",
        min_value=10, max_value=500, value=AVALANCHE_TESTS, step=10,
    )

    run_button = st.button("🚀 Запустить эксперимент", type="primary", use_container_width=True)

# ─────────────────────────────────────────────────────────────
# Запуск экспериментов
# ─────────────────────────────────────────────────────────────
@st.cache_data(show_spinner=False)
def run_experiments(algos, data_types, sizes, n_aval):
    """Кешируем результаты для повторных рендеров."""
    entropy_records = []
    avalanche_records = []
    cipher_texts = {}  # для гистограмм

    for algo_name in algos:
        cipher = get_cipher(algo_name)
        key = cipher.generate_key()

        for data_type in data_types:
            for size in sizes:
                plaintext = generate_data(data_type, size)
                ciphertext, enc_time = cipher.encrypt_timed(plaintext, key)

                # Сохранение шифртекста для гистограмм (последний размер)
                cipher_texts[algo_name] = ciphertext

                # Энтропийный анализ
                ent = analyze_all(plaintext, ciphertext)
                # Статистика
                stat = analyze_all_statistics(plaintext, ciphertext)

                entropy_records.append({
                    "algorithm": algo_name,
                    "data_type": data_type,
                    "data_size": size,
                    "encrypt_time_sec": enc_time,
                    **ent, **stat,
                })

        # Тест лавинного эффекта (только для одного размера)
        from data_generation.random_generator import generate_random_data
        test_data = generate_random_data(10240)
        aval = run_avalanche_test(cipher, test_data, key, n_tests=n_aval)
        avalanche_records.append({
            "algorithm": algo_name,
            "avalanche_mean": aval["mean"],
            "avalanche_std": aval["std"],
            "is_good": aval["is_good"],
            "coefficients": aval["coefficients"],
        })

    return (
        pd.DataFrame(entropy_records),
        pd.DataFrame(avalanche_records),
        cipher_texts,
    )


if run_button or "entropy_df" in st.session_state:
    if run_button:
        with st.spinner("Выполняется анализ..."):
            entropy_df, avalanche_df, cipher_texts = run_experiments(
                tuple(selected_algos),
                tuple(selected_data_types),
                tuple(selected_sizes),
                n_avalanche,
            )
            st.session_state["entropy_df"] = entropy_df
            st.session_state["avalanche_df"] = avalanche_df
            st.session_state["cipher_texts"] = cipher_texts
    else:
        entropy_df = st.session_state["entropy_df"]
        avalanche_df = st.session_state["avalanche_df"]
        cipher_texts = st.session_state["cipher_texts"]

    # ─────────────────────────────────────────────────────────────
    # Вкладки
    # ─────────────────────────────────────────────────────────────
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📊 Обзор",
        "🔢 Энтропия",
        "🌊 Лавинный эффект",
        "📈 Распределение",
        "🏆 Сравнение",
        "📄 Отчёт",
    ])

    # ── Вкладка 1: Обзор ──────────────────────────────────────
    with tab1:
        st.subheader("Ключевые показатели")
        summary = calculate_algorithm_summary(entropy_df)

        # KPI-метрики в колонках
        cols = st.columns(len(selected_algos))
        for i, algo in enumerate(selected_algos):
            row = summary[summary["algorithm"] == algo]
            if not row.empty:
                ent = row["shannon_entropy_cipher"].values[0]
                with cols[i]:
                    st.metric(
                        label=algo,
                        value=f"{ent:.4f} бит/байт",
                        delta=f"{ent - 8.0:.4f} от макс.",
                    )

        st.plotly_chart(
            create_comparison_dashboard(entropy_df, avalanche_df),
            use_container_width=True,
        )

    # ── Вкладка 2: Энтропия ───────────────────────────────────
    with tab2:
        st.subheader("Энтропия Шеннона")
        st.plotly_chart(plot_entropy_interactive(entropy_df), use_container_width=True)

        st.subheader("Зависимость от размера данных")
        from visualization.entropy_plots import plot_entropy_vs_data_size
        if len(selected_sizes) > 1:
            fig = plot_entropy_vs_data_size(entropy_df)
            st.pyplot(fig)

        st.subheader("Тепловая карта: алгоритм × тип данных")
        from visualization.entropy_plots import plot_entropy_heatmap
        st.plotly_chart(plot_entropy_heatmap(entropy_df), use_container_width=True)

    # ── Вкладка 3: Лавинный эффект ────────────────────────────
    with tab3:
        st.subheader("Тест лавинного эффекта")

        fig_aval = plot_avalanche_comparison(avalanche_df)
        st.pyplot(fig_aval)

        st.subheader("Распределение коэффициентов по итерациям")
        selected_algo_aval = st.selectbox("Алгоритм:", options=selected_algos, key="aval_algo")
        algo_row = avalanche_df[avalanche_df["algorithm"] == selected_algo_aval]
        if not algo_row.empty:
            coeffs = algo_row.iloc[0]["coefficients"]
            st.plotly_chart(
                plot_avalanche_distribution(coeffs, selected_algo_aval),
                use_container_width=True,
            )

    # ── Вкладка 4: Распределение ──────────────────────────────
    with tab4:
        st.subheader("Распределение байтов шифртекста")
        fig_dist = plot_byte_histogram_comparison(cipher_texts)
        st.plotly_chart(fig_dist, use_container_width=True)

        st.subheader("Результаты χ²-теста")
        chi2_data = []
        for algo, ct in cipher_texts.items():
            from core.statistics.frequency_analysis import chi_square_uniformity_test
            test = chi_square_uniformity_test(ct)
            chi2_data.append({"Алгоритм": algo, **test})
        st.dataframe(pd.DataFrame(chi2_data), use_container_width=True)

    # ── Вкладка 5: Сравнение ──────────────────────────────────
    with tab5:
        st.subheader("Рейтинг алгоритмов по криптостойкости")
        ranking = rank_algorithms(summary)
        st.dataframe(
            ranking.style.background_gradient(subset=["total_score"], cmap="RdYlGn"),
            use_container_width=True,
        )

        st.subheader("Подробные метрики")
        st.dataframe(summary, use_container_width=True)

        st.subheader("Все результаты экспериментов")
        st.dataframe(entropy_df, use_container_width=True)

    # ── Вкладка 6: Отчёт ──────────────────────────────────────
    with tab6:
        st.subheader("Аналитический отчёт")

        import tempfile, os
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            tmp_path = f.name

        report_md = generate_markdown_report(entropy_df, avalanche_df, tmp_path)
        st.markdown(report_md)

        # Кнопки скачивания
        col1, col2, col3 = st.columns(3)
        with col1:
            st.download_button("📥 Скачать MD", report_md, "report.md", "text/markdown")
        with col2:
            csv_data = entropy_df.to_csv(index=False)
            st.download_button("📥 Скачать CSV", csv_data, "results.csv", "text/csv")
        with col3:
            import json
            json_data = json.dumps(entropy_df.to_dict(orient="records"), ensure_ascii=False)
            st.download_button("📥 Скачать JSON", json_data, "results.json", "application/json")

        os.unlink(tmp_path)

else:
    st.info("Выберите параметры в боковой панели и нажмите «Запустить эксперимент».")
    st.image("docs/02_архитектура.md", caption="Схема системы", width=0)  # заглушка
```

---

## 12.4 Команды запуска

```bash
# Стандартный запуск
streamlit run interface/dashboard_app.py

# С указанием порта
streamlit run interface/dashboard_app.py --server.port 8501

# В фоновом режиме
streamlit run interface/dashboard_app.py &
```

---

## 12.5 Кеширование в Streamlit

- `@st.cache_data` — кешировать результаты `run_experiments()` по входным параметрам
- `st.session_state` — хранить последние результаты между нажатиями вкладок
- Очистка кеша: кнопка «Очистить кеш» или `st.cache_data.clear()`

---

## 12.6 Чек-лист реализации

- [ ] Реализовать базовую структуру с 6 вкладками
- [ ] Реализовать боковую панель с параметрами
- [ ] Реализовать `run_experiments()` с кешированием `@st.cache_data`
- [ ] Добавить KPI-метрики на вкладке «Обзор»
- [ ] Подключить все plotly-графики из `visualization/`
- [ ] Добавить таблицу χ²-теста на вкладке «Распределение»
- [ ] Реализовать генерацию и скачивание отчётов (MD, CSV, JSON)
- [ ] Проверить, что интерфейс не падает при одном выбранном алгоритме
- [ ] Проверить отображение на разных разрешениях экрана (wide layout)
