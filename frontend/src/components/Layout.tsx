import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { PipelinesApi } from '../api/pipelines';
import { DatabasesApi } from '../api/databases';
import Avatar from './Avatar';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import Icon from './Icon';

export default function Layout() {
  const { user, logout } = useAuth();
  const { data: pipelines } = useQuery({ queryKey: ['pipelines'], queryFn: PipelinesApi.list });
  const { data: databases } = useQuery({ queryKey: ['databases'], queryFn: DatabasesApi.list });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Fecha o menu ao navegar — sem isso, o drawer ficaria aberto por cima da página nova
  // depois de tocar num link, já que a troca de rota não desmonta o Layout.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {mobileNavOpen && <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
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
          <button
            type="button"
            className="icon-button sidebar-toggle"
            aria-label="Abrir menu"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <Icon name="menu" size={20} />
          </button>
          <NavLink to="/" end className="topbar-home-link">
            Todos os pipelines
          </NavLink>
          <GlobalSearch />
          <div className="header-right">
            <NotificationBell />
            <Link to="/profile" className="topbar-profile-link">
              {user && <Avatar name={user.name} size={28} />}
              <span className="topbar-profile-name">{user?.name}</span>
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
