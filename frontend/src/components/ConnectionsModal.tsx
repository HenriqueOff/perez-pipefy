import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import Icon from './Icon';

interface Props {
  pipelineId: number;
  canManage: boolean;
  onClose: () => void;
}

export default function ConnectionsModal({ pipelineId, canManage, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: connections } = useQuery({
    queryKey: ['pipeline-connections', pipelineId],
    queryFn: () => PipelinesApi.listPipelineConnections(pipelineId),
  });
  const { data: pipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => PipelinesApi.list(),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [targetPipelineId, setTargetPipelineId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pipeline-connections', pipelineId] });

  const pipelineName = (id: number) => pipelines?.find((p) => p.id === id)?.name ?? `Pipeline #${id}`;

  const createMutation = useMutation({
    mutationFn: () =>
      PipelinesApi.createPipelineConnection(pipelineId, { name: name.trim(), target_pipeline_id: Number(targetPipelineId) }),
    onSuccess: () => {
      invalidate();
      setName('');
      setTargetPipelineId('');
      setShowForm(false);
      setError(null);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível criar a conexão');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (connectionId: number) => PipelinesApi.deletePipelineConnection(pipelineId, connectionId),
    onSuccess: invalidate,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !targetPipelineId) return;
    createMutation.mutate();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Conexões</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}
          <p className="muted">
            Conexões deste pipeline pra cards de outra pipeline. Cards deste pipeline podem se conectar (anexar) a cards
            da pipeline alvo escolhida abaixo.
          </p>

          <ul className="automation-list">
            {connections?.asOwner.map((c) => (
              <li key={c.id} className="automation-row">
                <div className="automation-info">
                  <span className="member-name">{c.name}</span>
                  <span className="muted">→ {pipelineName(c.target_pipeline_id)}</span>
                </div>
                {canManage && (
                  <button
                    type="button"
                    className="icon-button"
                    title="Excluir conexão"
                    onClick={() => {
                      if (confirm(`Excluir a conexão "${c.name}"?`)) deleteMutation.mutate(c.id);
                    }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </li>
            ))}
            {connections?.asOwner.length === 0 && <p className="muted">Nenhuma conexão criada ainda.</p>}
          </ul>

          {connections && connections.asTarget.length > 0 && (
            <>
              <hr className="div" />
              <p className="muted">Outras pipelines que se conectam a esta:</p>
              <ul className="automation-list">
                {connections.asTarget.map((c) => (
                  <li key={c.id} className="automation-row">
                    <div className="automation-info">
                      <span className="member-name">{c.name}</span>
                      <span className="muted">{pipelineName(c.owner_pipeline_id)} → aqui</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {canManage && (
            <>
              <button type="button" className="secondary-button" onClick={() => setShowForm((v) => !v)}>
                {showForm ? 'Cancelar' : '+ Nova conexão'}
              </button>
              {showForm && (
                <form className="automation-form" onSubmit={handleSubmit}>
                  <label className="field-input">
                    Nome da conexão
                    <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Imóvel" />
                  </label>
                  <label className="field-input">
                    Pipeline alvo
                    <select value={targetPipelineId} onChange={(e) => setTargetPipelineId(e.target.value)}>
                      <option value="">Selecione...</option>
                      {pipelines
                        ?.filter((p) => p.id !== pipelineId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
                    Criar conexão
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
