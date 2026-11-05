import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { applyTheme, getInitialTheme } from './theme/theme'
import './styles/global.css'

applyTheme(getInitialTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
