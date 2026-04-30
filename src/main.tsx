import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/config.ts'
import './index.css'
import App from './App.tsx'
import { DemoApp } from './demo/DemoApp.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ToastProvider } from './components/Toast.tsx'

const isDemo = window.location.pathname.startsWith('/demo')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isDemo ? (
        <DemoApp />
      ) : (
        <ToastProvider>
          <App />
        </ToastProvider>
      )}
    </ErrorBoundary>
  </StrictMode>,
)
