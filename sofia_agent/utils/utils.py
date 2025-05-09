"""
Utility functions and helpers for the SOFIA package.
"""

from typing import Dict, Any, Type
from pydantic import BaseModel, Field, create_model, ConfigDict
from enum import Enum


def create_base_model(name: str, params: Dict[str, Dict[str, Any]]) -> Type[BaseModel]:
    """
    Dynamically create a Pydantic BaseModel with the given name and fields.

    :param name: Name of the model.
    :param params: Dictionary of field names to type/config dicts. Each config dict should have:
        - 'type': The type of the field.
        - 'default' (optional): The default value for the field.
        - 'description' (optional): The field description.
    :return: A dynamically created Pydantic BaseModel subclass.
    """
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

    return create_model(name, **fields, __config__=ConfigDict(extra="forbid"))


def create_enum(name: str, values: Dict[str, Any]) -> Type[Enum]:
    """
    Dynamically create an Enum class with the given name and values.

    :param name: Name of the enum.
    :param values: Dictionary of enum member names to values.
    :return: A dynamically created Enum class.
    """
    return Enum(name, values)


__all__ = [
    "create_base_model",
    "create_enum",
]
