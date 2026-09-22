from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class KnowledgeSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    query: str = Field(..., min_length=1, max_length=4000)
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        alias="topK",
        validation_alias=AliasChoices("topK", "top_k"),
    )
