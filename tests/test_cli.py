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

from nomos.cli import app, _parse_env_file, _serve_with_docker


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

    @patch("nomos.cli._serve_with_docker")
    def test_serve_basic_success(self, mock_serve_docker):
        """Test successful serve command."""

        config_path = self.create_temp_config()

        result = self.runner.invoke(app, ["serve", "--config", str(config_path)])

        assert result.exit_code == 0
        mock_serve_docker.assert_called_once()

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

    def test_serve_env_file_not_found(self):
        """Test serve command with non-existent env file."""

        config_path = self.create_temp_config()

        result = self.runner.invoke(
            app,
            ["serve", "--config", str(config_path), "--env-file", "/non/existent/.env"],
        )

        assert result.exit_code == 1
        assert "Environment file not found" in result.stdout

    @patch("nomos.cli._serve_with_docker")
    def test_serve_with_all_options(self, mock_serve_docker):
        """Test serve command with all options."""

        config_path = self.create_temp_config()
        tools_path = self.create_temp_tools()
        env_path = self.create_temp_env_file()

        result = self.runner.invoke(
            app,
            [
                "serve",
                "--config",
                str(config_path),
                "--tools",
                str(tools_path),
                "--env-file",
                str(env_path),
                "--tag",
                "custom-tag",
                "--port",
                "9000",
                "--no-build",
                "--detach",
            ],
        )

        assert result.exit_code == 0
        mock_serve_docker.assert_called_once()

        # Check that all parameters were passed correctly
        call_args = mock_serve_docker.call_args
        assert call_args[0][4] == "custom-tag"  # tag
        assert call_args[0][5] == 9000  # port
        assert call_args[0][6] == False  # build
        assert call_args[0][7] == True  # detach


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

    @patch("docker.from_env")
    @patch("tempfile.TemporaryDirectory")
    @patch("shutil.copy2")
    @patch("nomos.cli.console")
    def test_serve_with_docker_build_success(
        self, mock_console, mock_copy, mock_temp_dir, mock_docker
    ):
        """Test _serve_with_docker with successful build."""

        # Setup mocks
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir
        mock_client = Mock()
        mock_docker.return_value = mock_client

        # Mock successful build
        mock_image = Mock()
        mock_build_logs = [
            {"stream": "Step 1/3 : FROM base\n"},
            {"stream": "Successfully built abc123\n"},
        ]
        mock_client.images.build.return_value = (mock_image, mock_build_logs)

        # Mock successful container run
        mock_container = Mock()
        mock_container.short_id = "abc123"
        mock_client.containers.run.return_value = mock_container

        # Create test files
        config_path = Path(self.temp_dir) / "config.yaml"
        config_path.write_text("test config")

        # Test detached mode
        _serve_with_docker(
            config_path=config_path,
            tool_files=[],
            dockerfile=None,
            env_file_path=None,
            tag="test-tag",
            port=8000,
            build=True,
            detach=True,
        )

        # Verify Docker interactions
        mock_client.images.build.assert_called_once()
        mock_client.containers.run.assert_called_once()

        # Check container run parameters
        run_call = mock_client.containers.run.call_args
        assert run_call[0][0] == "test-tag"  # image tag
        assert run_call[1]["detach"] == True
        assert run_call[1]["ports"] == {"8000/tcp": 8000}

    @patch("docker.from_env")
    @patch("tempfile.TemporaryDirectory")
    @patch("shutil.copy2")
    @patch("nomos.cli.console")
    def test_serve_with_docker_build_error(
        self, mock_console, mock_copy, mock_temp_dir, mock_docker
    ):
        """Test _serve_with_docker with build error."""

        from docker.errors import BuildError

        # Setup mocks
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir
        mock_client = Mock()
        mock_docker.return_value = mock_client

        # Mock build error
        build_error = BuildError(
            "Build failed", build_log=[{"stream": "Error message\n"}]
        )
        mock_client.images.build.side_effect = build_error

        # Create test files
        config_path = Path(self.temp_dir) / "config.yaml"
        config_path.write_text("test config")

        with pytest.raises(typer.Exit) as exc_info:
            _serve_with_docker(
                config_path=config_path,
                tool_files=[],
                dockerfile=None,
                env_file_path=None,
                tag="test-tag",
                port=8000,
                build=True,
                detach=False,
            )
        assert exc_info.value.exit_code == 1

    @patch("docker.from_env")
    @patch("tempfile.TemporaryDirectory")
    @patch("shutil.copy2")
    @patch("nomos.cli.console")
    def test_serve_with_docker_foreground_mode(
        self, mock_console, mock_copy, mock_temp_dir, mock_docker
    ):
        """Test _serve_with_docker in foreground mode."""

        # Setup mocks
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir
        mock_client = Mock()
        mock_docker.return_value = mock_client

        # Skip build
        # Mock container run in foreground
        mock_client.containers.run.return_value = None  # Foreground mode returns None

        # Create test files
        config_path = Path(self.temp_dir) / "config.yaml"
        config_path.write_text("test config")

        _serve_with_docker(
            config_path=config_path,
            tool_files=[],
            dockerfile=None,
            env_file_path=None,
            tag="test-tag",
            port=8000,
            build=False,  # Skip build
            detach=False,
        )

        # Verify container run parameters for foreground mode
        run_call = mock_client.containers.run.call_args
        assert run_call[1]["detach"] == False
        assert run_call[1]["stream"] == True

    @patch("docker.from_env")
    @patch("tempfile.TemporaryDirectory")
    @patch("shutil.copy2")
    @patch("nomos.cli.console")
    def test_serve_with_docker_with_env_file(
        self, mock_console, mock_copy, mock_temp_dir, mock_docker
    ):
        """Test _serve_with_docker with environment file."""
        # Setup mocks
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir
        mock_client = Mock()
        mock_docker.return_value = mock_client

        # Mock container run
        mock_container = Mock()
        mock_container.short_id = "abc123"
        mock_client.containers.run.return_value = mock_container

        # Create test files
        config_path = Path(self.temp_dir) / "config.yaml"
        config_path.write_text("test config")

        env_path = Path(self.temp_dir) / ".env"
        env_path.write_text("API_KEY=test_key\nDEBUG=true")

        _serve_with_docker(
            config_path=config_path,
            tool_files=[],
            dockerfile=None,
            env_file_path=env_path,
            tag="test-tag",
            port=8000,
            build=False,
            detach=True,
        )

        # Verify environment variables were passed
        run_call = mock_client.containers.run.call_args
        expected_env = {"API_KEY": "test_key", "DEBUG": "true"}
        assert run_call[1]["environment"] == expected_env

    @patch("docker.from_env")
    @patch("tempfile.TemporaryDirectory")
    @patch("shutil.copy2")
    @patch("nomos.cli.console")
    def test_serve_with_docker_with_tools(
        self, mock_console, mock_copy, mock_temp_dir, mock_docker
    ):
        """Test _serve_with_docker with tool files."""

        # Setup mocks
        mock_temp_dir.return_value.__enter__.return_value = self.temp_dir
        mock_client = Mock()
        mock_docker.return_value = mock_client

        # Mock container run
        mock_container = Mock()
        mock_container.short_id = "abc123"
        mock_client.containers.run.return_value = mock_container

        # Create test files
        config_path = Path(self.temp_dir) / "config.yaml"
        config_path.write_text("test config")

        tools_path = Path(self.temp_dir) / "tools.py"
        tools_path.write_text("def test_tool(): pass")

        _serve_with_docker(
            config_path=config_path,
            tool_files=[tools_path],
            dockerfile=None,
            env_file_path=None,
            tag="test-tag",
            port=8000,
            build=False,
            detach=True,
        )

        # Verify copy2 was called for tool files
        assert mock_copy.call_count >= 2  # config + tool file


