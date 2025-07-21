import { OpenAIProvider } from './adapters/openai.js';
import { OllamaProvider } from './adapters/ollama.js';
import AIProvider from './base.js';

AIProvider.register('OPENAI', OpenAIProvider);
AIProvider.register('DEEPSEEK', OpenAIProvider);
AIProvider.register('OLLAMA', OllamaProvider);

export default AIProvider;