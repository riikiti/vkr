"""
Re-export configuration constants from the project root config.py.
This file is named app_config.py (not config.py) to avoid circular import
with the root config.py module.
"""
import sys
import os

# Ensure project root is on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from config import (  # noqa: E402, F401
    DATA_SIZES,
    ALGORITHMS,
    DATA_TYPES,
    ENTROPY_BASE,
    MAX_ENTROPY,
    AVALANCHE_TESTS,
    AVALANCHE_IDEAL,
    AVALANCHE_TOLERANCE,
    DATA_DIR,
    RAW_DIR,
    GENERATED_DIR,
    ENCRYPTED_DIR,
    RESULTS_DIR,
    REPORT_FORMATS,
    RESULTS_FILE,
    REPORT_FILE,
)
