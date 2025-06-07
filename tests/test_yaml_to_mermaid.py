import pytest
from nomos.api.yaml_to_mermaid import parse_yaml_config


def test_parse_yaml_config_file_not_found(tmp_path):
    missing = tmp_path / "missing.yaml"
    with pytest.raises(FileNotFoundError):
        parse_yaml_config(str(missing))


def test_parse_yaml_config_invalid_yaml(tmp_path):
    invalid = tmp_path / "invalid.yaml"
    invalid.write_text("foo: [\nbar")
    with pytest.raises(ValueError, match="Error parsing YAML"):
        parse_yaml_config(str(invalid))

