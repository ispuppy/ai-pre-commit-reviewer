import axios from 'axios';
import AIProvider from '../base.js';
import AIError from '../../AIError.js';

export class OllamaProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.client = axios.create({
      baseURL: this.config.baseURL || 'http://localhost:11434',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3 * 60 * 1000
    });
  }

  /**
   * Analyze code with Ollama API
   * @param {string} prompt - Prompt for analysis
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Analysis results
   */
  async analyze(prompt) {
    try {
      const response = await this.client.post('/api/chat',{
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: prompt.systemPrompt
          },
          {
            role: 'user',
            content: prompt.userPrompt
          }
        ],
        stream: false
      });
      const results = this.parseResponse(response.data);
      return results;
    } catch (error) {
      throw new AIError(error.message, { type: 'API_ERROR'});
    }
  }

  /**
   * Parse Ollama API response into standard format
   * @param {object} response - Raw API response
   * @returns {object} Standardized analysis results
   */
  parseResponse(response) {
    const content = response.message?.content || '';
    return this.getValueFromText(content)
  }
}
