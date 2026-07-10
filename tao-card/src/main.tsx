import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { getUiLang } from './i18n';

// Force dark mode by default
document.documentElement.classList.add('dark');

const lang = getUiLang();
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
