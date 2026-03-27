#!/usr/bin/env node
import JavaScriptObfuscator from 'javascript-obfuscator'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const targetFile = resolve(__dirname, '../runtime-dist/server.js')

const source = readFileSync(targetFile, 'utf-8')

const obfuscated = JavaScriptObfuscator.obfuscate(source, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.75,
  renameGlobals: false,
  selfDefending: true,
  debugProtection: false,
  disableConsoleOutput: false,
})

writeFileSync(targetFile, obfuscated.getObfuscatedCode())
console.log('✓ runtime-dist/server.js obfuscated')
