import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { Automation, AutomationActionType, AutomationTriggerType, PipelineDetail } from '../types';
import Icon from './Icon';

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  card_created_in_phase: 'Quando um card é criado em uma fase',
  card_moved_to_phase: 'Quando um card entra em uma fase',
  field_updated: 'Quando um campo é preenchido',
};

const ACTION_LABELS: Record<AutomationActionType, string> = {
  move_to_phase: 'Mover o card para a fase',
  assign_user: 'Atribuir o responsável',
  add_label: 'Adicionar a etiqueta',
  remove_label: 'Remover a etiqueta',
};

interface Props {
  pipelineId: number;
  pipeline: PipelineDetail;
  canManage: boolean;
  onClose: () => void;
}

export default function AutomationsModal({ pipelineId, pipeline, canManage, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: automations } = useQuery({
    queryKey: ['automations', pipelineId],
    queryFn: () => PipelinesApi.listAutomations(pipelineId),
  });
  const { data: labels } = useQuery({
    queryKey: ['labels', pipelineId],
    queryFn: () => PipelinesApi.listLabels(pipelineId),
  });

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFields = pipeline.phases.flatMap((p) => p.customFields.map((f) => ({ ...f, phaseName: p.name })));
  const phaseName = (id?: number | null) => pipeline.phases.find((p) => p.id === id)?.name ?? '?';
  const memberName = (id?: number | null) => pipeline.members.find((m) => m.user_id === id)?.name ?? '?';
  const labelName = (id?: number | null) => labels?.find((l) => l.id === id)?.name ?? '?';

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automations', pipelineId] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      PipelinesApi.updateAutomation(pipelineId, id, { active }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => PipelinesApi.deleteAutomation(pipelineId, id),
    onSuccess: invalidate,
  });

  function describeTrigger(a: Automation): string {
    const cfg = a.trigger_config ?? {};
    switch (a.trigger_type) {
      case 'card_created_in_phase':
        return cfg.phase_id ? `Card criado em "${phaseName(Number(cfg.phase_id))}"` : 'Card criado em qualquer fase';
      case 'card_moved_to_phase':
        return `Card entra em "${phaseName(Number(cfg.phase_id))}"`;
      case 'field_updated': {
        const field = allFields.find((f) => f.id === Number(cfg.field_id));
        return cfg.value != null
          ? `Campo "${field?.label ?? '?'}" = "${cfg.value}"`
          : `Campo "${field?.label ?? '?'}" é alterado`;
      }
      default:
        return a.trigger_type;
    }
  }

  function describeAction(a: Automation): string {
    const cfg = a.action_config ?? {};
    switch (a.action_type) {
      case 'move_to_phase':
        return `mover para "${phaseName(Number(cfg.phase_id))}"`;
      case 'assign_user':
        return `atribuir a ${memberName(Number(cfg.user_id))}`;
      case 'add_label':
        return `adicionar a etiqueta "${labelName(Number(cfg.label_id))}"`;
      case 'remove_label':
        return `remover a etiqueta "${labelName(Number(cfg.label_id))}"`;
      default:
        return a.action_type;
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Automações</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}

          <ul className="automation-list">
            {automations?.map((a) => (
              <li key={a.id} className={`automation-row ${a.active ? '' : 'automation-row-inactive'}`}>
                <div className="automation-info">
                  <span className="member-name">{a.name}</span>
                  <span className="muted">
                    Quando: {describeTrigger(a)} → Então: {describeAction(a)}
                  </span>
                </div>
                {canManage && (
                  <div className="page-header-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => toggleMutation.mutate({ id: a.id, active: !a.active })}
                    >
                      {a.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Excluir automação"
                      onClick={() => {
                        if (confirm(`Excluir a automação "${a.name}"?`)) deleteMutation.mutate(a.id);
                      }}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                )}
              </li>
            ))}
            {automations?.length === 0 && <p className="muted">Nenhuma automação criada ainda.</p>}
          </ul>

          {canManage && (
            <>
              <button type="button" className="secondary-button" onClick={() => setShowForm((v) => !v)}>
                {showForm ? 'Cancelar' : '+ Nova automação'}
              </button>
              {showForm && (
                <AutomationForm
                  pipelineId={pipelineId}
                  pipeline={pipeline}
                  labels={labels ?? []}
                  allFields={allFields}
                  onDone={() => {
                    setShowForm(false);
                    invalidate();
                  }}
                  onError={setError}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AutomationForm({
  pipelineId,
  pipeline,
  labels,
  allFields,
  onDone,
  onError,
}: {
  pipelineId: number;
  pipeline: PipelineDetail;
  labels: { id: number; name: string }[];
  allFields: { id: number; label: string; phaseName: string }[];
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>('card_created_in_phase');
  const [triggerPhaseId, setTriggerPhaseId] = useState('');
  const [triggerFieldId, setTriggerFieldId] = useState('');
  const [triggerValue, setTriggerValue] = useState('');
  const [actionType, setActionType] = useState<AutomationActionType>('add_label');
  const [actionPhaseId, setActionPhaseId] = useState('');
  const [actionUserId, setActionUserId] = useState('');
  const [actionLabelId, setActionLabelId] = useState('');

  const createMutation = useMutation({
    mutationFn: () => {
      const trigger_config: Record<string, unknown> = {};
      if (triggerType === 'card_created_in_phase' && triggerPhaseId) trigger_config.phase_id = Number(triggerPhaseId);
      if (triggerType === 'card_moved_to_phase') trigger_config.phase_id = Number(triggerPhaseId);
      if (triggerType === 'field_updated') {
        trigger_config.field_id = Number(triggerFieldId);
        if (triggerValue.trim()) trigger_config.value = triggerValue.trim();
      }

      const action_config: Record<string, unknown> = {};
      if (actionType === 'move_to_phase') action_config.phase_id = Number(actionPhaseId);
      if (actionType === 'assign_user') action_config.user_id = Number(actionUserId);
      if (actionType === 'add_label' || actionType === 'remove_label') action_config.label_id = Number(actionLabelId);

      return PipelinesApi.createAutomation(pipelineId, {
        name: name.trim(),
        trigger_type: triggerType,
        trigger_config,
        action_type: actionType,
        action_config,
      });
    },
    onSuccess: onDone,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      onError(message ?? 'Não foi possível criar a automação');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (triggerType === 'card_moved_to_phase' && !triggerPhaseId) return;
    if (triggerType === 'field_updated' && !triggerFieldId) return;
    if (actionType === 'move_to_phase' && !actionPhaseId) return;
    if (actionType === 'assign_user' && !actionUserId) return;
    if ((actionType === 'add_label' || actionType === 'remove_label') && !actionLabelId) return;
    createMutation.mutate();
  }

  return (
    <form className="automation-form" onSubmit={handleSubmit}>
      <label className="field-input">
        Nome da automação
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>

      <label className="field-input">
        Quando (gatilho)
        <select value={triggerType} onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}>
          {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {(triggerType === 'card_created_in_phase' || triggerType === 'card_moved_to_phase') && (
        <label className="field-input">
          Fase {triggerType === 'card_created_in_phase' && '(opcional: qualquer fase se vazio)'}
          <select value={triggerPhaseId} onChange={(e) => setTriggerPhaseId(e.target.value)}>
            <option value="">Selecione...</option>
            {pipeline.phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {triggerType === 'field_updated' && (
        <>
          <label className="field-input">
            Campo
            <select value={triggerFieldId} onChange={(e) => setTriggerFieldId(e.target.value)}>
              <option value="">Selecione...</option>
              {allFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} ({f.phaseName})
                </option>
              ))}
            </select>
          </label>
          <label className="field-input">
            Valor (opcional: qualquer alteração se vazio)
            <input value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} />
          </label>
        </>
      )}

      <hr className="div" />

      <label className="field-input">
        Então (ação)
        <select value={actionType} onChange={(e) => setActionType(e.target.value as AutomationActionType)}>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {actionType === 'move_to_phase' && (
        <label className="field-input">
          Fase de destino
          <select value={actionPhaseId} onChange={(e) => setActionPhaseId(e.target.value)}>
            <option value="">Selecione...</option>
            {pipeline.phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {actionType === 'assign_user' && (
        <label className="field-input">
          Usuário
          <select value={actionUserId} onChange={(e) => setActionUserId(e.target.value)}>
            <option value="">Selecione...</option>
            {pipeline.members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {(actionType === 'add_label' || actionType === 'remove_label') && (
        <label className="field-input">
          Etiqueta
          <select value={actionLabelId} onChange={(e) => setActionLabelId(e.target.value)}>
            <option value="">Selecione...</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="submit" disabled={createMutation.isPending}>
        Criar automação
      </button>
    </form>
  );
}
