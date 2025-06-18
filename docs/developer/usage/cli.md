# CLI Quick Reference

Nomos provides a `nomos` command with helpful sub‑commands.

## Initialize a project
```bash
nomos init --directory ./my-bot --name chatbot --template basic
```
Options:
- `--directory, -d` project directory
- `--name, -n` agent name
- `--template, -t` template type
- `--generate, -g` let Nomos draft your config

## Run locally
```bash
nomos run --config config.agent.yaml --port 8000
```
Use `--watch` to reload on changes.

## Serve in production
```bash
nomos serve --config config.agent.yaml --detach
```

## Test an agent
```bash
nomos test -c tests.agent.yaml
```
