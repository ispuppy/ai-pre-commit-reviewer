import { OpenAIProvider } from './adapters/openai.js';
import AIProvider from './base.js';

AIProvider.register('OPENAI', OpenAIProvider);

export default AIProvider;