import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { AttendanceProvider } from './context/AttendanceContext.tsx'

import { TimetableProvider } from './context/TimetableContext.tsx'
import { NotificationProvider } from './context/NotificationContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TimetableProvider>
          <AttendanceProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </AttendanceProvider>
        </TimetableProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
