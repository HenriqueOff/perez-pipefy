import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PipelinesApi } from '../api/pipelines';
import { useAuth } from '../context/AuthContext';
import { PipelineOverviewItem, RecentActivityItem } from '../types';

function hashHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function activityIcon(eventType: string): string {
  switch (eventType) {
    case 'created':
      return '＋';
    case 'moved':
      return '→';
    case 'field_updated':
      return '✎';
    case 'assigned':
      return '☺';
    case 'comment_added':
      return '💬';
    case 'attachment_added':
      return '📎';
    default:
      return '•';
  }
}

function describeActivity(a: RecentActivityItem): string {
  const actor = a.user_name ?? 'Uma automação';
  switch (a.event_type) {
    case 'created':
      return `${actor} criou o card`;
    case 'moved':
      return `${actor} moveu o card de fase`;
    case 'field_updated':
      return `${actor} atualizou um campo`;
    case 'assigned':
      return `${actor} alterou os responsáveis`;
    case 'comment_added':
      return `${actor} comentou`;
    case 'attachment_added':
      return `${actor} anexou um arquivo`;
    default:
      return `${actor} atualizou o card`;
  }
}

export default function PipelinesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: overview,
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ['pipelines-overview'], queryFn: PipelinesApi.overview });
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input: { name: string }) => PipelinesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines-overview'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      setName('');
      setCreating(false);
    },
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim() });
  }

  const pipelines: PipelineOverviewItem[] = overview?.pipelines ?? [];
  const recentActivity: RecentActivityItem[] = overview?.recentActivity ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Olá{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="muted">Seus pipelines e o que aconteceu recentemente.</p>
        </div>
        <button onClick={() => setCreating((v) => !v)}>{creating ? 'Cancelar' : 'Novo pipeline'}</button>
      </div>

      {creating && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input
            placeholder="Nome do pipeline (ex: Captação de imóveis)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={createMutation.isPending}>
            Criar
          </button>
        </form>
      )}

      {isLoading && <p>Carregando...</p>}
      {isError && (
        <p className="error">
          Não foi possível carregar seus pipelines.{' '}
          <button className="link-button" onClick={() => refetch()}>
            Tentar de novo
          </button>
        </p>
      )}

      <div className="pipeline-grid">
        {pipelines.map((pipeline) => {
          const hue = hashHue(pipeline.name);
          return (
            <Link
              to={`/pipelines/${pipeline.id}`}
              key={pipeline.id}
              className="pipeline-card"
              style={{ borderTopColor: `hsl(${hue}, 65%, 50%)` }}
            >
              <div className="pipeline-card-header">
                <span className="pipeline-card-icon" style={{ background: `hsl(${hue}, 65%, 50%)` }}>
                  {pipeline.name.charAt(0).toUpperCase()}
                </span>
                <h3>{pipeline.name}</h3>
              </div>
              {pipeline.description && <p>{pipeline.description}</p>}
              <div className="pipeline-card-badges">
                <span className="status-badge">{pipeline.cardCount} card{pipeline.cardCount === 1 ? '' : 's'}</span>
                {pipeline.overdueCount > 0 && (
                  <span className="status-badge status-badge-warning">{pipeline.overdueCount} atrasado{pipeline.overdueCount === 1 ? '' : 's'}</span>
                )}
                {pipeline.slaBreachedCount > 0 && (
                  <span className="status-badge status-badge-danger">{pipeline.slaBreachedCount} SLA estourado{pipeline.slaBreachedCount === 1 ? '' : 's'}</span>
                )}
              </div>
            </Link>
          );
        })}
        {!isLoading && !isError && pipelines.length === 0 && <p>Nenhum pipeline ainda. Crie o primeiro acima.</p>}
      </div>

      {recentActivity.length > 0 && (
        <>
          <h2 className="section-title">Atividade recente</h2>
          <ul className="timeline-list">
            {recentActivity.map((a) => (
              <li key={a.id} className="timeline-item">
                <span className={`timeline-icon timeline-icon-${a.event_type}`} aria-hidden>
                  {activityIcon(a.event_type)}
                </span>
                <div className="timeline-content">
                  <span>
                    {describeActivity(a)} —{' '}
                    <Link to={`/pipelines/${a.pipeline_id}?card=${a.card_id}`}>{a.card_title}</Link>{' '}
                    <span className="muted">({a.pipeline_name})</span>
                  </span>
                  <span className="muted">{new Date(a.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
