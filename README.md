# AI Code Review

AI-powered git pre-commit hook for automated code review with customizable rules.

## Features

- 🔍 **Smart Diff Analysis**: Focuses on meaningful changes, ignores deletions
- ⚙️ **Customizable Rules**: Security, performance, style checks
- 📊 **Graded Feedback**: High/Medium/Low severity classification
- 🛠 **Easy Integration**: Simple npm install and config

## Installation

```bash
npm install --save-dev ai-pre-commit-reviewer
```

Add to git pre-commit hook:

```bash
npx add-ai-review
```

Or if you have husky installed:

```JSON
.package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npx ai-code-review-run"
    }
  }
}
```

## Configuration

### Option 1: package.json

```json
"aiCheckConfig": {
  "providerType": "openai",
  "apiKey": "your-api-key",
  "model": "gpt-4",
  "baseURL": "https://api.openai.com/v1",
  "maxChunkSize": 4000,
  "language": "english",
  "checkSecurity": true,
  "checkPerformance": true,
  "checkStyle": false,
  "enabledFileExtensions": ".html, .js, .jsx, .ts, .tsx, .vue"
}
```

### Option 2: .env file

```env
providerType=openai
baseURL=http://localhost:11434
model=gpt-4
maxChunkSize=4000
language=chinese
```

### Full Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| providerType | string | "openai" | AI provider type (openai) |
| apiKey | string | - | Provider API key |
| model | string | "gpt-3.5-turbo" | Model name |
| temperature | number | 0.2 | Controls randomness of AI output (higher = more random) |
| baseURL | string | "https://api.openai.com/v1" | API base URL |
| maxChunkSize | number | 12000 | Max diff chunk size (characters) |
| language | string | "chinese" | Output language |
| strict | boolean | true | Fail on API errors |
| showNormal | boolean | false | Show low/medium severity issues |
| checkSecurity | boolean | true | Enable security checks |
| checkPerformance | boolean | true | Enable performance checks |
| checkStyle | boolean | false | Enable style checks |
| enabledFileExtensions | string | '.html, .js, .jsx, .ts, .tsx, .vue' | File types to review |

## Review Process

1. **Diff Extraction**: Gets staged changes via `git diff --cached`
2. **File Filtering**: Only processes specified file extensions
3. **Chunk Splitting**: Splits large diffs into manageable chunks
4. **AI Analysis**: Sends chunks to configured AI provider
5. **Result Aggregation**: Combines results from all chunks
6. **Output**: Displays issues grouped by severity

## Example Output

```bash
Find 1 changed files...
Running code review with AI: The content will be reviewed in 1 sessions for better accuracy.

X Code review was not passed.Please fix the following high-level issues and try again.
- src/auth.js: [高] - 安全问题 - 硬编码的API密钥
  Suggested fix: 使用环境变量存储敏感信息
- src/db.js: [中] - 性能问题 - 缺少数据库连接池
  Suggested fix: 实现连接池减少连接开销

√ Code review passed.

```

## Supported Providers

### OpenAI

- Required: `apiKey`
- Optional: `model` (default: gpt-3.5-turbo), `baseURL` (default: https://api.openai.com/v1)
- Models: gpt-4, gpt-3.5-turbo

## Troubleshooting

### Hook not running

- Verify `.git/hooks/pre-commit` exists and is executable
- Check file contains `node path/to/ai-review.js`

### API Errors
- Verify API key and base URL
- Check network connectivity
- Set `strict: false` to allow commit on API errors

### No issues found
- Check `enabledFileExtensions` matches your file types
- Verify changes are staged (`git add`)

## License

MIT
