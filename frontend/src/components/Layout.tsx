import { Link, NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { PipelinesApi } from '../api/pipelines';
import { DatabasesApi } from '../api/databases';
import Avatar from './Avatar';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, logout } = useAuth();
  const { data: pipelines } = useQuery({ queryKey: ['pipelines'], queryFn: PipelinesApi.list });
  const { data: databases } = useQuery({ queryKey: ['databases'], queryFn: DatabasesApi.list });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          Pipelines <span className="brand-sub">PEREZ &amp; FILHO</span>
        </Link>

        <div className="sidebar-section">
          <span className="sidebar-section-label">Pipelines</span>
          <nav className="sidebar-nav">
            {pipelines?.map((p) => (
              <NavLink
                key={p.id}
                to={`/pipelines/${p.id}`}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-link-dot" aria-hidden />
                {p.name}
              </NavLink>
            ))}
            {pipelines?.length === 0 && <span className="sidebar-empty">Nenhum pipeline ainda</span>}
          </nav>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-label">Databases</span>
          <nav className="sidebar-nav">
            {databases?.map((d) => (
              <NavLink
                key={d.id}
                to={`/databases/${d.id}`}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-link-dot" aria-hidden />
                {d.name}
              </NavLink>
            ))}
            {databases?.length === 0 && <span className="sidebar-empty">Nenhum database ainda</span>}
          </nav>
        </div>

        {user?.role === 'admin' && (
          <div className="sidebar-section">
            <span className="sidebar-section-label">Administração</span>
            <nav className="sidebar-nav">
              <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                Usuários
              </NavLink>
              <NavLink
                to="/admin/integrations"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Integrações
              </NavLink>
            </nav>
          </div>
        )}
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <NavLink to="/" end className="topbar-home-link">
            Todos os pipelines
          </NavLink>
          <GlobalSearch />
          <div className="header-right">
            <NotificationBell />
            <Link to="/profile" className="topbar-profile-link">
              {user && <Avatar name={user.name} size={28} />}
              <span>{user?.name}</span>
            </Link>
            <button className="secondary-button" onClick={() => logout()}>
              Sair
            </button>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
