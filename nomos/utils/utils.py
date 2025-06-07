"""Utility functions and helpers for the SOFIA package."""

from enum import Enum
from typing import Any, Dict, List, Optional, Type, Union

from pydantic import BaseModel, ConfigDict, Field, create_model


def create_base_model(name: str, params: Dict[str, Dict[str, Any]]) -> Type[BaseModel]:
    """
    Dynamically create a Pydantic BaseModel with the given name and fields.

    :param name: Name of the model.
    :param params: Dictionary of field names to type/config dicts. Each config dict should have:
        - 'type': The type of the field.
        - 'default' (optional): The default value for the field.
        - 'description' (optional): The field description.
        - 'optional' (optional): Whether the field is optional (default: False).
        - 'is_list' (optional): Whether the field is a list (default: False).
    :return: A dynamically created Pydantic BaseModel subclass.
    """
    fields = {}
    for field_name, config in params.items():
        field_type = config["type"]
        default_val = config.get("default", ...)
        description = config.get("description")
        is_optional = config.get("optional", False)
        is_list = config.get("is_list", False)

        if isinstance(field_type, dict):
            field_type = create_base_model(
                name=field_type.get("name", "DynamicModel"),
                params=field_type.get("params", {}),
            )
        elif isinstance(field_type, list):
            field_types = []
            for _, item in enumerate(field_type):
                nested_field_type = create_base_model(
                    name=item.get("name", "DynamicModel"),
                    params=item.get("params", {}),
                )
                field_types.append(nested_field_type)
            field_type = Union.__getitem__(tuple(field_types))

        if is_list:
            field_type = List[field_type]  # type: ignore
        if is_optional:
            field_type = Optional[field_type]

        if description is not None and description != "":
            field_info = Field(default=default_val, description=description)
        else:
            field_info = default_val

        fields[field_name] = (field_type, field_info)

    return create_model(name, **fields, __config__=ConfigDict(extra="ignore"))


def create_enum(name: str, values: Dict[str, Any]) -> Enum:
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
