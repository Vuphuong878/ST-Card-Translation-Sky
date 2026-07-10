import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppHub from './AppHub'
import { getUiLang, loadI18n } from './i18n'

// Nạp ĐÚNG 1 bộ chuỗi (Vite tách chunk riêng cho từng ngôn ngữ) rồi mới render —
// useT()/useUi() là hàm đồng bộ nên bộ chuỗi phải sẵn sàng trước lần render đầu.
const lang = getUiLang()
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang

loadI18n(lang).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppHub />
    </StrictMode>,
  )
})
