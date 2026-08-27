import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PipelinesApi } from '../api/pipelines';

export default function OverviewDashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['pipelines-overview-dashboard'],
    queryFn: PipelinesApi.overviewDashboard,
  });

  if (isLoading || !data) return <p>Carregando...</p>;

  const maxPipelineCount = Math.max(1, ...data.byPipeline.map((p) => p.cardCount));
  const maxAssigneeCount = Math.max(1, ...data.cardsByAssignee.map((a) => a.count));

  return (
    <div className="dashboard">
      <div className="stats">
        <div className="stat">
          <div className="stat-n">{data.totalCards}</div>
          <div className="stat-l">Cards em todos os pipelines</div>
        </div>
        <div className="stat">
          <div className="stat-n stat-n-danger">{data.totalOverdue}</div>
          <div className="stat-l">Cards com prazo vencido</div>
        </div>
        <div className="stat">
          <div className="stat-n stat-n-warning">{data.totalSlaBreached}</div>
          <div className="stat-l">Cards com SLA de fase estourado</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card dashboard-card-wide">
          <h3>Cards por pipeline</h3>
          <div className="bar-chart">
            {data.byPipeline.map((p) => (
              <div key={p.pipeline_id} className="bar-row">
                <Link to={`/pipelines/${p.pipeline_id}`} className="bar-label">
                  {p.pipeline_name}
                </Link>
                <div className="bar-track">
                  <div className="bar-fill bar-fill-accent" style={{ width: `${(p.cardCount / maxPipelineCount) * 100}%` }} />
                </div>
                <span className="bar-value">{p.cardCount}</span>
              </div>
            ))}
            {data.byPipeline.length === 0 && <p className="muted">Nenhum pipeline ainda.</p>}
          </div>
        </section>

        <section className="dashboard-card dashboard-card-wide">
          <h3>Produtividade por responsável</h3>
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
      </div>
    </div>
  );
}
