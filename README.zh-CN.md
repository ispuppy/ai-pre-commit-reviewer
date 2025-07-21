# AI 代码审查 [English Md](README.md)

基于人工智能的git pre-commit钩子，提供自动化代码审查功能，支持自定义规则。

## 功能特性

- 🤖 **多模型支持**: 支持OpenAI、Deepseek、Ollama和LM Studio
- 🔍 **智能差异分析**: 聚焦有意义的变更，忽略删除内容
- ⚙️ **可定制规则**: 安全检查、性能优化、代码风格
- ✏️ **自定义提示**: 完全自定义审查标准和提示词
- 📊 **分级反馈**: 高/中/低严重性分类
- 🛠 **简单集成**: 通过npm安装和配置

## 安装

```bash
npm install --save-dev ai-pre-commit-reviewer
```

添加到git pre-commit钩子:

```bash
npx add-ai-review
```

如果已安装husky:

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

## 配置

### 方式1: package.json

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

### 方式2: .env文件

```env
providerType=openai
baseURL=http://localhost:11434
model=gpt-4
maxChunkSize=4000
language=chinese
```

### 完整配置选项

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| providerType | string | "openai" | AI提供商类型(openai、deepseek或ollama、LMStudio) |
| apiKey | string | - | 提供商API密钥(Ollama和LM Studio不需要) |
| model | string | "gpt-3.5-turbo" | 模型名称 |
| temperature | number | 0.2 | 控制AI输出的随机性(值越高越随机) |
| baseURL | string | `"https://api.openai.com"` (OpenAI)<br>`"https://api.deepseek.com"` (Deepseek)<br>`"http://localhost:11434"` (Ollama)<br>`"http://127.0.0.1:1234"` (LM Studio)| API基础URL |
| maxChunkSize | number | 12000 | 最大差异块大小(字符数) |
| customPrompts | string | '' |自定义提示模板。当提供时，将完全替换默认的安全(checkSecurity)、性能(checkPerformance)和风格(checkStyle)检查。 |
| language | string | "chinese" | 输出语言 |
| strict | boolean | true | 调用API时如果发生错误导致pre-commit结果不通过 |
| correctedResult | boolean | true | 当AI返回结果中的result字段与列表中特定检测项结果不匹配时，系统会根据实际检测问题自动修正最终判定结果。 |
| showNormal | boolean | false | 显示低/中严重性问题 |
| checkSecurity | boolean | true | 启用安全检查 |
| checkPerformance | boolean | true | 启用性能检查 |
| checkStyle | boolean | false | 启用风格检查 |
| enabledFileExtensions | string | '.html, .js, .jsx, .ts, .tsx, .vue' | 需要审查的文件类型 |

## 审查流程

1. **差异提取**: 通过`git diff --cached`获取暂存变更
2. **文件过滤**: 仅处理指定扩展名的文件
3. **分块处理**: 将大差异分割为可管理的块
4. **AI分析**: 将块发送到配置的AI提供商
5. **结果聚合**: 合并所有块的结果
6. **输出**: 按严重性分组显示问题

## 示例输出

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

## 支持的提供商

### OpenAI

- 必填: `apiKey`
- 可选: `model` (默认: gpt-3.5-turbo), `baseURL` (默认: https://api.openai.com)
- 模型: gpt-4, gpt-3.5-turbo
  
### Deepseek

- 必填: `apiKey`
- 可选: `model` (默认: deepseek-chat), `baseURL` (默认: https://api.deepseek.com)
- 模型: deepseek-chat、deepseek-reasoner

### Ollama (本地AI模型)

- 必填: 无(本地运行)
- 可选: `model` (默认: gpt-3.5-turbo), `baseURL` (默认: http://localhost:11434)
- 设置:
  1. 安装Ollama: https://ollama.ai/
  2. 下载模型: `ollama pull <模型名称>`
  3. 常用模型: llama2, codellama, mistral
- 示例.env配置:
  ```env
  providerType=ollama
  model=codellama
  baseURL=http://localhost:11434
  ```

### LMStudio (本地AI模型)

- 必填: 无(本地运行)
- 可选: `model` (默认: qwen/qwq-32b), `baseURL` (默认: http://127.0.0.1:1234)

## 故障排除

### 钩子未运行

- 检查`.git/hooks/pre-commit`是否存在且可执行
- 确认文件包含`node path/to/ai-review.js`

### API错误

- 验证API密钥和基础URL(Ollama不需要)
- 检查网络连接
- 设置`strict: false`允许API错误时提交

### 未发现变更

- 检查`enabledFileExtensions`是否匹配您的文件类型
- 确认变更已暂存(`git add`)

### The returned data format does not conform to the specification

模型未能生成有效的JSON输出，表明其遵循指令的能力可能有限。请确保模型能够生成结构化数据。

## 许可证

ISC
