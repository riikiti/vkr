from pydantic import BaseModel, Field
from typing import Any


class ExperimentRequest(BaseModel):
    """Request body for running experiments."""
    algorithms: list[str] = Field(
        description="List of algorithm names, e.g. ['AES', 'DES', '3DES', 'GOST']"
    )
    data_types: list[str] = Field(
        description="List of data types, e.g. ['text', 'binary', 'random', 'image']"
    )
    data_sizes: list[int] = Field(
        description="List of data sizes in bytes, e.g. [1024, 10240]"
    )
    avalanche_iterations: int = Field(
        default=100,
        description="Number of iterations for the avalanche effect test"
    )


class EntropyResult(BaseModel):
    algorithm: str
    data_type: str
    data_size: int
    encrypt_time_sec: float
    shannon_entropy_plain: float
    shannon_entropy_cipher: float
    kl_divergence: float
    conditional_entropy: float
    mutual_information: float
    entropy_score: float


class AvalancheResult(BaseModel):
    algorithm: str
    data_size: int
    avalanche_mean: float
    avalanche_std: float
    avalanche_min: float
    avalanche_max: float
    is_good: bool


class DistributionResult(BaseModel):
    algorithm: str
    data_type: str
    data_size: int
    metrics: dict[str, Any]


class RankingEntry(BaseModel):
    rank: int
    algorithm: str
    total_score: float
    score_details: dict[str, float] = {}


class ExperimentResponse(BaseModel):
    """Full experiment results."""
    entropy_results: list[dict[str, Any]]
    avalanche_results: list[dict[str, Any]]
    distribution_results: list[dict[str, Any]]
    summary: list[dict[str, Any]]
    ranking: list[dict[str, Any]]


class ReportRequest(BaseModel):
    """Request body for generating a report."""
    format: str = Field(
        default="markdown",
        description="Report format: 'markdown', 'csv', or 'json'"
    )
    entropy_results: list[dict[str, Any]]
    avalanche_results: list[dict[str, Any]]
    distribution_results: list[dict[str, Any]] = []


class TraceRequest(BaseModel):
    """Request body for step-by-step encryption trace."""
    algorithms: list[str] = Field(
        description="List of algorithm names to trace"
    )
    data_types: list[str] = Field(
        default=["text"],
        description="List of data types to trace, e.g. ['text', 'random', 'zeros']"
    )
    data_size: int = Field(
        default=256,
        description="Size of generated data in bytes (kept small for readable hex output)"
    )


class ConfigResponse(BaseModel):
    """Available configuration options."""
    algorithms: list[str]
    data_types: list[str]
    data_sizes: list[int]
    avalanche_default_iterations: int
    report_formats: list[str]