class TestCLIHelpers:
    """Test CLI helper functions and edge cases."""

    def test_app_help(self):
        """Test that the main CLI app shows help."""
        runner = CliRunner()
        result = runner.invoke(app, ["--help"])

        assert result.exit_code == 0
        assert "Nomos CLI" in result.stdout
        assert "init" in result.stdout
        assert "run" in result.stdout
        assert "serve" in result.stdout

    def test_init_help(self):
        """Test init command help."""
        runner = CliRunner()
        result = runner.invoke(app, ["init", "--help"])

        assert result.exit_code == 0
        assert "Initialize a new Nomos agent project" in result.stdout

    def test_run_help(self):
        """Test run command help."""
        runner = CliRunner()
        result = runner.invoke(app, ["run", "--help"])

        assert result.exit_code == 0
        assert "Run the Nomos agent in development mode" in result.stdout

    def test_serve_help(self):
        """Test serve command help."""
        runner = CliRunner()
        result = runner.invoke(app, ["serve", "--help"])

        assert result.exit_code == 0
        assert "Serve the Nomos agent using Docker" in result.stdout


class TestErrorHandling:
    """Test error handling scenarios."""

    def test_keyboard_interrupt_handling(self):
        """Test that KeyboardInterrupt is handled gracefully."""
        runner = CliRunner()

        with patch("nomos.cli._run_development_server") as mock_run:
            mock_run.side_effect = KeyboardInterrupt()

            # Create a temporary config file
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".yaml", delete=False
            ) as f:
                f.write("name: test\npersona: test\nllm:\n  type: mock\nsteps: []")
                config_path = f.name

            try:
                result = runner.invoke(app, ["run", "--config", config_path])

                # Should handle KeyboardInterrupt gracefully
                assert (
                    "Development server stopped" in result.stdout
                    or result.exit_code == 0
                )
            finally:
                os.unlink(config_path)

    def test_general_exception_handling(self):
        """Test that general exceptions are handled."""
        runner = CliRunner()

        with patch("nomos.cli._run_development_server") as mock_run:
            mock_run.side_effect = Exception("Test error")

            # Create a temporary config file
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".yaml", delete=False
            ) as f:
                f.write("name: test\npersona: test\nllm:\n  type: mock\nsteps: []")
                config_path = f.name

            try:
                result = runner.invoke(app, ["run", "--config", config_path])

                assert result.exit_code == 1
                assert "Error running development server" in result.stdout
            finally:
                os.unlink(config_path)


