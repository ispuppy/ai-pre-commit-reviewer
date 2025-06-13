const providers = {};

export default class AIProvider {
  constructor(config) {
    this.config = config;
  }

  /**
 * Create provider instance based on config
 * @param {object} config - Provider configuration
 * @returns {AIProvider} Provider instance
 */
  static create(config) {
    const providerType = config.providerType.toUpperCase();
    if (providers[providerType]) {
      return new providers[providerType](config);
    }

    if (providers[config.providerType]) {
      return new providers[config.providerType](config);
    }

    throw new Error(`Unsupported provider type: ${config.providerType}`);
  }

  /**
 * Register a new provider implementation
 * @param {string} name - Provider name (e.g. 'openai')
 * @param {class} providerClass - Provider implementation class
 */
  static register(providerType, providerClass) {
    if (!providerType || typeof providerType !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }
    if (!providerClass || typeof providerClass!=='function') {
     throw new Error('ProviderClass must be a class') 
    }
    providers[providerType] = providerClass;
  }

  getValueFromText(content) {
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
          try {
            const fixedJson = markdownJsonMatch[1].replace(/([\w\d]+):/g, '"$1":').replace(/'/g, '"'); // 修复JSON格式
            return JSON.parse(fixedJson);
          } catch (e) {
            throw new Error('Failed to parse JSON from response');
          }
        }
      }
    }
  }
}