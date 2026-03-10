"""
API router for running cryptanalysis experiments.
"""
import sys
import os
import time
import traceback

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
)

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

        entropy_records = []
        distribution_records = []
        avalanche_records = []

        # --- Entropy & Distribution experiments ---
        for algo_name in request.algorithms:
            algo_upper = algo_name.upper()
            cipher = get_cipher(algo_upper)
            key = cipher.generate_key()

            for data_type in request.data_types:
                for size in request.data_sizes:
                    plaintext = generate_data(data_type, size)
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

            for size in request.data_sizes:
                data = generate_random_data(size)
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
