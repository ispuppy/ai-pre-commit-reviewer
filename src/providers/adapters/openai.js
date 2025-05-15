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
    try {
      // 尝试直接解析JSON
      return JSON.parse(content);
    } catch (e) {
      // 如果是Markdown格式，尝试提取JSON代码块
      const markdownJsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (markdownJsonMatch) {
        try {
          return JSON.parse(markdownJsonMatch[1]);
        } catch (e) {
          throw new Error('Failed to parse JSON from response');
        }
      }
    }
  }
}