class TestIntegration:
    """Integration tests for CLI functionality."""

    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()

    def teardown_method(self):
        """Clean up test environment."""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    @pytest.mark.integration
    def test_init_creates_valid_project(self):
        """Test that init creates a valid project structure."""
        runner = CliRunner()

        with patch("nomos.cli.Prompt.ask") as mock_prompt:
            with patch("nomos.cli.Confirm.ask") as mock_confirm:
                mock_prompt.side_effect = [
                    "You are a test agent",  # persona (name provided via CLI)
                    "1",  # LLM provider selection (1 = OpenAI)
                ]
                mock_confirm.side_effect = [False]  # don't customize workflow steps

                result = runner.invoke(
                    app,
                    [
                        "init",
                        "--directory",
                        self.temp_dir,
                        "--template",
                        "basic",
                        "--name",
                        "test_agent",
                    ],
                )

                assert result.exit_code == 0

                # Check that all expected files exist
                project_path = Path(self.temp_dir)
                assert (project_path / "config.agent.yaml").exists()
                assert (project_path / "tools" / "__init__.py").exists()
                assert (project_path / "main.py").exists()

                # Check that config file is valid YAML
                config_content = (project_path / "config.agent.yaml").read_text()
                assert "test_agent" in config_content
                assert "You are a test agent" in config_content

    @pytest.mark.integration
    def test_full_workflow_run_command(self):
        """Test a complete workflow with the run command."""
        runner = CliRunner()

        # Create a complete project structure
        config_content = """
name: "integration_test_agent"
persona: "You are an integration test agent"
llm:
  type: "mock"
steps:
  - step_id: "start"
    description: "Start step"
    routes:
      - target: "end"
        condition: "User is done"
    available_tools: ["test_tool"]
  - step_id: "end"
    description: "End step"
    routes: []
    available_tools: []
"""

        tools_content = '''
def test_tool(message: str) -> str:
    """A simple test tool."""
    return f"Processed: {message}"
'''

        config_path = Path(self.temp_dir) / "config.agent.yaml"
        tools_path = Path(self.temp_dir) / "tools.py"

        config_path.write_text(config_content)
        tools_path.write_text(tools_content)

        # Mock the actual server running
        with patch("nomos.cli._run_development_server") as mock_run:
            result = runner.invoke(
                app,
                [
                    "run",
                    "--config",
                    str(config_path),
                    "--tools",
                    str(tools_path),
                    "--port",
                    "9000",
                    "--verbose",
                ],
            )

            assert result.exit_code == 0
            mock_run.assert_called_once()

            # Verify the correct arguments were passed
            args = mock_run.call_args[0]
            assert args[0] == config_path  # config_path
            assert len(args[1]) == 1  # tool_files
            assert args[1][0] == tools_path  # tools_path
            assert args[2] == 9000  # port
            assert args[3] == True  # verbose


if __name__ == "__main__":
    pytest.main([__file__])
