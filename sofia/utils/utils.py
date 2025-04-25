"""
Utility functions and helpers for the SOFIA package.
"""

from typing import Dict, Any, Type

from pydantic import BaseModel, Field, create_model

def create_base_model(name: str, params: Dict[str, Dict[str, Any]]) -> Type[BaseModel]:
    fields = {}
    for field_name, config in params.items():
        field_type = config["type"]
        default_val = config.get("default", ...)
        description = config.get("description")

        if description is not None or description != "":
            field_info = Field(default=default_val, description=description)
        else:
            field_info = default_val

        fields[field_name] = (field_type, field_info)

    return create_model(name, **fields)
