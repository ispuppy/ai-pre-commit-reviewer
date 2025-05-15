export default class AIError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AIError';
    this.options = options;
  }
}