"""
API router for generating downloadable reports.
"""
import sys
import os
import tempfile
import traceback

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from analytics.research_report import (
    generate_markdown_report,
    generate_csv_report,
    generate_json_report,
)
from analytics.metrics_calculator import calculate_algorithm_summary, rank_algorithms

from schemas import ReportRequest

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/generate")
def generate_report(request: ReportRequest):
    """
    Generate a report in the requested format (markdown, csv, json).
    Returns the file for download.
    """
    try:
        fmt = request.format.lower()
        if fmt not in ("markdown", "md", "csv", "json"):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format: {fmt}. Use 'markdown', 'csv', or 'json'.",
            )

        entropy_df = pd.DataFrame(request.entropy_results)
        avalanche_df = pd.DataFrame(request.avalanche_results)

        # For CSV/JSON, merge everything into one table
        all_records = []
        for erec in request.entropy_results:
            row = dict(erec)
            # Merge distribution data if available
            for drec in request.distribution_results:
                if (drec.get("algorithm") == erec.get("algorithm")
                        and drec.get("data_type") == erec.get("data_type")
                        and drec.get("data_size") == erec.get("data_size")):
                    row.update(drec)
                    break
            # Merge avalanche data
            for arec in request.avalanche_results:
                if (arec.get("algorithm") == erec.get("algorithm")
                        and arec.get("data_size") == erec.get("data_size")):
                    row.update(arec)
                    break
            all_records.append(row)

        merged_df = pd.DataFrame(all_records)

        # Create temp file for the report
        tmp_dir = tempfile.mkdtemp()

        if fmt in ("markdown", "md"):
            output_path = os.path.join(tmp_dir, "report.md")
            generate_markdown_report(entropy_df, avalanche_df, output_path)
            media_type = "text/markdown"
            filename = "research_report.md"
        elif fmt == "csv":
            output_path = os.path.join(tmp_dir, "report.csv")
            generate_csv_report(merged_df, output_path)
            media_type = "text/csv"
            filename = "research_report.csv"
        elif fmt == "json":
            output_path = os.path.join(tmp_dir, "report.json")
            generate_json_report(merged_df, output_path)
            media_type = "application/json"
            filename = "research_report.json"

        return FileResponse(
            path=output_path,
            media_type=media_type,
            filename=filename,
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
