#!/usr/bin/env node
'use strict'

const args = process.argv.slice(2)

if (!args.includes('--run')) {
  console.log(`
  terminalOS CLI

  Usage:
    npx terminalOS --run            Start the terminal in your browser (default port 7513)
    npx terminalOS --run --port N   Use a custom port
  `)
  process.exit(0)
}

const portFlag = args.indexOf('--port')
const port = portFlag !== -1 ? parseInt(args[portFlag + 1], 10) : 7513

if (isNaN(port) || port < 1 || port > 65535) {
  console.error('  Invalid port number. Use --port <1-65535>')
  process.exit(1)
}

// The runtime server is compiled to runtime-dist/server.js
const { startServer } = require('../runtime-dist/server')
startServer(port)
