# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## [0.1.15]

### Added
- Your new features here.

### Changed
- Your changes here.

### Deprecated
- Your deprecated features here.

### Removed
- Your removed features here.

### Fixed
- Your bug fixes here.

### Security
- Your security fixes here. -->

## [Unreleased]

### Added
- Included `py.typed` marker for type checking support.

## [0.2.1] - 2025-06-06

### Added
- Ability to create groups of steps (Flows) such that when entering a flow, steps will have seperate context/memory with summary of the parent context. Allowing for longer running workflows and more complex workflows to be created.
- Support for Huggingface and Ollama LLM providers.
- New Visual Builder is available [here](https://nomos.dowhile.dev/try) to create agents visually.

### Fixed
- Added few minor fixes to the Memory modules.

## [0.1.15] - 2025-05-28

### Added
- Ability to generate agent config using AI, `nomos init --generate`.

### Tested
- Tests for CLI added to ensure the CLI commands work as expected and to prevent regressions in future updates.

### Fixed
- `nomos serve` not identifying the tools

### Improved
- Now Uses better/simplified decision making for agent steps

## [0.1.14] - 2025-05-27

### Changed
- Updated CLI to use `typer` for better command-line interface management and more options.
- Simplified naming convention for agents and improved prompting mechanism for better user experience.

## [0.1.13] - 2025-05-26

### Changed
- Brand update to Nomos.

### Added
- Added an iteration (next) limiter to avoid infinite loops in the workflow. This ensures that workflows do not get stuck in an infinite loop, enhancing reliability and predictability of agent behavior.


## [0.1.12] - 2025-05-22

### Added
- Support for step-level `answer_model` in agent config, allowing structured (JSON/object) responses from the agent for specific steps. This enables clients (such as UIs) to render rich, custom layouts and workflows based on structured data, not just plain text
- Now can ommit the ability for a step to respond back allowing workflow automation to be done without the need for a human to respond. This is useful for automating workflows where human input is not required or desired.

### Changed
- Agent Response is now stored in `response` key instead of `input`.
- Enhanced error handling. (FallbackError)
- Improved session management.


## [0.1.11] - 2025-05-10

### Added
- Elastic APM tracing support.
