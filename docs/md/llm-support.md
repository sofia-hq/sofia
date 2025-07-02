# LLM Support

NOMOS supports multiple LLM providers, allowing you to choose the best model for your use case.

## Supported Providers

### OpenAI

```python
from nomos.llms import OpenAI

llm = OpenAI(model="gpt-4o-mini")
# Other supported models:
llm = OpenAI(model="gpt-4o")
llm = OpenAI(model="gpt-4-turbo")
llm = OpenAI(model="gpt-3.5-turbo")
```

**Installation:**
```bash
pip install nomos[openai]
```

**Environment Variable:**
```bash
export OPENAI_API_KEY=your-api-key-here
```

### Mistral AI

```python
from nomos.llms import Mistral

llm = Mistral(model="ministral-8b-latest")
# Other supported models:
llm = Mistral(model="mistral-small")
llm = Mistral(model="mistral-medium")
llm = Mistral(model="mistral-large")
```

**Installation:**
```bash
pip install nomos[mistralai]
```

**Environment Variable:**
```bash
export MISTRAL_API_KEY=your-api-key-here
```

### Google Gemini

```python
from nomos.llms import Gemini

llm = Gemini(model="gemini-2.0-flash-exp")
# Other supported models:
llm = Gemini(model="gemini-1.5-pro")
llm = Gemini(model="gemini-1.5-flash")
llm = Gemini(model="gemini-1.0-pro")
```

**Installation:**
```bash
pip install nomos[gemini]
```

**Environment Variable:**
```bash
export GOOGLE_API_KEY=your-api-key-here
```

### Ollama (Local Models)

```python
from nomos.llms import Ollama

llm = Ollama(model="llama3.3")
# Other popular models:
llm = Ollama(model="qwen2.5:14b")
llm = Ollama(model="codestral")
llm = Ollama(model="deepseek-coder-v2")
llm = Ollama(model="phi4")
```

**Installation:**
```bash
pip install nomos[ollama]
```

**Prerequisites:**
- Install [Ollama](https://ollama.ai/)
- Pull the desired model: `ollama pull llama3.3`

### HuggingFace

```python
from nomos.llms import HuggingFace

llm = HuggingFace(model="meta-llama/Meta-Llama-3-8B-Instruct")
# or
llm = HuggingFace(model="microsoft/DialoGPT-large")
```

**Installation:**
```bash
pip install nomos[huggingface]
```

**Environment Variable:**
```bash
export HUGGINGFACE_API_TOKEN=your-token-here
```

### Anthropic

```python
from nomos.llms import Anthropic

llm = Anthropic(model="claude-3-5-sonnet-20241022")
# Other supported models:
llm = Anthropic(model="claude-3-5-haiku-20241022")
llm = Anthropic(model="claude-3-opus-20240229")
llm = Anthropic(model="claude-3-sonnet-20240229")
llm = Anthropic(model="claude-3-haiku-20240307")
```

**Installation:**
```bash
pip install nomos[anthropic]
```

**Environment Variable:**
```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

## YAML Configuration

You can also specify LLM configuration in your YAML config file:

### OpenAI
```yaml
llm:
  provider: openai
  model: gpt-4o-mini
```

### Mistral
```yaml
llm:
  provider: mistral
  model: mistral-medium
```

### Gemini
```yaml
llm:
  provider: gemini
  model: gemini-2.0-flash-exp
```

### Ollama
```yaml
llm:
  provider: ollama
  model: llama3.3
  base_url: http://localhost:11434  # Optional: custom Ollama URL
```

### HuggingFace
```yaml
llm:
  provider: huggingface
  model: meta-llama/Meta-Llama-3-8B-Instruct
```

### Anthropic
```yaml
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
```

## Advanced Configuration

### Custom Parameters

You can pass additional parameters to LLM providers:

```python
llm = OpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
    max_tokens=1000,
    top_p=0.9
)

llm = Anthropic(
    model="claude-3-5-sonnet-20241022",
    temperature=0.3,
    max_tokens=2048,
    top_p=0.8
)
```

### YAML Advanced Configuration

```yaml
llm:
  provider: openai
  model: gpt-4o-mini
  temperature: 0.7
  max_tokens: 1000
  top_p: 0.9
```

```yaml
llm:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
  temperature: 0.3
  max_tokens: 2048
  top_p: 0.8
```

## Model Selection Guidelines

### For Production Use
- **OpenAI GPT-4o**: Best overall performance, most reliable
- **Anthropic Claude 3.5 Sonnet**: Excellent reasoning and coding capabilities
- **Mistral Large**: Strong performance, competitive pricing
- **Google Gemini 2.0 Flash**: Fast and capable for most tasks

### For Development/Testing
- **OpenAI GPT-4o-mini**: Fast and cost-effective
- **Anthropic Claude 3.5 Sonnet**: Good balance of capability and speed
- **Mistral Small**: Affordable option with good performance
- **Ollama**: Local models, no API costs

### For Specialized Tasks
- **Code Generation**: GPT-4o, Claude 3.5 Sonnet, Codestral (via Ollama)
- **Conversational**: GPT-4o-mini, Claude 3.5 Haiku, Mistral Medium
- **Reasoning & Analysis**: Claude 3.5 Sonnet, GPT-4o, Claude 3 Opus
- **Multilingual**: Gemini 2.0 Flash, GPT-4o

## Troubleshooting

### Common Issues

1. **API Key Not Found**: Ensure environment variables are set correctly
2. **Model Not Available**: Check that the model name is correct and available
3. **Rate Limits**: Implement retry logic or use different models
4. **Local Models (Ollama)**: Ensure Ollama is running and model is pulled

### Error Handling

NOMOS includes built-in error handling and retry mechanisms:

```yaml
name: my-agent
llm:
  provider: openai
  model: gpt-4o-mini
max_errors: 3  # Retry up to 3 times on LLM errors
```

## Performance Tips

1. **Choose the Right Model**: Use smaller models for simple tasks
2. **Configure Temperature**: Lower values (0.1-0.3) for consistent responses
3. **Set Max Tokens**: Limit response length to control costs and latency
4. **Use Local Models**: Ollama for development or when data privacy is important

## Model Documentation

For the most up-to-date list of available models, refer to the official documentation:

- **Anthropic**: [Claude Models Overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- **OpenAI**: [OpenAI Models](https://platform.openai.com/docs/models)
- **Google Gemini**: [Vertex AI Generative AI Models](https://cloud.google.com/vertex-ai/generative-ai/docs/models)
- **Mistral AI**: [Mistral Models Overview](https://docs.mistral.ai/getting-started/models/models_overview/)
- **Ollama**: [Ollama Model Library](https://ollama.com/search)
