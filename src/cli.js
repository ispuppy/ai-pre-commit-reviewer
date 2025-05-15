#!/usr/bin/env node

import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

const gitHooksPath = path.join(process.cwd(), '.git', 'hooks')
const preCommitPath = path.join(gitHooksPath, 'pre-commit')

if (!fs.existsSync(gitHooksPath)) {
  fs.mkdirSync(gitHooksPath, { recursive: true });
}
const dirname = path.dirname(new URL(import.meta.url).pathname);
if(fs.existsSync(preCommitPath)) {
  const hookContent = fs.readFileSync(preCommitPath, 'utf8')
  if(hookContent.includes('ai-review')) {
    console.log(chalk.yellow('Hook already exists.'))
    process.exit(1)
  } else {
    const newHookContent = `${hookContent}\nnode ${path.posix.join(dirname, 'ai-review.js')}\n`;
    fs.writeFileSync(preCommitPath, newHookContent, 'utf8');
  }
} else {
  const hookContent = `#!/bin/sh
  node ${path.posix.join(dirname, 'ai-review.js')}
  `
  fs.writeFileSync(preCommitPath, hookContent, 'utf8')
}

fs.chmodSync(preCommitPath, '755')
console.log(chalk.green('Hook installed successfully.'))