import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { Automation, AutomationActionType, AutomationTriggerType, EmailTemplate, PipelineDetail } from '../types';
import Icon from './Icon';

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  card_created_in_phase: 'Quando um card é criado em uma fase',
  card_moved_to_phase: 'Quando um card entra em uma fase',
  card_left_phase: 'Quando um card sai de uma fase',
  field_updated: 'Quando um campo é preenchido',
  sla_breached: 'Quando o SLA da fase é estourado',
  recurring_activity: 'Em intervalos recorrentes',
  all_connected_cards_in_phase: 'Quando todos os cards conectados entram numa fase',
};

const ACTION_LABELS: Record<AutomationActionType, string> = {
  move_to_phase: 'Mover o card para a fase',
  assign_user: 'Atribuir o responsável',
  add_label: 'Adicionar a etiqueta',
  remove_label: 'Remover a etiqueta',
  update_field: 'Atualizar um campo',
  create_card: 'Criar um novo card',
  distribute_assignees: 'Distribuir entre responsáveis (rodízio)',
  send_email_template: 'Enviar um e-mail (modelo)',
  apply_sla_rule: 'Aplicar uma regra de SLA no card',
  apply_formula: 'Aplicar uma fórmula num campo',
  http_request: 'Fazer uma requisição HTTP',
  create_connected_card: 'Criar um card conectado',
  move_connected_cards: 'Mover os cards conectados',
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
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates', pipelineId],
    queryFn: () => PipelinesApi.listEmailTemplates(pipelineId),
  });
  const { data: connections } = useQuery({
    queryKey: ['pipeline-connections', pipelineId],
    queryFn: () => PipelinesApi.listPipelineConnections(pipelineId),
  });

  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showContractTemplates, setShowContractTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFields = pipeline.phases.flatMap((p) => p.customFields.map((f) => ({ ...f, phaseName: p.name })));
  const allConnections = [
    ...(connections?.asOwner.map((c) => ({ ...c, side: 'owner' as const })) ?? []),
    ...(connections?.asTarget.map((c) => ({ ...c, side: 'target' as const })) ?? []),
  ];
  const phaseName = (id?: number | null) => pipeline.phases.find((p) => p.id === id)?.name ?? '?';
  const memberName = (id?: number | null) => pipeline.members.find((m) => m.user_id === id)?.name ?? '?';
  const labelName = (id?: number | null) => labels?.find((l) => l.id === id)?.name ?? '?';
  const fieldLabel = (id?: number | null) => allFields.find((f) => f.id === id)?.label ?? '?';
  const templateName = (id?: number | null) => emailTemplates?.find((t) => t.id === id)?.name ?? '?';
  const connectionName = (id?: number | null) => allConnections.find((c) => c.id === id)?.name ?? '?';

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
      case 'card_left_phase':
        return `Card sai de "${phaseName(Number(cfg.phase_id))}"`;
      case 'field_updated': {
        const field = allFields.find((f) => f.id === Number(cfg.field_id));
        return cfg.value != null
          ? `Campo "${field?.label ?? '?'}" = "${cfg.value}"`
          : `Campo "${field?.label ?? '?'}" é alterado`;
      }
      case 'sla_breached':
        return cfg.phase_id ? `SLA estourado em "${phaseName(Number(cfg.phase_id))}"` : 'SLA estourado em qualquer fase';
      case 'recurring_activity':
        return `A cada ${cfg.interval_hours}h${cfg.phase_id ? ` em "${phaseName(Number(cfg.phase_id))}"` : ''}`;
      case 'all_connected_cards_in_phase':
        return `Todos os cards conectados via "${connectionName(Number(cfg.pipeline_connection_id))}" atingem a fase #${cfg.phase_id}`;
      default:
        return a.trigger_type;
    }
  }

  function describeAction(a: Automation): string {
    const cfg = a.action_config ?? {};
    switch (a.action_type) {
      case 'move_to_phase':
        return `mover para "${phaseName(Number(cfg.phase_id))}"`;
      case 'assign_user': {
        let desc = `atribuir a ${memberName(Number(cfg.user_id))}`;
        if (cfg.due_date) desc += ` (prazo ${cfg.due_date})`;
        return desc;
      }
      case 'add_label':
        return `adicionar a etiqueta "${labelName(Number(cfg.label_id))}"`;
      case 'remove_label':
        return `remover a etiqueta "${labelName(Number(cfg.label_id))}"`;
      case 'update_field':
        return `atualizar "${fieldLabel(Number(cfg.field_id))}" para "${cfg.value}"`;
      case 'create_card':
        return `criar card "${cfg.title}" em "${phaseName(Number(cfg.phase_id))}"`;
      case 'distribute_assignees': {
        const ids = Array.isArray(cfg.user_ids) ? (cfg.user_ids as number[]) : [];
        return `distribuir entre ${ids.map((id) => memberName(id)).join(', ') || '?'}`;
      }
      case 'send_email_template':
        return `enviar e-mail "${templateName(Number(cfg.template_id))}"`;
      case 'apply_sla_rule':
        return `aplicar SLA de ${cfg.sla_hours}h neste card`;
      case 'apply_formula':
        return `gravar "${cfg.formula}" em "${fieldLabel(Number(cfg.target_field_id))}"`;
      case 'http_request': {
        const dest = cfg.response_field_id ? `, resposta em "${fieldLabel(Number(cfg.response_field_id))}"` : '';
        return `${cfg.method ?? 'GET'} ${cfg.url}${dest}`;
      }
      case 'create_connected_card':
        return `criar card conectado via "${connectionName(Number(cfg.pipeline_connection_id))}"`;
      case 'move_connected_cards':
        return `mover cards conectados via "${connectionName(Number(cfg.pipeline_connection_id))}" pra fase #${cfg.phase_id}`;
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
              <div className="page-header-actions">
                <button type="button" className="secondary-button" onClick={() => setShowForm((v) => !v)}>
                  {showForm ? 'Cancelar' : '+ Nova automação'}
                </button>
                <button type="button" className="secondary-button" onClick={() => setShowTemplates((v) => !v)}>
                  {showTemplates ? 'Fechar modelos de e-mail' : 'Modelos de e-mail'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowContractTemplates((v) => !v)}
                >
                  {showContractTemplates ? 'Fechar modelos de contrato' : 'Modelos de contrato'}
                </button>
              </div>
              {showTemplates && <EmailTemplatesSection pipelineId={pipelineId} />}
              {showContractTemplates && <ContractTemplatesSection pipelineId={pipelineId} />}
              {showForm && (
                <AutomationForm
                  pipelineId={pipelineId}
                  pipeline={pipeline}
                  labels={labels ?? []}
                  allFields={allFields}
                  emailTemplates={emailTemplates ?? []}
                  connections={allConnections}
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

function EmailTemplatesSection({ pipelineId }: { pipelineId: number }) {
  const queryClient = useQueryClient();
  const { data: templates } = useQuery({
    queryKey: ['email-templates', pipelineId],
    queryFn: () => PipelinesApi.listEmailTemplates(pipelineId),
  });
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['email-templates', pipelineId] });

  const createMutation = useMutation({
    mutationFn: () => PipelinesApi.createEmailTemplate(pipelineId, { name, subject, body_html: bodyHtml }),
    onSuccess: () => {
      invalidate();
      setName('');
      setSubject('');
      setBodyHtml('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => PipelinesApi.deleteEmailTemplate(pipelineId, id),
    onSuccess: invalidate,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) return;
    createMutation.mutate();
  }

  return (
    <div className="automation-form">
      <ul className="automation-list">
        {templates?.map((t) => (
          <li key={t.id} className="automation-row">
            <div className="automation-info">
              <span className="member-name">{t.name}</span>
              <span className="muted">{t.subject}</span>
            </div>
            <button
              type="button"
              className="icon-button"
              title="Excluir modelo"
              onClick={() => {
                if (confirm(`Excluir o modelo "${t.name}"?`)) deleteMutation.mutate(t.id);
              }}
            >
              <Icon name="x" size={14} />
            </button>
          </li>
        ))}
        {templates?.length === 0 && <p className="muted">Nenhum modelo de e-mail criado ainda.</p>}
      </ul>

      <form onSubmit={handleSubmit} className="field-grid">
        <label className="field-input">
          Nome do modelo
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field-input">
          Assunto
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="field-input">
          Corpo (HTML — use {'{{title}}'} e {'{{campo.<key>}}'} para interpolar)
          <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={4} />
        </label>
        <button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
          Criar modelo
        </button>
      </form>
    </div>
  );
}

function ContractTemplatesSection({ pipelineId }: { pipelineId: number }) {
  const queryClient = useQueryClient();
  const { data: templates } = useQuery({
    queryKey: ['contract-templates', pipelineId],
    queryFn: () => PipelinesApi.listContractTemplates(pipelineId),
  });
  const [name, setName] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contract-templates', pipelineId] });

  const createMutation = useMutation({
    mutationFn: () => PipelinesApi.createContractTemplate(pipelineId, { name, body_html: bodyHtml }),
    onSuccess: () => {
      invalidate();
      setName('');
      setBodyHtml('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => PipelinesApi.deleteContractTemplate(pipelineId, id),
    onSuccess: invalidate,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !bodyHtml.trim()) return;
    createMutation.mutate();
  }

  return (
    <div className="automation-form">
      <ul className="automation-list">
        {templates?.map((t) => (
          <li key={t.id} className="automation-row">
            <div className="automation-info">
              <span className="member-name">{t.name}</span>
            </div>
            <button
              type="button"
              className="icon-button"
              title="Excluir modelo"
              onClick={() => {
                if (confirm(`Excluir o modelo "${t.name}"?`)) deleteMutation.mutate(t.id);
              }}
            >
              <Icon name="x" size={14} />
            </button>
          </li>
        ))}
        {templates?.length === 0 && <p className="muted">Nenhum modelo de contrato criado ainda.</p>}
      </ul>

      <form onSubmit={handleSubmit} className="field-grid">
        <label className="field-input">
          Nome do modelo
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field-input">
          Corpo (HTML — use {'{{title}}'} e {'{{campo.<key>}}'} para interpolar)
          <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={8} />
        </label>
        <button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
          Criar modelo
        </button>
      </form>
    </div>
  );
}

function AutomationForm({
  pipelineId,
  pipeline,
  labels,
  allFields,
  emailTemplates,
  connections,
  onDone,
  onError,
}: {
  pipelineId: number;
  pipeline: PipelineDetail;
  labels: { id: number; name: string }[];
  allFields: { id: number; label: string; phaseName: string; type: string }[];
  emailTemplates: EmailTemplate[];
  connections: { id: number; name: string; owner_pipeline_id: number; target_pipeline_id: number; side: 'owner' | 'target' }[];
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
  const [actionUserIds, setActionUserIds] = useState<number[]>([]);
  const [actionLabelId, setActionLabelId] = useState('');
  const [actionFieldId, setActionFieldId] = useState('');
  const [actionFieldValue, setActionFieldValue] = useState('');
  const [actionDueDate, setActionDueDate] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [actionCardTitle, setActionCardTitle] = useState('');
  const [actionTemplateId, setActionTemplateId] = useState('');
  const [actionRecipientType, setActionRecipientType] = useState('assignees');
  const [actionRecipientEmail, setActionRecipientEmail] = useState('');
  const [actionRecipientFieldId, setActionRecipientFieldId] = useState('');
  const [triggerIntervalHours, setTriggerIntervalHours] = useState('');
  const [actionSlaHours, setActionSlaHours] = useState('');
  const [actionFormulaTargetFieldId, setActionFormulaTargetFieldId] = useState('');
  const [actionFormula, setActionFormula] = useState('');
  const [actionHttpMethod, setActionHttpMethod] = useState('GET');
  const [actionHttpUrl, setActionHttpUrl] = useState('');
  const [actionHttpHeaders, setActionHttpHeaders] = useState('');
  const [actionHttpBody, setActionHttpBody] = useState('');
  const [actionHttpResponseFieldId, setActionHttpResponseFieldId] = useState('');
  const [triggerConnectionId, setTriggerConnectionId] = useState('');
  const [actionConnectionId, setActionConnectionId] = useState('');

  const targetConnections = connections.filter((c) => c.side === 'target');
  const selectedTriggerConnection = connections.find((c) => c.id === Number(triggerConnectionId));
  const selectedActionConnection = connections.find((c) => c.id === Number(actionConnectionId));

  const otherPipelineIdForTrigger = selectedTriggerConnection?.owner_pipeline_id ?? null;
  const otherPipelineIdForAction = selectedActionConnection
    ? selectedActionConnection.side === 'owner'
      ? selectedActionConnection.target_pipeline_id
      : selectedActionConnection.owner_pipeline_id
    : null;
  const otherPipelineId =
    triggerType === 'all_connected_cards_in_phase' ? otherPipelineIdForTrigger : otherPipelineIdForAction;

  const { data: otherPipelineDetail } = useQuery({
    queryKey: ['pipeline', otherPipelineId],
    queryFn: () => PipelinesApi.detail(otherPipelineId!),
    enabled: otherPipelineId != null,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const trigger_config: Record<string, unknown> = {};
      if (triggerType === 'card_created_in_phase' && triggerPhaseId) trigger_config.phase_id = Number(triggerPhaseId);
      if (triggerType === 'card_moved_to_phase' || triggerType === 'card_left_phase')
        trigger_config.phase_id = Number(triggerPhaseId);
      if (triggerType === 'sla_breached' && triggerPhaseId) trigger_config.phase_id = Number(triggerPhaseId);
      if (triggerType === 'field_updated') {
        trigger_config.field_id = Number(triggerFieldId);
        if (triggerValue.trim()) trigger_config.value = triggerValue.trim();
      }
      if (triggerType === 'recurring_activity') {
        trigger_config.interval_hours = Number(triggerIntervalHours);
        if (triggerPhaseId) trigger_config.phase_id = Number(triggerPhaseId);
      }
      if (triggerType === 'all_connected_cards_in_phase') {
        trigger_config.pipeline_connection_id = Number(triggerConnectionId);
        trigger_config.phase_id = Number(triggerPhaseId);
      }

      const action_config: Record<string, unknown> = {};
      if (actionType === 'move_to_phase') action_config.phase_id = Number(actionPhaseId);
      if (actionType === 'assign_user') {
        action_config.user_id = Number(actionUserId);
        if (actionDueDate) action_config.due_date = actionDueDate;
        if (actionNote.trim()) action_config.note = actionNote.trim();
      }
      if (actionType === 'add_label' || actionType === 'remove_label') action_config.label_id = Number(actionLabelId);
      if (actionType === 'update_field') {
        action_config.field_id = Number(actionFieldId);
        action_config.value = actionFieldValue;
      }
      if (actionType === 'create_card') {
        action_config.phase_id = Number(actionPhaseId);
        action_config.title = actionCardTitle;
      }
      if (actionType === 'distribute_assignees') {
        action_config.user_ids = actionUserIds;
        if (actionDueDate) action_config.due_date = actionDueDate;
        if (actionNote.trim()) action_config.note = actionNote.trim();
      }
      if (actionType === 'send_email_template') {
        action_config.template_id = Number(actionTemplateId);
        action_config.recipient_type = actionRecipientType;
        if (actionRecipientType === 'static') action_config.email = actionRecipientEmail;
        if (actionRecipientType === 'custom_field') action_config.field_id = Number(actionRecipientFieldId);
      }
      if (actionType === 'apply_sla_rule') {
        action_config.sla_hours = Number(actionSlaHours);
      }
      if (actionType === 'apply_formula') {
        action_config.target_field_id = Number(actionFormulaTargetFieldId);
        action_config.formula = actionFormula.trim();
      }
      if (actionType === 'http_request') {
        action_config.method = actionHttpMethod;
        action_config.url = actionHttpUrl.trim();
        const headers: Record<string, string> = {};
        for (const line of actionHttpHeaders.split('\n')) {
          const idx = line.indexOf(':');
          if (idx <= 0) continue;
          headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
        if (Object.keys(headers).length > 0) action_config.headers = headers;
        if (actionHttpMethod !== 'GET' && actionHttpBody.trim()) action_config.body = actionHttpBody.trim();
        if (actionHttpResponseFieldId) action_config.response_field_id = Number(actionHttpResponseFieldId);
      }
      if (actionType === 'create_connected_card') {
        action_config.pipeline_connection_id = Number(actionConnectionId);
        action_config.from_side = selectedActionConnection?.side;
        action_config.phase_id = Number(actionPhaseId);
        action_config.title = actionCardTitle;
      }
      if (actionType === 'move_connected_cards') {
        action_config.pipeline_connection_id = Number(actionConnectionId);
        action_config.from_side = selectedActionConnection?.side;
        action_config.phase_id = Number(actionPhaseId);
      }

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
    if ((triggerType === 'card_moved_to_phase' || triggerType === 'card_left_phase') && !triggerPhaseId) return;
    if (triggerType === 'field_updated' && !triggerFieldId) return;
    if (triggerType === 'recurring_activity' && !triggerIntervalHours) return;
    if (triggerType === 'all_connected_cards_in_phase' && (!triggerConnectionId || !triggerPhaseId)) return;
    if (actionType === 'move_to_phase' && !actionPhaseId) return;
    if (actionType === 'assign_user' && !actionUserId) return;
    if ((actionType === 'add_label' || actionType === 'remove_label') && !actionLabelId) return;
    if (actionType === 'update_field' && !actionFieldId) return;
    if (actionType === 'create_card' && (!actionPhaseId || !actionCardTitle.trim())) return;
    if (actionType === 'distribute_assignees' && actionUserIds.length === 0) return;
    if (actionType === 'send_email_template' && !actionTemplateId) return;
    if (actionType === 'apply_sla_rule' && !actionSlaHours) return;
    if (actionType === 'apply_formula' && (!actionFormulaTargetFieldId || !actionFormula.trim())) return;
    if (actionType === 'http_request' && !actionHttpUrl.trim()) return;
    if (actionType === 'create_connected_card' && (!actionConnectionId || !actionPhaseId || !actionCardTitle.trim())) return;
    if (actionType === 'move_connected_cards' && (!actionConnectionId || !actionPhaseId)) return;
    createMutation.mutate();
  }

  function toggleCandidate(id: number) {
    setActionUserIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
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

      {(triggerType === 'card_created_in_phase' ||
        triggerType === 'card_moved_to_phase' ||
        triggerType === 'card_left_phase' ||
        triggerType === 'sla_breached' ||
        triggerType === 'recurring_activity') && (
        <label className="field-input">
          Fase{' '}
          {(triggerType === 'card_created_in_phase' ||
            triggerType === 'sla_breached' ||
            triggerType === 'recurring_activity') &&
            '(opcional: qualquer fase se vazio)'}
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

      {triggerType === 'recurring_activity' && (
        <label className="field-input">
          Repetir a cada (horas)
          <input
            type="number"
            min="1"
            value={triggerIntervalHours}
            onChange={(e) => setTriggerIntervalHours(e.target.value)}
          />
        </label>
      )}

      {triggerType === 'all_connected_cards_in_phase' && (
        <>
          <label className="field-input">
            Conexão (cards conectados a este pipeline como alvo)
            <select value={triggerConnectionId} onChange={(e) => setTriggerConnectionId(e.target.value)}>
              <option value="">Selecione...</option>
              {targetConnections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {selectedTriggerConnection && (
            <label className="field-input">
              Fase (na pipeline conectada) que todos precisam atingir
              <select value={triggerPhaseId} onChange={(e) => setTriggerPhaseId(e.target.value)}>
                <option value="">Selecione...</option>
                {otherPipelineDetail?.phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
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

      {(actionType === 'move_to_phase' || actionType === 'create_card') && (
        <label className="field-input">
          Fase {actionType === 'create_card' ? 'de destino' : ''}
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

      {actionType === 'create_card' && (
        <label className="field-input">
          Título do card
          <input value={actionCardTitle} onChange={(e) => setActionCardTitle(e.target.value)} />
        </label>
      )}

      {actionType === 'assign_user' && (
        <>
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
          <label className="field-input">
            Prazo (opcional)
            <input type="date" value={actionDueDate} onChange={(e) => setActionDueDate(e.target.value)} />
          </label>
          <label className="field-input">
            Observação (opcional)
            <input value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
          </label>
        </>
      )}

      {actionType === 'distribute_assignees' && (
        <>
          <label className="field-input">
            Candidatos ao rodízio
            <div className="field-grid">
              {pipeline.members.map((m) => (
                <label key={m.user_id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={actionUserIds.includes(m.user_id)}
                    onChange={() => toggleCandidate(m.user_id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          </label>
          <label className="field-input">
            Prazo (opcional)
            <input type="date" value={actionDueDate} onChange={(e) => setActionDueDate(e.target.value)} />
          </label>
          <label className="field-input">
            Observação (opcional)
            <input value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
          </label>
        </>
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

      {actionType === 'update_field' && (
        <>
          <label className="field-input">
            Campo
            <select value={actionFieldId} onChange={(e) => setActionFieldId(e.target.value)}>
              <option value="">Selecione...</option>
              {allFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} ({f.phaseName})
                </option>
              ))}
            </select>
          </label>
          <label className="field-input">
            Novo valor
            <input value={actionFieldValue} onChange={(e) => setActionFieldValue(e.target.value)} />
          </label>
        </>
      )}

      {actionType === 'send_email_template' && (
        <>
          <label className="field-input">
            Modelo de e-mail
            <select value={actionTemplateId} onChange={(e) => setActionTemplateId(e.target.value)}>
              <option value="">Selecione...</option>
              {emailTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-input">
            Destinatário
            <select value={actionRecipientType} onChange={(e) => setActionRecipientType(e.target.value)}>
              <option value="assignees">Responsáveis do card</option>
              <option value="custom_field">Valor de um campo</option>
              <option value="static">E-mail fixo</option>
            </select>
          </label>
          {actionRecipientType === 'custom_field' && (
            <label className="field-input">
              Campo com o e-mail
              <select value={actionRecipientFieldId} onChange={(e) => setActionRecipientFieldId(e.target.value)}>
                <option value="">Selecione...</option>
                {allFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.phaseName})
                  </option>
                ))}
              </select>
            </label>
          )}
          {actionRecipientType === 'static' && (
            <label className="field-input">
              E-mail
              <input
                type="email"
                value={actionRecipientEmail}
                onChange={(e) => setActionRecipientEmail(e.target.value)}
              />
            </label>
          )}
        </>
      )}

      {actionType === 'apply_sla_rule' && (
        <label className="field-input">
          SLA (horas)
          <input type="number" min="1" value={actionSlaHours} onChange={(e) => setActionSlaHours(e.target.value)} />
        </label>
      )}

      {actionType === 'apply_formula' && (
        <>
          <label className="field-input">
            Campo de destino
            <select value={actionFormulaTargetFieldId} onChange={(e) => setActionFormulaTargetFieldId(e.target.value)}>
              <option value="">Selecione...</option>
              {allFields
                .filter((f) => f.type !== 'formula')
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.phaseName})
                  </option>
                ))}
            </select>
          </label>
          <label className="field-input">
            Fórmula
            <textarea
              value={actionFormula}
              onChange={(e) => setActionFormula(e.target.value)}
              rows={2}
              placeholder="valor_venda * 0.06"
            />
          </label>
        </>
      )}

      {actionType === 'http_request' && (
        <>
          <label className="field-input">
            Método
            <select value={actionHttpMethod} onChange={(e) => setActionHttpMethod(e.target.value)}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="field-input">
            URL (aceita {'{{title}}'} e {'{{campo.<key>}}'})
            <input
              value={actionHttpUrl}
              onChange={(e) => setActionHttpUrl(e.target.value)}
              placeholder="https://exemplo.com/webhook"
            />
          </label>
          <label className="field-input">
            Cabeçalhos (um por linha, "Nome: valor")
            <textarea value={actionHttpHeaders} onChange={(e) => setActionHttpHeaders(e.target.value)} rows={2} />
          </label>
          {actionHttpMethod !== 'GET' && (
            <label className="field-input">
              Corpo
              <textarea value={actionHttpBody} onChange={(e) => setActionHttpBody(e.target.value)} rows={3} />
            </label>
          )}
          <label className="field-input">
            Gravar resposta no campo (opcional)
            <select value={actionHttpResponseFieldId} onChange={(e) => setActionHttpResponseFieldId(e.target.value)}>
              <option value="">Não gravar</option>
              {allFields
                .filter((f) => f.type !== 'formula')
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.phaseName})
                  </option>
                ))}
            </select>
          </label>
        </>
      )}

      {(actionType === 'create_connected_card' || actionType === 'move_connected_cards') && (
        <>
          <label className="field-input">
            Conexão
            <select value={actionConnectionId} onChange={(e) => setActionConnectionId(e.target.value)}>
              <option value="">Selecione...</option>
              {connections.map((c) => (
                <option key={`${c.side}-${c.id}`} value={c.id}>
                  {c.name} ({c.side === 'owner' ? 'cards conectados por este pipeline' : 'quem se conecta a este pipeline'})
                </option>
              ))}
            </select>
          </label>
          {selectedActionConnection && (
            <label className="field-input">
              Fase {actionType === 'create_connected_card' ? 'de destino do novo card' : 'de destino'} (na pipeline
              conectada)
              <select value={actionPhaseId} onChange={(e) => setActionPhaseId(e.target.value)}>
                <option value="">Selecione...</option>
                {otherPipelineDetail?.phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {actionType === 'create_connected_card' && (
            <label className="field-input">
              Título do novo card
              <input value={actionCardTitle} onChange={(e) => setActionCardTitle(e.target.value)} />
            </label>
          )}
        </>
      )}

      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
        Criar automação
      </button>
    </form>
  );
}
