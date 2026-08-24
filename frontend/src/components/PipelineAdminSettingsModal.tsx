import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { AuditLogEntry, Pipeline } from '../types';
import Icon from './Icon';

type Tab = 'settings' | 'audit' | 'info';

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

function describeActivity(entry: AuditLogEntry): string {
  const actor = entry.user_name ?? 'Uma automação';
  switch (entry.event_type) {
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

interface Props {
  pipelineId: number;
  pipeline: Pipeline;
  onClose: () => void;
}

export default function PipelineAdminSettingsModal({ pipelineId, pipeline, onClose }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('settings');
  const [name, setName] = useState(pipeline.name);
  const [description, setDescription] = useState(pipeline.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pipeline', pipelineId] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-admin-info', pipelineId] });
  };

  const saveMutation = useMutation({
    mutationFn: () => PipelinesApi.update(pipelineId, { name: name.trim(), description: description.trim() || null }),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível salvar');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => PipelinesApi.update(pipelineId, { archived: !pipeline.archived }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines-overview'] });
    },
  });

  const { data: auditLog, isLoading: loadingAudit } = useQuery({
    queryKey: ['pipeline-audit-log', pipelineId],
    queryFn: () => PipelinesApi.auditLog(pipelineId, { limit: 50 }),
    enabled: tab === 'audit',
  });

  const { data: adminInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ['pipeline-admin-info', pipelineId],
    queryFn: () => PipelinesApi.adminInfo(pipelineId),
    enabled: tab === 'info',
  });

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Administração do pipe</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          <div className="view-toggle" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={`view-toggle-tab ${tab === 'settings' ? 'view-toggle-tab-active' : ''}`}
              onClick={() => setTab('settings')}
            >
              Configurações
            </button>
            <button
              type="button"
              className={`view-toggle-tab ${tab === 'audit' ? 'view-toggle-tab-active' : ''}`}
              onClick={() => setTab('audit')}
            >
              Auditoria
            </button>
            <button
              type="button"
              className={`view-toggle-tab ${tab === 'info' ? 'view-toggle-tab-active' : ''}`}
              onClick={() => setTab('info')}
            >
              Informações
            </button>
          </div>

          {tab === 'settings' && (
            <>
              {error && <p className="error">{error}</p>}
              <form onSubmit={handleSave}>
                <label>
                  Nome do pipe
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  Descrição
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </label>
                <div className="page-header-actions">
                  <button type="submit" disabled={saveMutation.isPending}>
                    Salvar
                  </button>
                </div>
              </form>

              <hr className="div" />

              <div className="admin-only-setting">
                <strong>Zona de risco</strong>
                <p className="muted">
                  {pipeline.archived
                    ? 'Este pipeline está arquivado — some das listagens de todo mundo, mas nenhum dado foi apagado. Pode reativar quando quiser.'
                    : 'Arquivar remove este pipeline das listagens de todos os usuários (inclusive owners/managers). Não apaga nada, e pode ser revertido aqui mesmo.'}
                </p>
                <button type="button" className="danger-button" onClick={() => archiveMutation.mutate()}>
                  {pipeline.archived ? 'Reativar pipeline' : 'Arquivar pipeline'}
                </button>
              </div>
            </>
          )}

          {tab === 'audit' && (
            <>
              <p className="muted topic-intro">
                Últimos eventos registrados em qualquer card deste pipeline (criação, movimentação, campos,
                comentários, anexos, responsáveis).
              </p>
              {loadingAudit && <p className="muted">Carregando...</p>}
              <ul className="timeline-list">
                {(auditLog ?? []).map((entry) => (
                  <li key={entry.id} className="timeline-item">
                    <span className={`timeline-icon timeline-icon-${entry.event_type}`} aria-hidden>
                      {activityIcon(entry.event_type)}
                    </span>
                    <div className="timeline-content">
                      <span>
                        {describeActivity(entry)} — <strong>{entry.card_title}</strong>
                      </span>
                      <span className="muted">{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {!loadingAudit && (auditLog ?? []).length === 0 && <p className="muted">Sem atividade registrada.</p>}
            </>
          )}

          {tab === 'info' && (
            <>
              {loadingInfo && <p className="muted">Carregando...</p>}
              {adminInfo && (
                <>
                  <div className="admin-stat-grid">
                    <div className="admin-stat">
                      <span className="admin-stat-value">{adminInfo.counts.cards}</span>
                      <span className="admin-stat-label">Cards</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{adminInfo.counts.phases}</span>
                      <span className="admin-stat-label">Fases</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{adminInfo.counts.customFields}</span>
                      <span className="admin-stat-label">Campos customizados</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{adminInfo.counts.automations}</span>
                      <span className="admin-stat-label">Automações</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{adminInfo.counts.labels}</span>
                      <span className="admin-stat-label">Etiquetas</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{adminInfo.counts.members}</span>
                      <span className="admin-stat-label">Membros</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{adminInfo.counts.emailTemplates}</span>
                      <span className="admin-stat-label">Templates de e-mail</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-value">{adminInfo.counts.connections}</span>
                      <span className="admin-stat-label">Conexões com outros pipes</span>
                    </div>
                  </div>

                  <hr className="div" />

                  <ul className="admin-info-list">
                    <li>
                      <span className="muted">Criado por</span>
                      <span>{adminInfo.created_by_name ?? '—'}</span>
                    </li>
                    <li>
                      <span className="muted">Criado em</span>
                      <span>{new Date(adminInfo.created_at).toLocaleString('pt-BR')}</span>
                    </li>
                    <li>
                      <span className="muted">ID interno</span>
                      <span>#{adminInfo.id}</span>
                    </li>
                    <li>
                      <span className="muted">Status</span>
                      <span className={`status-badge ${adminInfo.archived ? 'status-badge-inactive' : 'status-badge-active'}`}>
                        {adminInfo.archived ? 'Arquivado' : 'Ativo'}
                      </span>
                    </li>
                    <li>
                      <span className="muted">Formulário público</span>
                      <span
                        className={`status-badge ${adminInfo.public_form_enabled ? 'status-badge-active' : 'status-badge-inactive'}`}
                      >
                        {adminInfo.public_form_enabled ? 'Ativado' : 'Desativado'}
                      </span>
                    </li>
                    {adminInfo.pipefy_pipe_id && (
                      <li>
                        <span className="muted">Origem</span>
                        <span>Importado do Pipefy (ID {adminInfo.pipefy_pipe_id})</span>
                      </li>
                    )}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
