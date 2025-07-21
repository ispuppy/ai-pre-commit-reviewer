import AIProvider from './providers/index.js'
import prompts from './prompts.js'
import path from 'path'
import chalk from 'chalk'
import AIError from './AIError.js'

export default class CodeReviewer {
  constructor(config) {
    this.validateConfig(config)
    this.provider = AIProvider.create(config)
    this.config = config
  }

  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object')
    }
    const whiteList = ['LMSTUDIO', 'OLLAMA']
    const providerType = config.providerType.toUpperCase();
    if(!config.apiKey && !whiteList.includes(providerType)) {
      throw new Error('apiKey is required in config')
    } 
  }

  async review(diff, allowedExtensions) {
    const result = await this.analyzeInChunks(diff, allowedExtensions)
    return result
  }

  async analyzeInChunks(diff, allowedExtensions) {
    const chunks = this.splitDiffIntoChunks(diff, allowedExtensions)
    console.log(chalk.green(`Running code review with AI: The content will be reviewed in ${chalk.cyan(chunks.length)} sessions for better accuracy.`))
    const output = await Promise.all(chunks.map(async chunk => {
      try {
        const prompt = this.generateReviewPrompt(chunk)
        const result = await this.provider.analyze(prompt)
        if(this.config.correctedResult) {
          if(result.list?.every(item => item.severity !== 'high')) {
            result.result = 'YES'
          } else {
            result.result = 'NO'
          }
        }
        return result
      } catch (error) {
        return {error: error}
      }
    }))
    return this.combineResults(output)
  }
  combineResults(results) {
    const success = results.every(item => {
      if (item.result === 'YES') {
        return true
      }
      if(this.config.strict) {
        return false
      }
      return item.error instanceof AIError
    })
    const weight = {
      high: 3,
      medium: 2,
      low: 1
    }
    const list = results.flatMap(item => item.list || []).sort((a,b) => {
      return weight[b.severity] - weight[a.severity]
    })
    const errors = results.map(item => item.error).filter(error => error)
    return {result: success ? 'YES' : 'NO', list, errors}
  }
  /**
   * Split git diff into manageable chunks
   * @param {string} diff - Raw git diff output
   * @returns {Array} Array of diff chunks
   */
  splitDiffIntoChunks(diff, allowedExtensions) {
    const fileSections = diff.split(/(?=^diff --git)/m)
    const filteredSections = fileSections.filter(section => {
      const fileMatch = section.match(/^diff --git a\/(.+?) b\/(.+?)$/m)
      if (!fileMatch) return false
      const fileName = fileMatch[1]
      const ext = path.extname(fileName).toLowerCase()

      return allowedExtensions.includes(ext)
    }).map(section => {
       // 过滤删除的代码行
       const lines = section.split('\n')
       const filteredLines = lines.filter(line => {
         return !line.startsWith('-') && !line.trim().startsWith('//')
       })
       return filteredLines.join('\n')
    })
    const splitSections = this.getChunksByLength(filteredSections)
    const groups = this.normalSplicing(splitSections)
    return groups.map(group => {
      const content = group.map(item => item.content).join('\n')
      return content
    })
  }

  normalSplicing(splitSections) {
    const result = []
    const sortedSections = splitSections.sort((a, b) => a.length - b.length)
    const maxChunkSize = this.config.maxChunkSize
    let currentChunk = []
    let currentSize = 0
    for (const section of sortedSections) {
      if (currentSize + section.length > maxChunkSize) {
        result.push(currentChunk)
        currentChunk = []
        currentSize = 0
      }
      currentChunk.push(section)
      currentSize += section.length
    }
    if (currentChunk.length > 0) {
      result.push(currentChunk)
    }
    return result
  }
  backtrack(splitSections) {
    const maxChunkSize = this.config.maxChunkSize
    let minGroup = Infinity
    let result = []
    const dfs = (index, groups) => {
      if (index === splitSections.length) {
        const total = groups.reduce((sum, group) => sum + group.length, 0)
        if (groups.length < minGroup && total === splitSections.length) {
          minGroup = groups.length
          result = groups.slice()
        }
        return
      }
      const current = splitSections[index]
      for (let i = 0; i < groups.length; i++) {
        const sum = groups[i].reduce((a, b) => a + b.length, 0)
        if (sum + current.length <= maxChunkSize) {
          groups[i].push(current)
          dfs(index + 1, groups)
          groups[i].pop()
        }
      }
      if (groups.length < minGroup) {
        groups.push([current])
        dfs(index + 1, groups)
        groups.pop() 
      }
    }
    dfs(0, [])
    return result
  }
  getChunksByLength(fileSections) {
    const processed = []
    const maxChunkSize = this.config.maxChunkSize

    for (const section of fileSections) {
      const fileMatch = section.match(/^diff --git a\/(.+?) b\/(.+?)$/m)
      if (!fileMatch) continue
      
      const fileName = fileMatch[1]

      const fileContent = section.trim()
      const length = fileContent.length
      if (fileContent.length < maxChunkSize) {
        processed.push({length, content: fileContent})
      } else {
        const fileChunks = this.splitFileDiff(fileName, fileContent, maxChunkSize)
        processed.push(...fileChunks)
      }
    }

    return processed
  }
  /**
   * Split a single file diff into chunks
   * @param {string} fileDiff - Diff content for one file
   * @param {number} maxSize - Maximum chunk size
   * @returns {Array} Array of diff chunks
   */
  splitFileDiff(fileName, fileDiff, maxSize) {
    const chunks = []
    let currentChunk = ''
    const head = `diff --git a/${fileName} b/${fileName}\n`
    const hunks = fileDiff.split(/(?=^@@ -)/m)
    for (const hunk of hunks) {
      const pureHunk = hunk.trim()
      if (currentChunk.length + pureHunk.length > maxSize && currentChunk.length > 0) {
        chunks.push({length: currentChunk.length, content: currentChunk})
        currentChunk = head
      }
      let location = 0
      while ((location + maxSize) < pureHunk.length) {
        const hunkChunk = pureHunk.slice(location, location + maxSize)
        const content = location === 0 ? hunkChunk : `${head}\n${hunkChunk}`
        location += maxSize
        chunks.push({length: content, content})
      }
      currentChunk += pureHunk.slice(location, pureHunk.length) + '\n' 
    }
    
    if (currentChunk.length > 0) {
      chunks.push({length: currentChunk.length, content: currentChunk})
    }
    
    return chunks
  }
  generateReviewPrompt(diff) {
    const { language } = this.config
    let systemPrompt = `${prompts.system}\n`
    let userPrompt = `${prompts.instruction}:\n\n<git_diff>\n${diff}\n</git_diff>\n\n`
    const { reviewContentPrompt, analyzeList} = this.getReviewContentPrompt()
    systemPrompt += reviewContentPrompt
    systemPrompt += `\n${prompts.response.requirement}\n`
    Object.entries(prompts.response.fields).forEach(([key, description]) => {
      systemPrompt += `\n${key}: ${description}\n`
      if (key === 'list') {
        Object.entries(prompts.response.itemFields).forEach(([field, fieldDescription]) => {
          let text = fieldDescription
          if (field === 'perspective') {
            text = analyzeList.join('/')
          }
          text = text.replace('${language}', language)
          systemPrompt += `\n- ${field}: ${text}\n`
        }) 
      }
    })
    return { systemPrompt, userPrompt }
  }

  getReviewContentPrompt() {
    const { checkSecurity, checkPerformance, checkStyle, customPrompts} = this.config
    if (customPrompts) {
      return {
        reviewContentPrompt: customPrompts,
        analyzeList: ['customized']
      }
    }
    let ouput = ''
    const analyzeList = [
      checkSecurity && 'security',
      checkPerformance && 'performance',
      checkStyle && 'style'
    ].filter(Boolean);
    if (analyzeList.length === 0) {
      analyzeList.push('general') 
    }
    analyzeList.forEach((item) => {
      ouput += `${prompts.rules[item].name}\n`
      prompts.rules[item].checks.forEach((check) => {
        ouput += `\n- ${check}`
      })
      ouput += `\n${prompts.rules[item].severity_guidance}\n`
    })
    return {
      reviewContentPrompt: ouput,
      analyzeList
    }
  }
}
