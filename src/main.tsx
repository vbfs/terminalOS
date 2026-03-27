// Polyfill crypto.randomUUID for HTTP (non-secure) contexts
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  (crypto as any).randomUUID = (): string => {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
      const n = +c
      return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16)
    })
  }
}

import './lib/api-bootstrap'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import '@xterm/xterm/css/xterm.css'
import './styles/global.css'

const root = document.getElementById('root')
if (root) {
  // StrictMode disabled: double-invocation disposes PTY terminals in development
  ReactDOM.createRoot(root).render(<App />)
}
