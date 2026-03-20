import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import 'xterm/css/xterm.css'
import './styles/global.css'

const root = document.getElementById('root')
if (root) {
  // StrictMode disabled: double-invocation disposes PTY terminals in development
  ReactDOM.createRoot(root).render(<App />)
}
