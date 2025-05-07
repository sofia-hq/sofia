#!/bin/sh
if [ -n "$CONFIG_URL" ]; then
    curl -L "$CONFIG_URL" -o /app/config.agent.yaml
elif [ -n "$CONFIG_PATH" ]; then
    cp "$CONFIG_PATH" /app/config.agent.yaml
fi

exec python main.py