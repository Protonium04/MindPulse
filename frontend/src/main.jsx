import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#13172a',
            color: '#e8eaf6',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
