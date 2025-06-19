# Examples

This directory contains real-world examples demonstrating NOMOS capabilities across different use cases.

## Available Examples

### [Barista Agent](../cookbook/examples/barista/)

A complete coffee shop ordering system demonstrating:

- **Multi-step workflows**: Order taking, customization, and confirmation
- **Tool integration**: Menu management, cart operations, and order processing
- **Flow management**: Organized order processing with context preservation
- **Error handling**: Graceful handling of invalid orders and edge cases

**To run:**
```bash
cd cookbook/examples/barista
export OPENAI_API_KEY=your-api-key-here
nomos run --config config.agent.yaml
```

### [Financial Planning Assistant](../cookbook/examples/financial-advisor/)

A production-ready financial advisor demonstrating:

- **Budget planning**: Income/expense tracking and analysis
- **Savings goals**: Goal setting and progress monitoring
- **Financial health**: Comprehensive financial assessment
- **Data persistence**: Session storage for ongoing consultations
- **Production deployment**: Docker containerization

**To run:**
```bash
cd cookbook/examples/financial-advisor
export OPENAI_API_KEY=your-api-key-here
nomos run --config config.agent.yaml
```

### [General Bot](../cookbook/examples/general-bot/)

A versatile conversational agent showing:

- **Basic conversation**: Natural language interaction
- **Tool usage**: Simple utility functions
- **Configuration patterns**: Clean YAML structure
- **Quick setup**: Minimal configuration for fast prototyping

**To run:**
```bash
cd cookbook/examples/general-bot
export OPENAI_API_KEY=your-api-key-here
nomos run --config config.agent.yaml
```

### [Travel Itinerary Planner](../cookbook/examples/travel-itinery-planner/)

A travel planning assistant featuring:

- **Complex workflows**: Multi-step trip planning
- **External integrations**: API calls for travel data
- **Context management**: Maintaining trip preferences across sessions
- **Rich responses**: Structured travel recommendations

**To run:**
```bash
cd cookbook/examples/travel-itinery-planner
export OPENAI_API_KEY=your-api-key-here
nomos run --config config.agent.yaml
```

### [TypeScript SDK Example](../cookbook/examples/typescript-sdk-example/)

Client-side integration example demonstrating:

- **SDK usage**: TypeScript/JavaScript client integration
- **WebSocket connections**: Real-time communication
- **Session management**: Client-side session handling
- **Error handling**: Robust client-side error management

**To run:**
```bash
cd cookbook/examples/typescript-sdk-example
npm install
npm start
```

## Example Categories

### By Complexity

**Beginner:**
- General Bot - Basic conversational patterns
- Simple tool integration examples

**Intermediate:**
- Barista Agent - Multi-step workflows with tools
- Travel Planner - API integrations and context management

**Advanced:**
- Financial Advisor - Production deployment patterns
- TypeScript SDK - Client-side integration

### By Use Case

**Customer Service:**
- Barista Agent - Order management and customer interaction
- General Bot - Basic support and information

**Professional Services:**
- Financial Advisor - Expert consultation and analysis
- Travel Planner - Specialized planning and recommendations

**Technical Integration:**
- TypeScript SDK - Client application integration
- All examples - Various deployment patterns

## Key Learning Points

### Configuration Patterns

Each example demonstrates different configuration approaches:

- **YAML-first**: Most examples use declarative YAML configuration
- **Tool organization**: Different approaches to organizing and loading tools
- **Flow management**: Examples of simple to complex flow structures
- **Error handling**: Various error handling and retry strategies

### Development Workflow

Examples show progression from development to production:

1. **Local development**: Using `nomos run` for rapid iteration
2. **Configuration management**: Organizing tools and settings
3. **Testing**: Using `nomos test` for validation
4. **Deployment**: Using `nomos serve` for production

### Best Practices

The examples demonstrate:

- **Modular design**: Separating concerns into logical components
- **Error resilience**: Handling edge cases and failures gracefully
- **Performance optimization**: Efficient LLM usage and response times
- **Security considerations**: Proper API key management and validation

## Creating Your Own Examples

To contribute a new example:

1. Create a new directory under `cookbook/examples/`
2. Include these files:
   - `config.agent.yaml` - Agent configuration
   - `README.md` - Setup and usage instructions
   - `tools.py` - Custom tools (if needed)
   - `tests.agent.yaml` - Test configuration (optional)

3. Follow the existing pattern:
   - Clear documentation
   - Working configuration
   - Error handling
   - Environment variable setup

4. Test your example:
   ```bash
   nomos test --config tests.agent.yaml
   nomos run --config config.agent.yaml
   ```

## Getting Help

If you have questions about any example:

1. Check the individual README files in each example directory
2. Review the [Configuration Guide](../docs/configuration.md)
3. See the [CLI Usage Guide](../docs/cli-usage.md)
4. Open an issue on GitHub with the `example` label

## Next Steps

After exploring the examples:

1. **Try modifications**: Customize the examples for your use case
2. **Combine patterns**: Mix and match techniques from different examples
3. **Create your own**: Use examples as templates for new agents
4. **Share back**: Contribute your examples to help others
