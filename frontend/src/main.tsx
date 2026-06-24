import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { UserManagement } from './pages/UserManagement'
import { useAuth } from './hooks/useAuth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on 4xx errors — these are user/validation errors, not transient failures
      retry: (failureCount, error) => {
        if (error instanceof Error && 'status' in error) {
          const status = (error as unknown as { status: number }).status
          if (status >= 400 && status < 500) return false
        }
        return failureCount < 2
      },
      staleTime: 30_000, // 30 seconds
    },
  },
})

/**
 * Redirects an already-authenticated user away from /login to the dashboard.
 * Must be rendered inside BrowserRouter so it can call useAuth and use Navigate.
 */
function LoginRoute() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <Login />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public route — redirect to dashboard if already logged in */}
      <Route path="/login" element={<LoginRoute />} />

      {/* Protected routes — ProtectedRoute inside each page handles auth redirects */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/users" element={<UserManagement />} />

      {/* Fallback: unknown paths redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
