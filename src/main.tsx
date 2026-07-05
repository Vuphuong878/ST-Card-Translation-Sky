import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppHub from './AppHub'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppHub />
  </StrictMode>,
)


