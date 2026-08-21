import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <span className="auth-brand-name">Pipelines</span>
          <span className="auth-brand-sub">PEREZ &amp; FILHO</span>
          <p className="auth-brand-tagline">
            Organize seus funis, automatize processos e acompanhe cada negócio do início ao fechamento.
          </p>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="auth-form-content">{children}</div>
      </div>
    </div>
  );
}
