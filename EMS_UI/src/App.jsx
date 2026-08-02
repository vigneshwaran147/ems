import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme'
import LayoutWrapper from './components/layout/LayoutWrapper'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// User pages
import DashboardPage from './pages/user/DashboardPage'
import ProfilePage from './pages/user/ProfilePage'
import UserExamReportPageEnhanced from './pages/user/UserExamReportPageEnhanced'

// Exam pages
import ExamApplicationPage from './pages/exam/ExamApplicationPage'
import ExamSchedulePage from './pages/exam/ExamSchedulePage'
import ExamPage from './pages/exam/ExamPage'
import PaymentPage from './pages/exam/PaymentPage'
import ResultPage from './pages/exam/ResultPage'

// Certificate pages
import CertificatePage from './pages/certificate/CertificatePage'

// Certification pages
import CertificationJourneyPage from './pages/certification/CertificationJourneyPage'

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminExamsPage from './pages/admin/AdminExamsPage'
import AdminQuestionsPage from './pages/admin/AdminQuestionsPage'
import AdminViolationsPage from './pages/admin/AdminViolationsPage'
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage'
import ExamReportPageEnhanced from './pages/admin/ExamReportPageEnhanced'

// Report pages
import ReportPage from './pages/report/ReportPage'
import UserReportPage from './pages/report/UserReportPage'

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN' || user?.roles?.includes('ADMIN')

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Exam route - no drawer/layout during exam */}
          <Route
            path="/exam/:applicationId"
            element={isAuthenticated ? <ExamPage /> : <Navigate to="/login" replace />}
          />

          {/* Protected User Routes */}
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <LayoutWrapper />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            {isAdmin ? (
              <>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="admin/users" element={<AdminUsersPage />} />
                <Route path="admin/exams" element={<AdminExamsPage />} />
                <Route path="admin/questions" element={<AdminQuestionsPage />} />
                <Route path="admin/payments" element={<AdminPaymentsPage />} />
                <Route path="admin/violations" element={<AdminViolationsPage />} />
                <Route path="admin/exam-reports" element={<ExamReportPageEnhanced />} />
                <Route path="admin/reports" element={<ReportPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </>
            ) : (
              <>
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="certifications" element={<CertificationJourneyPage />} />
                <Route path="exams" element={<ExamApplicationPage />} />
                <Route path="exam/schedule/:applicationId" element={<ExamSchedulePage />} />
                <Route path="exam/payment/:applicationId" element={<PaymentPage />} />
                <Route path="exam/result/:sessionId" element={<ResultPage />} />
                <Route path="certificates" element={<CertificatePage />} />
                <Route path="exam-reports" element={<UserExamReportPageEnhanced />} />
                <Route path="reports" element={<UserReportPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
