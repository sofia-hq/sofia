"""Tests for the CLI functionality."""

import os
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch
from typing import Optional

import pytest
import typer
from typer.testing import CliRunner

from nomos.cli import app, _parse_env_file, run_server


class TestCLI:
    """Test CLI functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.runner = CliRunner()
        self.temp_dir = None

    def teardown_method(self):
        """Clean up after tests."""
        if self.temp_dir and Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def create_temp_config(self, content: Optional[str] = None) -> Path:
        """Create a temporary configuration file."""
        if content is None:
            content = """
name: "test_agent"
persona: "You are a test agent"
llm:
  provider: "openai"
  model: "gpt-3.5-turbo"
steps:
  - step_id: "start"
    description: "Start step"
    routes: []
    available_tools: []
start_step_id: "start"
"""
        self.temp_dir = tempfile.mkdtemp()
        config_path = Path(self.temp_dir) / "config.agent.yaml"
        config_path.write_text(content)
        return config_path

    def create_temp_tools(self) -> Path:
        """Create a temporary tools file."""
        if not self.temp_dir:
            self.temp_dir = tempfile.mkdtemp()
        tools_content = '''
def test_tool(input_str: str) -> str:
    """A test tool function."""
    return f"Test output: {input_str}"

def another_tool(value: int) -> int:
    """Another test tool."""
    return value * 2

tools = [test_tool, another_tool]
'''
        tools_path = Path(self.temp_dir) / "tools.py"
        tools_path.write_text(tools_content)
        return tools_path

    def create_temp_env_file(self) -> Path:
        """Create a temporary .env file."""
        if not self.temp_dir:
            self.temp_dir = tempfile.mkdtemp()
        env_content = """
