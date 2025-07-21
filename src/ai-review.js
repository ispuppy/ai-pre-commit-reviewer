#!/usr/bin/env node

import { execSync } from 'child_process' 
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import CodeReviewer from './core.js'
import AIError from './AIError.js'

const defaultConfig = {
  providerType: 'OPENAI',
  model: '',
  baseURL: '',

  maxChunkSize: 12000,
  temperature: 0.2,
  language: 'chinese',
  strict: true,
  showNormal: false,
  correctedResult: true,
  customPrompts: '',
  enabledFileExtensions: '.html, .js, .jsx, .ts, .tsx, .vue',

  checkSecurity: true,
  checkPerformance: true,
  checkStyle: false
}

function loadConfig() {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel').toString().trim()
    const envPath = path.join(gitRoot, '.env')
    const pkgPath = path.join(gitRoot, 'package.json')
    if(fs.existsSync(envPath)) {
      const envConent = fs.readFileSync(envPath, 'utf8')
      const config = {}
      envConent.split('\n').forEach(line => {
        const [key, value] = line.split('=').map(str => str.trim())
        if(key && value) {
          config[key] = value.toLowerCase() === 'true' ? true :
                       value.toLowerCase() === 'false' ? false :
                       value
        }
      })
      return config
    }

    if(fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      if(pkg.aiCheckConfig) {
        return pkg.aiCheckConfig
      }
    }

    throw new Error('No ai-pre-commit-reviewer configuration found in .env or package.json')

  } catch (err) {
    handleError('Configuration error:', err.message)
  }
}

function getStagedChanges(fileExtensions) {
  try {
    const changedFiles = execSync('git diff --cached --name-only').toString().trim().split('\n')
    if (!changedFiles) {
      console.log(chalk.yellow('No staged changes found.'))
      process.exit(1)
    }
    // 过滤指定扩展名的文件
    const filteredFiles = changedFiles.filter(file => {
      const ext = path.extname(file).toLowerCase()
      return fileExtensions.includes(ext)
    })

    if (filteredFiles.length === 0) {
      console.log(chalk.yellow(`No changes found in specified file types: ${fileExtensions.join(', ')}`))
      process.exit(0)
    }
    return filteredFiles
  } catch (err) {
    handleError('Error checking staged changes:', err.message)
  }
}

function getDiffContent() {
  try {
    const diff = execSync("git diff --cached").toString().trim();
    
    if (!diff) {
      console.log(chalk.yellow('No diff content found for files:'), filteredFiles.join(', '));
      process.exit(0);
    }
    return diff;
  } catch (err) {
    handleError('Error getting diff:', err.message);
  }
}

function handleError (text, message) {
  console.error(chalk.red(text), message)
  process.exit(1)
}

function handleReviewResult(result, completeConfig) {
  let exitCode = 0
  if(result.result === 'NO') {
    console.log(chalk.redBright('X Code review was not passed.Please fix the following high-level issues and try again.'))
    exitCode = 1
  } else {
    console.log(chalk.green('√ Code review passed.'))
    exitCode = 0 
  } 
  const printList =  result.list.filter(issue => {
    if(issue.severity === 'high') {
      return true
    }
    return completeConfig.showNormal
  })
  if(printList.length) {
    console.log('\n' + chalk.gray('-'.repeat(50)) + '\n');
    printList.forEach(issue => {
      const color = issue.severity === 'high' ? chalk.red : issue.severity === 'medium' ? chalk.yellow : chalk.green
      console.log(color(`- ${issue.location}(${issue.perspective}/${issue.severity}): ${issue.description}\n`) + chalk.blue(`- suggestion: ${issue.suggestion}\n`))
      
    })
    if(result.errors.length) {
      console.log(chalk.redBright('some content failed to be reviewed, please check the error message above.'))
      result.errors.forEach(error => {
        console.log(chalk.redBright(error)) 
      })
    }
  } else if(result.errors.length) {
    console.log(chalk.redBright(result.errors[0]))
  }
  process.exit(exitCode)
}

function getFileExtensions(config) {
  try {
    const extensions = config.enabledFileExtensions.split(',').map(ext => ext.trim().toLowerCase())
    return extensions 
  } catch (err) {
    handleError('Error getting file extensions:', err.message)
  }
}
async function main() {
  const config = loadConfig()
  const completeConfig = Object.assign({}, defaultConfig, config);
  const fileExtensions = getFileExtensions(completeConfig)
  const changesFiles = getStagedChanges(fileExtensions)
  console.log(`Find ${chalk.cyan(changesFiles.length)} changed files...`)
  const diffConent = getDiffContent()
  try {
    const reviewer = new CodeReviewer(completeConfig)
    const result = await reviewer.review(diffConent, fileExtensions)
    handleReviewResult(result, completeConfig)
  } catch (err) {
    if(err instanceof AIError && err.options.type === 'API_ERROR' && !completeConfig.strict) { 
      console.log(chalk.red('Code review failed.Please check your AI server and try again.'))
      console.log(chalk.red('Error message:'), err.message)
      process.exit(0)
    }
    handleError('Code review error:', err.message)
  }
}

main()
