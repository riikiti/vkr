"""
API router for running cryptanalysis experiments.
"""
import sys
import os
import time
import traceback
import base64

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

# Ensure project root is importable
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Ensure backend dir is importable (for schemas)
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from config import ALGORITHMS, DATA_TYPES, DATA_SIZES, AVALANCHE_TESTS, REPORT_FORMATS
from core.encryption import get_cipher
from core.entropy import analyze_all
from core.statistics import analyze_all_statistics
from core.avalanche.avalanche_test import run_avalanche_test
from data_generation import generate_data
from data_generation.random_generator import generate_random_data
from analytics.metrics_calculator import calculate_algorithm_summary, rank_algorithms

from schemas import (
    ExperimentRequest,
    ExperimentResponse,
    ConfigResponse,
    TraceRequest,
)

from core.entropy.shannon_entropy import calculate_shannon_entropy

router = APIRouter(prefix="/api", tags=["experiments"])


def _sanitize_value(v):
    """Convert numpy/pandas types to plain Python types for JSON serialization."""
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v)
    if isinstance(v, np.ndarray):
        return v.tolist()
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, pd.Timestamp):
        return v.isoformat()
    if pd.isna(v):
        return None
    return v


def _sanitize_dict(d: dict) -> dict:
    """Recursively sanitize a dict for JSON serialization."""
    return {k: _sanitize_value(v) for k, v in d.items()}


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to list of dicts with JSON-safe types."""
    records = df.to_dict(orient="records")
    return [_sanitize_dict(r) for r in records]


@router.get("/config", response_model=ConfigResponse)
def get_config():
    """Return available experiment configuration options."""
    return ConfigResponse(
        algorithms=ALGORITHMS,
        data_types=DATA_TYPES,
        data_sizes=DATA_SIZES,
        avalanche_default_iterations=AVALANCHE_TESTS,
        report_formats=REPORT_FORMATS,
    )


@router.post("/experiments/run", response_model=ExperimentResponse)
def run_experiments(request: ExperimentRequest):
    """
    Run all experiments (entropy, avalanche, distribution) for the given
    combinations of algorithms, data types, and data sizes.
    Returns structured JSON with all results, summary, and ranking.
    """
    try:
        # Validate requested algorithms
        for algo in request.algorithms:
            if algo.upper() not in ALGORITHMS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown algorithm: {algo}. Available: {ALGORITHMS}",
                )

        # Validate data types
        valid_data_types = DATA_TYPES
        for dt in request.data_types:
            if dt not in valid_data_types:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown data type: {dt}. Available: {valid_data_types}",
                )

        # Decode custom data if provided
        custom_bytes = None
        if request.custom_data:
            try:
                custom_bytes = base64.b64decode(request.custom_data)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid base64 in custom_data")

        entropy_records = []
        distribution_records = []
        avalanche_records = []

        # When custom data is provided, use actual data size
        data_sizes = request.data_sizes
        if custom_bytes is not None:
            data_sizes = [len(custom_bytes)]

        # --- Entropy & Distribution experiments ---
        for algo_name in request.algorithms:
            algo_upper = algo_name.upper()
            cipher = get_cipher(algo_upper)
            key = cipher.generate_key()

            for data_type in request.data_types:
                for size in data_sizes:
                    plaintext = custom_bytes if custom_bytes is not None else generate_data(data_type, size)
                    ciphertext, enc_time = cipher.encrypt_timed(plaintext, key)

                    # Entropy metrics
                    entropy_metrics = analyze_all(plaintext, ciphertext)
                    entropy_records.append({
                        "algorithm": algo_upper,
                        "data_type": data_type,
                        "data_size": size,
                        "encrypt_time_sec": enc_time,
                        **entropy_metrics,
                    })

                    # Distribution / statistics metrics
                    stats = analyze_all_statistics(plaintext, ciphertext)
                    distribution_records.append({
                        "algorithm": algo_upper,
                        "data_type": data_type,
                        "data_size": size,
                        **stats,
                    })

        # --- Avalanche experiment ---
        for algo_name in request.algorithms:
            algo_upper = algo_name.upper()
            cipher = get_cipher(algo_upper)
            key = cipher.generate_key()

            for size in data_sizes:
                data = custom_bytes if custom_bytes is not None else generate_random_data(size)
                result = run_avalanche_test(
                    cipher, data, key,
                    n_tests=request.avalanche_iterations,
                )
                avalanche_records.append({
                    "algorithm": algo_upper,
                    "data_size": size,
                    "avalanche_mean": result["mean"],
                    "avalanche_std": result["std"],
                    "avalanche_min": result["min_val"],
                    "avalanche_max": result["max_val"],
                    "is_good": result["is_good"],
                })

        # --- Build DataFrames for analytics ---
        entropy_df = pd.DataFrame(entropy_records)
        avalanche_df = pd.DataFrame(avalanche_records)
        distribution_df = pd.DataFrame(distribution_records)

        # --- Summary and ranking ---
        # Merge entropy and avalanche data for ranking
        # The ranking uses columns like entropy_score, kl_divergence,
        # avalanche_mean, corr_pearson
        merged_records = []
        for erec in entropy_records:
            row = dict(erec)
            # Find matching distribution record to get corr_pearson
            for drec in distribution_records:
                if (drec["algorithm"] == erec["algorithm"]
                        and drec["data_type"] == erec["data_type"]
                        and drec["data_size"] == erec["data_size"]):
                    row.update(drec)
                    break
            # Find matching avalanche record (avalanche has no data_type)
            for arec in avalanche_records:
                if (arec["algorithm"] == erec["algorithm"]
                        and arec["data_size"] == erec["data_size"]):
                    row.update(arec)
                    break
            merged_records.append(row)

        merged_df = pd.DataFrame(merged_records)
        summary_df = calculate_algorithm_summary(merged_df)
        ranking_df = rank_algorithms(summary_df)

        return ExperimentResponse(
            entropy_results=_df_to_records(entropy_df),
            avalanche_results=_df_to_records(avalanche_df),
            distribution_results=_df_to_records(distribution_df),
            summary=_df_to_records(summary_df),
            ranking=_df_to_records(ranking_df),
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Experiment failed: {str(e)}")


def _bytes_to_hex_preview(data: bytes, max_bytes: int = 64) -> str:
    """Convert bytes to hex string, truncated."""
    hex_str = data[:max_bytes].hex()
    # Insert spaces every 2 chars for readability
    spaced = " ".join(hex_str[i:i+2] for i in range(0, len(hex_str), 2))
    if len(data) > max_bytes:
        spaced += " ..."
    return spaced


def _bytes_freq(data: bytes) -> list[int]:
    """Get byte frequency distribution (256 buckets)."""
    freq = [0] * 256
    for b in data:
        freq[b] += 1
    return freq


DATA_TYPE_LABELS = {
    "text": "Текст (русский)",
    "binary": "Бинарный паттерн",
    "random": "Случайные данные",
    "image": "Изображение (пиксели)",
    "zeros": "Нулевые байты",
    "structured": "JSON-структура",
    "incremental": "Счётчик (0..255)",
}


def _text_preview(data: bytes, max_chars: int = 120) -> str:
    """Try to decode as UTF-8 text, fallback to hex summary."""
    try:
        text = data[:max_chars].decode("utf-8", errors="replace")
        if len(data) > max_chars:
            text += "..."
        return text
    except Exception:
        return f"<бинарные данные, {len(data)} байт>"


@router.post("/experiments/trace")
def run_trace(request: TraceRequest):
    """
    Run a step-by-step encryption trace for generated data across
    selected algorithms and data types.
    Returns detailed intermediate data for each stage of the encryption pipeline.
    """
    try:
        # Cap trace size to keep hex output readable
        trace_size = min(request.data_size, 1024)

        # Decode custom data if provided
        custom_bytes = None
        if request.custom_data:
            try:
                custom_bytes = base64.b64decode(request.custom_data)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid base64 in custom_data")

        traces = []

        for algo_name in request.algorithms:
            algo_upper = algo_name.upper()
            if algo_upper not in ALGORITHMS:
                raise HTTPException(status_code=400, detail=f"Unknown algorithm: {algo_name}")

            cipher = get_cipher(algo_upper)
            key = cipher.generate_key()

            is_stream = algo_upper in ("RC4", "CHACHA20")
            block_size = getattr(cipher, "BLOCK_SIZE", None)
            key_size = getattr(cipher, "KEY_SIZE", 16)

            for data_type in request.data_types:
                plaintext = custom_bytes if custom_bytes is not None else generate_data(data_type, trace_size)
                data_label = ("Пользовательские данные" if custom_bytes is not None
                              else DATA_TYPE_LABELS.get(data_type, data_type))

                steps = []

                # Step 1: Generated input data
                steps.append({
                    "step": 1,
                    "title": f"Исходные данные — {data_label}",
                    "description": f"Сгенерированные данные типа «{data_label}», {len(plaintext)} байт",
                    "data_text": _text_preview(plaintext),
                    "data_hex": _bytes_to_hex_preview(plaintext, 128),
                    "data_size": len(plaintext),
                    "entropy": round(calculate_shannon_entropy(plaintext), 4),
                    "freq": _bytes_freq(plaintext),
                })

                # Step 2: Key generation
                steps.append({
                    "step": 2,
                    "title": "Генерация ключа",
                    "description": f"Криптографически случайный ключ ({key_size * 8} бит)",
                    "data_hex": _bytes_to_hex_preview(key, 128),
                    "data_size": len(key),
                    "key_size_bits": key_size * 8,
                })

                # Step 3: Padding
                if not is_stream and block_size:
                    from Crypto.Util.Padding import pad as crypto_pad
                    padded = crypto_pad(plaintext, block_size)
                    padding_bytes = len(padded) - len(plaintext)
                    steps.append({
                        "step": 3,
                        "title": f"Дополнение (PKCS7, блок {block_size} байт)",
                        "description": f"Добавлено {padding_bytes} байт для выравнивания по размеру блока ({block_size} байт)",
                        "data_hex": _bytes_to_hex_preview(padded, 128),
                        "data_size": len(padded),
                        "padding_bytes": padding_bytes,
                        "block_size": block_size,
                        "num_blocks": len(padded) // block_size,
                    })
                else:
                    steps.append({
                        "step": 3,
                        "title": "Дополнение не требуется",
                        "description": "Потоковый шифр, не требует выравнивания по блокам",
                        "data_hex": _bytes_to_hex_preview(plaintext, 128),
                        "data_size": len(plaintext),
                    })

                # Step 4: IV generation
                if not is_stream and block_size:
                    iv_demo = key[:block_size]
                    steps.append({
                        "step": 4,
                        "title": "Генерация вектора инициализации (IV)",
                        "description": f"Случайный IV длиной {block_size} байт для режима CBC. Передаётся вместе с шифротекстом.",
                        "data_hex": _bytes_to_hex_preview(iv_demo, 128),
                        "data_size": block_size,
                    })

                # Step 5: Encryption
                ciphertext, enc_time = cipher.encrypt_timed(plaintext, key)

                if not is_stream and block_size:
                    iv_in_ct = ciphertext[:block_size]
                    ct_only = ciphertext[block_size:]
                    steps.append({
                        "step": 5,
                        "title": "Шифрование (результат)",
                        "description": f"Режим CBC. Время: {enc_time*1000:.2f} мс",
                        "data_hex": _bytes_to_hex_preview(ct_only, 128),
                        "data_size": len(ct_only),
                        "entropy": round(calculate_shannon_entropy(ct_only), 4),
                        "freq": _bytes_freq(ct_only),
                        "encrypt_time_ms": round(enc_time * 1000, 3),
                        "iv_hex": _bytes_to_hex_preview(iv_in_ct, 128),
                    })
                else:
                    steps.append({
                        "step": 5,
                        "title": "Шифрование (результат)",
                        "description": f"Потоковый шифр. Время: {enc_time*1000:.2f} мс",
                        "data_hex": _bytes_to_hex_preview(ciphertext, 128),
                        "data_size": len(ciphertext),
                        "entropy": round(calculate_shannon_entropy(ciphertext), 4),
                        "freq": _bytes_freq(ciphertext),
                        "encrypt_time_ms": round(enc_time * 1000, 3),
                    })

                # Step 6: Full ciphertext
                steps.append({
                    "step": 6,
                    "title": "Итоговый шифротекст (передаваемые данные)",
                    "description": f"{'IV + шифротекст' if not is_stream else 'Шифротекст'} — данные, которые передаются получателю",
                    "data_hex": _bytes_to_hex_preview(ciphertext, 128),
                    "data_size": len(ciphertext),
                    "entropy": round(calculate_shannon_entropy(ciphertext), 4),
                    "freq": _bytes_freq(ciphertext),
                    "size_overhead": len(ciphertext) - len(plaintext),
                })

                # Step 7: Decryption verification
                try:
                    decrypted = cipher.decrypt(ciphertext, key)
                    decrypted_text = _text_preview(decrypted)
                    match = decrypted == plaintext
                except Exception:
                    decrypted_text = "<ошибка дешифрования>"
                    decrypted = b""
                    match = False

                steps.append({
                    "step": 7,
                    "title": "Дешифрование (проверка)",
                    "description": "Обратное преобразование для проверки корректности",
                    "data_text": decrypted_text,
                    "data_hex": _bytes_to_hex_preview(decrypted if match else b"", 128),
                    "data_size": len(decrypted) if match else 0,
                    "match": match,
                })

                # Build visual preview data
                plain_b64 = base64.b64encode(plaintext).decode("ascii")
                cipher_b64 = base64.b64encode(ciphertext).decode("ascii")
                decrypted_b64 = base64.b64encode(decrypted).decode("ascii") if match else None

                traces.append({
                    "algorithm": algo_upper,
                    "data_type": data_type,
                    "data_type_label": data_label,
                    "data_size": len(plaintext),
                    "key_hex": _bytes_to_hex_preview(key, 128),
                    "key_size_bits": key_size * 8,
                    "is_stream": is_stream,
                    "block_size": block_size if not is_stream else None,
                    "mode": "Stream" if is_stream else "CBC",
                    "steps": steps,
                    "entropy_plain": round(calculate_shannon_entropy(plaintext), 4),
                    "entropy_cipher": round(calculate_shannon_entropy(ciphertext), 4),
                    "plaintext_b64": plain_b64,
                    "ciphertext_b64": cipher_b64,
                    "decrypted_b64": decrypted_b64,
                })

        actual_size = len(custom_bytes) if custom_bytes is not None else trace_size
        return {
            "data_types": request.data_types,
            "data_size": actual_size,
            "is_custom": custom_bytes is not None,
            "traces": traces,
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Trace failed: {str(e)}")
