import axios from 'axios';
import AIProvider from '../base.js';
import AIError from '../../AIError.js';
import { v4 } from 'uuid';

export class OpenAIProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.client = axios.create({
      baseURL: this.config.baseURL || 'https://api.openai.com',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  get deepSeekConfig() {
    return {
      model: 'deepseek-chat',
      baseURL: 'https://api.deepseek.com',
    }
  }

  get LMStudioConfig() {
    return {
      model: 'qwen/qwq-32b',
      baseURL: 'http://127.0.0.1:1234',
    }
  }
  get openAiConfig() {
    return {
      model: 'gpt-3.5-turbo',
      baseURL: 'https://api.openai.com',
    }
  }
  getAIConfig(providerType) {
    switch (providerType) {
      case 'OPENAI':
        return this.openAiConfig;
      case 'DEEPSEEK':
        return this.deepSeekConfig;
      case 'LMSTUDIO':
        return this.LMStudioConfig;
      default:
        return this.openAiConfig;
    }
  }
  /**
   * Analyze code with OpenAI API
   * @param {string} prompt - Prompt for analysis
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Analysis results
   */
  async analyze(prompt) {
    try {
      const messages = [
        {
          role: 'system',
          content: prompt.systemPrompt
        },
        {
          role: 'user',
          content: prompt.userPrompt
        }
      ];
      const response = await this.client.post('/v1/chat/completions', {
        messages,
        model: this.config.model,
        temperature: this.config.temperature,
        stream: false,
        chatId: v4()
      });

      const results = this.parseResponse(response.data);
      return results;
    } catch (error) {
      throw new AIError(error.message, { type: 'API_ERROR'});
    }
  }

  /**
   * Parse OpenAI API response into standard format
   * @param {object} response - Raw API response
   * @returns {object} Standardized analysis results
   */
  parseResponse(response) {
    const content = response.choices[0]?.message?.content || '';
    return this.extractData(content)
  }
}