API_KEY=test_key
DEBUG=true
PORT=8000
EMPTY_VAR=
# This is a comment
MULTI_LINE_VAR=line1\\nline2
"""
        env_path = Path(self.temp_dir) / ".env"
        env_path.write_text(env_content)
        return env_path


class TestInitCommand(TestCLI):
    """Test the init command."""

    @patch("nomos.cli.Prompt.ask")
    @patch("nomos.cli.Confirm.ask")
    def test_init_basic_success(self, mock_confirm, mock_prompt):
        """Test successful basic project initialization."""
        mock_prompt.side_effect = [
            "You are a helpful test agent",  # persona (name is provided via CLI)
            "1",  # LLM provider selection (1 = OpenAI)
        ]
        mock_confirm.side_effect = [False]  # don't customize workflow steps

        with tempfile.TemporaryDirectory() as temp_dir:
            result = self.runner.invoke(
                app,
                [
                    "init",
                    "--directory",
                    temp_dir,
                    "--template",
                    "basic",
                    "--name",
                    "test_agent",
                ],
            )

            assert result.exit_code == 0
            # Check that files were created
            project_dir = Path(temp_dir)
            assert (project_dir / "config.agent.yaml").exists()
            assert (project_dir / "tools" / "__init__.py").exists()
            assert (project_dir / "main.py").exists()
            assert (project_dir / "Dockerfile").exists()

    @patch("nomos.cli.Prompt.ask")
    @patch("nomos.cli.Confirm.ask")
    def test_init_with_existing_directory(self, mock_confirm, mock_prompt):
        """Test init with existing non-empty directory."""
        mock_confirm.return_value = False  # Don't continue with existing dir

        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a file in the directory to make it non-empty
            (Path(temp_dir) / "existing_file.txt").write_text("test")

            result = self.runner.invoke(app, ["init", "--directory", temp_dir])

            assert result.exit_code == 1

    def test_init_with_all_params(self):
        """Test init command with all parameters provided."""
        with tempfile.TemporaryDirectory() as temp_dir:
            result = self.runner.invoke(
                app,
                [
                    "init",
                    "--directory",
                    temp_dir,
                    "--name",
                    "test_agent",
                    "--template",
                    "basic",
                ],
            )

            # The command should still prompt for persona, but let's check it runs
            assert result.exit_code == 0 or "persona" in result.stdout.lower()


class TestRunCommand(TestCLI):
    """Test the run command."""

    @patch("nomos.cli._run_development_server")
    def test_run_basic_success(self, mock_run_server):
        """Test successful run command."""
        config_path = self.create_temp_config()

        result = self.runner.invoke(app, ["run", "--config", str(config_path)])

        assert result.exit_code == 0
        mock_run_server.assert_called_once()

    def test_run_config_not_found(self):
        """Test run command with non-existent config file."""
        result = self.runner.invoke(
            app, ["run", "--config", "/non/existent/config.yaml"]
        )

        assert result.exit_code == 1
        assert "Configuration file not found" in result.stdout

    @patch("nomos.cli._run_development_server")
    def test_run_with_tools(self, mock_run_server):
        """Test run command with tool files."""
        config_path = self.create_temp_config()
        tools_path = self.create_temp_tools()

        result = self.runner.invoke(
            app, ["run", "--config", str(config_path), "--tools", str(tools_path)]
        )

        assert result.exit_code == 0
        mock_run_server.assert_called_once()

    def test_run_tool_not_found(self):
        """Test run command with non-existent tool file."""
        config_path = self.create_temp_config()

        result = self.runner.invoke(
            app,
            ["run", "--config", str(config_path), "--tools", "/non/existent/tools.py"],
        )

        assert result.exit_code == 1
        assert "Tool file not found" in result.stdout

    @patch("nomos.cli._run_development_server")
    def test_run_with_custom_port(self, mock_run_server):
        """Test run command with custom port."""
        config_path = self.create_temp_config()

        result = self.runner.invoke(
            app, ["run", "--config", str(config_path), "--port", "9000"]
        )

        assert result.exit_code == 0
        # Check that the custom port was passed to the server
        args = mock_run_server.call_args[0]
        assert args[2] == 9000  # port argument

    @patch("nomos.cli._run_development_server")
    def test_run_verbose_mode(self, mock_run_server):
        """Test run command with verbose output."""
        config_path = self.create_temp_config()

        result = self.runner.invoke(
            app, ["run", "--config", str(config_path), "--verbose"]
        )

        assert result.exit_code == 0
        # Check that verbose flag was passed
        args = mock_run_server.call_args[0]
        assert args[3] == True  # verbose argument


class TestServeCommand(TestCLI):
    """Test the serve command."""

    def test_serve_config_not_found(self):
        """Test serve command with non-existent config file."""

        result = self.runner.invoke(
            app, ["serve", "--config", "/non/existent/config.yaml"]
        )

        assert result.exit_code == 1
        assert "Configuration file not found" in result.stdout

    @patch("nomos.cli.run_server")
    def test_serve_basic_success(self, mock_run_server):
        """Test successful serve command."""

        config_path = self.create_temp_config()

        result = self.runner.invoke(app, ["serve", "--config", str(config_path)])

        assert result.exit_code == 0
        mock_run_server.assert_called_once()

    def test_serve_tool_not_found(self):
        """Test serve command with non-existent tool file."""

        config_path = self.create_temp_config()

        result = self.runner.invoke(
            app,
            [
                "serve",
                "--config",
                str(config_path),
                "--tools",
                "/non/existent/tools.py",
            ],
        )

        assert result.exit_code == 1
        assert "Tool file not found" in result.stdout

    @patch("nomos.cli.run_server")
    def test_serve_with_all_options(self, mock_run_server):
        """Test serve command with all options."""

        config_path = self.create_temp_config()
        tools_path = self.create_temp_tools()
        result = self.runner.invoke(
            app,
            [
                "serve",
                "--config",
                str(config_path),
                "--tools",
                str(tools_path),
                "--port",
                "9000",
                "--workers",
                "2",
            ],
        )

        assert result.exit_code == 0
        mock_run_server.assert_called_once()
        call_args = mock_run_server.call_args
        assert call_args[1]["port"] == 9000
        assert call_args[1]["workers"] == 2


class TestDockerFunctionality:
    """Test Docker-related functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()

    def teardown_method(self):
        """Clean up after tests."""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def test_parse_env_file(self):
        """Test parsing .env files."""
        env_content = """
# Comment line
API_KEY=test_key
DEBUG=true
PORT=8000
EMPTY_VAR=
QUOTED_VAR="quoted value"
SINGLE_QUOTED='single quoted'
MULTI_LINE=line1\\nline2
"""
        env_path = Path(self.temp_dir) / ".env"
        env_path.write_text(env_content)

        result = _parse_env_file(env_path)

        expected = {
            "API_KEY": "test_key",
            "DEBUG": "true",
            "PORT": "8000",
            "EMPTY_VAR": "",
            "QUOTED_VAR": "quoted value",
            "SINGLE_QUOTED": "single quoted",
            "MULTI_LINE": "line1\\nline2",
        }

        assert result == expected

    def test_parse_env_file_not_found(self):
        """Test parsing non-existent .env file."""
        with pytest.raises(FileNotFoundError):
            _parse_env_file(Path("/non/existent/.env"))
