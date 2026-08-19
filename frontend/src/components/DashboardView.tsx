import { useQuery } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';

function formatHours(hours: number | null): string {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dias`;
}

export default function DashboardView({ pipelineId }: { pipelineId: number }) {
  const { data } = useQuery({
    queryKey: ['dashboard', pipelineId],
    queryFn: () => PipelinesApi.dashboard(pipelineId),
  });

  if (!data) return <p>Carregando...</p>;

  const maxPhaseCount = Math.max(1, ...data.cardsByPhase.map((p) => p.count));
  const maxAssigneeCount = Math.max(1, ...data.cardsByAssignee.map((a) => a.count));

  return (
    <div className="dashboard">
      <div className="stats">
        <div className="stat">
          <div className="stat-n">{data.totalCards}</div>
          <div className="stat-l">Cards no pipeline</div>
        </div>
        <div className="stat">
          <div className="stat-n stat-n-danger">{data.overdueCount}</div>
          <div className="stat-l">Cards com prazo vencido</div>
        </div>
        <div className="stat">
          <div className="stat-n stat-n-warning">{data.slaBreachedCount}</div>
          <div className="stat-l">Cards com SLA de fase estourado</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <h3>Cards por fase</h3>
          <div className="bar-chart">
            {data.cardsByPhase.map((p) => (
              <div key={p.phase_id} className="bar-row">
                <span className="bar-label">{p.phase_name}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(p.count / maxPhaseCount) * 100}%`, background: p.color ?? undefined }}
                  />
                </div>
                <span className="bar-value">{p.count}</span>
              </div>
            ))}
            {data.cardsByPhase.length === 0 && <p className="muted">Sem fases ainda.</p>}
          </div>
        </section>

        <section className="dashboard-card">
          <h3>Cards por responsável</h3>
          <div className="bar-chart">
            {data.cardsByAssignee.map((a) => (
              <div key={a.user_id ?? 'unassigned'} className="bar-row">
                <span className="bar-label">{a.name}</span>
                <div className="bar-track">
                  <div className="bar-fill bar-fill-accent" style={{ width: `${(a.count / maxAssigneeCount) * 100}%` }} />
                </div>
                <span className="bar-value">{a.count}</span>
              </div>
            ))}
            {data.cardsByAssignee.length === 0 && <p className="muted">Nenhum card ainda.</p>}
          </div>
        </section>

        <section className="dashboard-card dashboard-card-wide">
          <h3>Tempo médio por fase</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fase</th>
                  <th>Tempo médio</th>
                  <th>Transições concluídas</th>
                </tr>
              </thead>
              <tbody>
                {data.avgTimeInPhase.map((p) => (
                  <tr key={p.phase_id}>
                    <td>{p.phase_name}</td>
                    <td className="mono">{formatHours(p.avg_hours)}</td>
                    <td className="muted">{p.sample_size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
