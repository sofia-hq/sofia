# CLI Quick Reference

Nomos ships with a CLI to bootstrap and run agents.

## Initialize a project

```
nomos init --directory ./my-bot --name chatbot --template basic
```

Options include:
- `--directory, -d`: Project directory
- `--name, -n`: Agent name
- `--template, -t`: Template type
- `--generate, -g`: Generate with AI

## Development server

```
nomos run
```

Pass `--config` for a YAML file and `--port` to change the port.

## Production

```
nomos serve --detach
```

See the README for full option lists.
