import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PipelinesPage from './pages/PipelinesPage';
import PipelineBoardPage from './pages/PipelineBoardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminIntegrationsPage from './pages/AdminIntegrationsPage';
import PublicFormPage from './pages/PublicFormPage';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="centered">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
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
      </Route>
    </Routes>
  );
}
