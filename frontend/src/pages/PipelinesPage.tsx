import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PipelinesApi } from '../api/pipelines';
import { DatabasesApi } from '../api/databases';
import { useAuth } from '../context/AuthContext';
import { Database, PipelineOverviewItem, RecentActivityItem } from '../types';
import Tooltip from '../components/Tooltip';

/** Paleta fixa inspirada nas cores dos tiles de pipe do Pipefy (fundo pastel + ícone saturado
 * da mesma família), escolhida por hash do nome pra manter a cor estável entre carregamentos. */
const TILE_PALETTE = [
  { bg: '#EDE9FE', icon: '#6D28D9' },
  { bg: '#FCE7F3', icon: '#BE185D' },
  { bg: '#DCFCE7', icon: '#15803D' },
  { bg: '#FEF9C3', icon: '#A16207' },
  { bg: '#DBEAFE', icon: '#1D4ED8' },
  { bg: '#FFEDD5', icon: '#C2410C' },
  { bg: '#CCFBF1', icon: '#0F766E' },
  { bg: '#F3F4F6', icon: '#4B5563' },
];

function paletteFor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return TILE_PALETTE[Math.abs(hash) % TILE_PALETTE.length];
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

type ContentTab = 'pipelines' | 'databases';

export default function PipelinesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ContentTab>('pipelines');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Olá{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="muted">
            {tab === 'pipelines' ? 'Seus pipelines e o que aconteceu recentemente.' : 'Seus databases.'}
          </p>
        </div>
      </div>

      <div className="view-toggle" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`view-toggle-tab ${tab === 'pipelines' ? 'view-toggle-tab-active' : ''}`}
          onClick={() => setTab('pipelines')}
        >
          Pipelines
        </button>
        <button
          type="button"
          className={`view-toggle-tab ${tab === 'databases' ? 'view-toggle-tab-active' : ''}`}
          onClick={() => setTab('databases')}
        >
          Databases
        </button>
      </div>

      {tab === 'pipelines' ? <PipelinesTab /> : <DatabasesTab />}
    </div>
  );
}

function PipelinesTab() {
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
    <>
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
          <button type="button" className="secondary-button" onClick={() => setCreating(false)}>
            Cancelar
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
        <button type="button" className="pipeline-card pipeline-card-create" onClick={() => setCreating((v) => !v)}>
          <span className="pipeline-card-create-icon">+</span>
          Criar pipeline
        </button>
        {pipelines.map((pipeline) => {
          const palette = paletteFor(pipeline.name);
          const alerts = pipeline.overdueCount + pipeline.slaBreachedCount;
          return (
            <Link
              to={`/pipelines/${pipeline.id}`}
              key={pipeline.id}
              className="pipeline-card"
              style={{ background: palette.bg }}
            >
              {alerts > 0 && (
                <Tooltip
                  label={[
                    pipeline.overdueCount > 0 ? `${pipeline.overdueCount} atrasado${pipeline.overdueCount === 1 ? '' : 's'}` : null,
                    pipeline.slaBreachedCount > 0 ? `${pipeline.slaBreachedCount} SLA estourado${pipeline.slaBreachedCount === 1 ? '' : 's'}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                >
                  <span className="pipeline-card-alert">{alerts}</span>
                </Tooltip>
              )}
              <span className="pipeline-card-icon" style={{ background: palette.icon }}>
                {pipeline.name.charAt(0).toUpperCase()}
              </span>
              <h3>{pipeline.name}</h3>
              <span className="pipeline-card-count">{pipeline.cardCount} card{pipeline.cardCount === 1 ? '' : 's'}</span>
            </Link>
          );
        })}
        {!isLoading && !isError && pipelines.length === 0 && (
          <p>Nenhum pipeline ainda — peça pra um dono/gerente te adicionar, ou crie o primeiro acima.</p>
        )}
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
    </>
  );
}

const NO_CATEGORY = 'Sem setor';

function groupByCategory(list: Database[]): [string, Database[]][] {
  const groups = new Map<string, Database[]>();
  for (const database of list) {
    const category = database.category?.trim() || NO_CATEGORY;
    const group = groups.get(category) ?? [];
    group.push(database);
    groups.set(category, group);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === NO_CATEGORY) return 1;
    if (b === NO_CATEGORY) return -1;
    return a.localeCompare(b, 'pt-BR');
  });
}

function DatabasesTab() {
  const queryClient = useQueryClient();
  const { data: databases, isLoading, isError, refetch } = useQuery({
    queryKey: ['databases'],
    queryFn: DatabasesApi.list,
  });
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [creating, setCreating] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input: { name: string; category?: string }) => DatabasesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      setName('');
      setCategory('');
      setCreating(false);
    },
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), category: category.trim() || undefined });
  }

  const list: Database[] = databases ?? [];
  const existingCategories = [...new Set(list.map((d) => d.category?.trim()).filter(Boolean))] as string[];
  const groups = groupByCategory(list);

  return (
    <>
      {creating && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input
            placeholder="Nome do database (ex: Locatários)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            placeholder="Setor (ex: Pessoas)"
            list="database-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="database-categories">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button type="submit" disabled={createMutation.isPending}>
            Criar
          </button>
          <button type="button" className="secondary-button" onClick={() => setCreating(false)}>
            Cancelar
          </button>
        </form>
      )}

      {isLoading && <p>Carregando...</p>}
      {isError && (
        <p className="error">
          Não foi possível carregar seus databases.{' '}
          <button className="link-button" onClick={() => refetch()}>
            Tentar de novo
          </button>
        </p>
      )}

      {!creating && (
        <button type="button" className="secondary-button" style={{ marginBottom: 20 }} onClick={() => setCreating(true)}>
          + Criar database
        </button>
      )}

      {groups.map(([groupName, groupDatabases]) => (
        <section key={groupName} className="database-section">
          <h2 className="database-section-title">{groupName}</h2>
          <div className="database-grid">
            {groupDatabases.map((database) => {
              const palette = paletteFor(database.name);
              return (
                <Link to={`/databases/${database.id}`} key={database.id} className="database-tile">
                  <span className="database-tile-icon" style={{ background: palette.icon }}>
                    {database.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="database-tile-name">{database.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {!isLoading && !isError && list.length === 0 && (
        <p>Nenhum database ainda — peça pra um dono/gerente te adicionar, ou crie o primeiro acima.</p>
      )}
    </>
  );
}
