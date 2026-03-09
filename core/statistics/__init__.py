from .frequency_analysis import (
    get_byte_frequencies,
    get_byte_probabilities,
    chi_square_uniformity_test,
    frequency_deviation,
)
from .correlation import (
    calculate_autocorrelation,
    calculate_plaintext_ciphertext_correlation,
    calculate_autocorrelation_profile,
)
from .distribution_metrics import (
    calculate_distribution_metrics,
    compare_to_uniform,
    calculate_max_index_of_coincidence,
)


def analyze_all_statistics(plaintext: bytes, ciphertext: bytes) -> dict:
    """Запускает полный статистический анализ шифртекста."""
    freq = chi_square_uniformity_test(ciphertext)
    dist = calculate_distribution_metrics(ciphertext)
    corr = calculate_plaintext_ciphertext_correlation(plaintext, ciphertext)
    return {
        **{f"freq_{k}": v for k, v in freq.items()},
        **{f"dist_{k}": v for k, v in dist.items()},
        **{f"corr_{k}": v for k, v in corr.items()},
        "autocorr_lag1": calculate_autocorrelation(ciphertext, lag=1),
        "freq_deviation": frequency_deviation(ciphertext),
        "index_of_coincidence": calculate_max_index_of_coincidence(ciphertext),
    }
