# LLM Support

NOMOS supports multiple LLM providers, allowing you to choose the best model for your use case.

## Supported Providers

### OpenAI

```python
from nomos.llms import OpenAI

llm = OpenAI(model="gpt-4o-mini")
# or
llm = OpenAI(model="gpt-4o")
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

llm = Mistral(model="mistral-medium")
# or
llm = Mistral(model="mistral-small")
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

llm = Gemini(model="gemini-pro")
# or
llm = Gemini(model="gemini-1.5-pro")
llm = Gemini(model="gemini-1.5-flash")
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

llm = Ollama(model="llama3")
# or
llm = Ollama(model="mistral")
llm = Ollama(model="codellama")
```

**Installation:**
```bash
pip install nomos[ollama]
```

**Prerequisites:**
- Install [Ollama](https://ollama.ai/)
- Pull the desired model: `ollama pull llama3`

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
  model: gemini-pro
```

### Ollama
```yaml
llm:
  provider: ollama
  model: llama3
  base_url: http://localhost:11434  # Optional: custom Ollama URL
```

### HuggingFace
```yaml
llm:
  provider: huggingface
  model: meta-llama/Meta-Llama-3-8B-Instruct
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

## Model Selection Guidelines

### For Production Use
- **OpenAI GPT-4o**: Best overall performance, most reliable
- **Mistral Large**: Strong performance, competitive pricing
- **Gemini Pro**: Good balance of speed and capability

### For Development/Testing
- **OpenAI GPT-4o-mini**: Fast and cost-effective
- **Mistral Small**: Affordable option with good performance
- **Ollama**: Local models, no API costs

### For Specialized Tasks
- **Code Generation**: GPT-4o, CodeLlama (via Ollama)
- **Conversational**: GPT-4o-mini, Mistral Medium
- **Multilingual**: Gemini Pro, GPT-4o

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
