export interface LLMConfig {
  provider: string;
  model: string;
  params?: Record<string, any>;
}

let pyodide: any = null;
let loading: Promise<any> | null = null;

async function initPyodide() {
  if (!loading) {
    // Lazy load pyodide from CDN
    // @ts-ignore - remote module has no types
    loading = import('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js').then((m: any) => m.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' }));
  }
  pyodide = await loading;
}

export async function startAgent(
  yamlConfig: string,
  llm: LLMConfig,
  env: Record<string, string>
) {
  await initPyodide();
  if (!pyodide) return;

  await pyodide.loadPackage('micropip');
  await pyodide.runPythonAsync(
    `import micropip\nawait micropip.install('nomos')`
  );

  for (const [k, v] of Object.entries(env)) {
    const escaped = v.replace(/'/g, "\\'");
    pyodide.runPython(`import os; os.environ['${k}'] = '${escaped}'`);
  }

  pyodide.globals.set('yaml_config', yamlConfig);
  pyodide.globals.set('llm_provider', llm.provider);
  pyodide.globals.set('llm_model', llm.model);
  pyodide.globals.set('llm_params', llm.params || {});

  const script = `
import os, yaml, nomos
from nomos.llms import LLMConfig

data = yaml.safe_load(yaml_config)
server_data = data.get('server', {})
if isinstance(server_data, dict):
    expanded = {k: (os.getenv(v[1:], v) if isinstance(v, str) and v.startswith('$') else v) for k, v in server_data.items()}
    data['server'] = expanded

config = nomos.AgentConfig(**data)
config.llm = LLMConfig(provider=llm_provider, model=llm_model, kwargs=llm_params)
agent = nomos.Agent.from_config(config)
session = agent.create_session()
`;

  await pyodide.runPythonAsync(script);
}

export async function sendMessage(message: string): Promise<string> {
  if (!pyodide) throw new Error('Agent not started');
  pyodide.globals.set('user_msg', message);
  const resp = await pyodide.runPythonAsync(`decision, _ = session.next(user_msg)\nstr(decision)`);
  return resp as string;
}

export function stopAgent() {
  pyodide = null;
  loading = null;
}
