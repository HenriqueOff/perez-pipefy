import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PipelinesPage from './pages/PipelinesPage';
import PipelineBoardPage from './pages/PipelineBoardPage';
import DatabaseBoardPage from './pages/DatabaseBoardPage';
import ProfilePage from './pages/ProfilePage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminIntegrationsPage from './pages/AdminIntegrationsPage';
import PublicFormPage from './pages/PublicFormPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/Layout';
import ForcePasswordChangeGate from './components/ForcePasswordChangeGate';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="centered">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <ForcePasswordChangeGate />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/forms/:token" element={<PublicFormPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<PipelinesPage />} />
        <Route path="pipelines/:pipelineId" element={<PipelineBoardPage />} />
        <Route path="databases/:databaseId" element={<DatabaseBoardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/integrations"
          element={
            <AdminRoute>
              <AdminIntegrationsPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
