# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- ## [Unreleased]

### Added
.

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
