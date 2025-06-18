# CLI Quick Reference

Nomos provides a single `nomos` command with several helpful sub‑commands.

## init – create a project

```bash
nomos init --directory ./my-bot --name chatbot --template basic
```

Options:
- `--directory, -d` project directory
- `--name, -n` agent name
- `--template, -t` template type
- `--generate, -g` let Nomos draft your config

## run – local development

```bash
nomos run --config config.agent.yaml --port 8000
```

Use `--watch` to reload on changes.

## serve – production deployment

```bash
nomos serve --config config.agent.yaml --detach
```

## test – run unit and scenario tests

```bash
nomos test -c tests.agent.yaml
```
