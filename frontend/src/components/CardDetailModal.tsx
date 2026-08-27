import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { openHtmlDocument } from '../utils/openHtmlDocument';
import { DatabasesApi } from '../api/databases';
import { CustomField, Phase, PipelineMember, PipelineRole } from '../types';
import { roleAtLeast } from '../utils/roles';
import AttachmentList from './AttachmentList';
import CardLabels from './CardLabels';
import CardAssignees from './CardAssignees';
import ChecklistSection from './ChecklistSection';
import ConnectedCardsSection from './ConnectedCardsSection';
import Icon from './Icon';
import PhotoGalleryField from './PhotoGalleryField';

interface Props {
  pipelineId: number;
  cardId: number;
  phases: Phase[];
  members: PipelineMember[];
  canEdit: boolean;
  userRole: PipelineRole;
  onClose: () => void;
}

export default function CardDetailModal({ pipelineId, cardId, phases, members, canEdit, userRole, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: card } = useQuery({
    queryKey: ['card', pipelineId, cardId],
    queryFn: () => PipelinesApi.cardDetail(pipelineId, cardId),
  });
  const { data: comments } = useQuery({
    queryKey: ['comments', pipelineId, cardId],
    queryFn: () => PipelinesApi.listComments(pipelineId, cardId),
  });
  const { data: contractTemplates } = useQuery({
    queryKey: ['contract-templates', pipelineId],
    queryFn: () => PipelinesApi.listContractTemplates(pipelineId),
  });

  const generateContractMutation = useMutation({
    mutationFn: (templateId: number) => PipelinesApi.generateContract(pipelineId, cardId, templateId),
    onSuccess: openHtmlDocument,
  });

  const [commentBody, setCommentBody] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const currentPhase = useMemo(() => phases.find((p) => p.id === card?.current_phase_id), [phases, card]);

  const invalidateBoard = () => {
    queryClient.invalidateQueries({ queryKey: ['cards', pipelineId] });
    queryClient.invalidateQueries({ queryKey: ['card', pipelineId, cardId] });
  };

  const updateFieldsMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) => PipelinesApi.updateCardFields(pipelineId, cardId, fields),
    onSuccess: invalidateBoard,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFieldError(message ?? 'Erro ao salvar o campo');
    },
  });

  const moveMutation = useMutation({
    mutationFn: (toPhaseId: number) => PipelinesApi.moveCard(pipelineId, cardId, toPhaseId),
    onSuccess: invalidateBoard,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(message ?? 'Não foi possível mover o card');
    },
  });

  const dueDateMutation = useMutation({
    mutationFn: (dueDate: string | null) => PipelinesApi.updateCard(pipelineId, cardId, { due_date: dueDate }),
    onSuccess: invalidateBoard,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(message ?? 'Não foi possível alterar o prazo');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => PipelinesApi.createComment(pipelineId, cardId, body),
    onSuccess: () => {
      setCommentBody('');
      queryClient.invalidateQueries({ queryKey: ['comments', pipelineId, cardId] });
    },
  });

  function handleFieldBlur(field: CustomField, value: unknown) {
    setFieldError(null);
    updateFieldsMutation.mutate({ [field.key]: value });
  }

  function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    commentMutation.mutate(commentBody.trim());
  }

  if (!card) return null;

  const valuesByFieldId = new Map(card.fieldValues.map((v) => [v.custom_field_id, v.value]));
  const linkedTitleByFieldId = new Map(card.fieldValues.map((v) => [v.custom_field_id, v.linkedRecordTitle]));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {card.title} <span className="card-number">#{card.id}</span>
          </h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          <CardLabels pipelineId={pipelineId} cardId={cardId} currentLabels={card.labels} canEdit={canEdit} />

          <div className="modal-top-fields">
            <label>
              Fase
              <select
                value={card.current_phase_id}
                onChange={(e) => moveMutation.mutate(Number(e.target.value))}
              >
                {phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Prazo
              <input
                type="date"
                value={card.due_date ?? ''}
                onChange={(e) => dueDateMutation.mutate(e.target.value ? e.target.value : null)}
              />
            </label>
          </div>

          <label>
            Responsáveis
            <CardAssignees
              pipelineId={pipelineId}
              cardId={cardId}
              currentAssignees={card.assignees}
              members={members}
              canEdit={canEdit}
            />
          </label>

          <h3>Campos da fase "{currentPhase?.name}"</h3>
          {fieldError && <p className="error">{fieldError}</p>}
          {currentPhase?.customFields.length === 0 && <p className="muted">Esta fase não tem campos customizados.</p>}
          <div className="field-grid">
            {currentPhase?.customFields.map((field) => (
              <FieldInput
                key={field.id}
                pipelineId={pipelineId}
                cardId={cardId}
                field={field}
                value={valuesByFieldId.get(field.id)}
                linkedRecordTitle={linkedTitleByFieldId.get(field.id)}
                onCommit={(value) => handleFieldBlur(field, value)}
                disabled={!canEdit || !roleAtLeast(userRole, field.min_edit_role ?? 'editor')}
              />
            ))}
          </div>

          <h3>Histórico</h3>
          <ul className="timeline-list">
            {card.history.map((h) => (
              <li key={h.id} className="timeline-item">
                <span className={`timeline-icon timeline-icon-${h.event_type}`} aria-hidden>
                  {eventIcon(h.event_type)}
                </span>
                <div className="timeline-content">
                  <span>
                    <strong>{h.user_name ?? 'Automação'}</strong> {describeEvent(h)}
                  </span>
                  <span className="muted">{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </li>
            ))}
            {card.history.length === 0 && <p className="muted">Sem atividade registrada.</p>}
          </ul>

          <h3>Checklist</h3>
          <ChecklistSection pipelineId={pipelineId} cardId={cardId} canEdit={canEdit} />

          <h3>Anexos</h3>
          <AttachmentList pipelineId={pipelineId} cardId={cardId} canEdit={canEdit} />

          {contractTemplates != null && contractTemplates.length > 0 && (
            <>
              <h3>Gerar contrato</h3>
              <div className="page-header-actions">
                {contractTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="secondary-button"
                    onClick={() => generateContractMutation.mutate(t.id)}
                    disabled={generateContractMutation.isPending}
                  >
                    {generateContractMutation.isPending && generateContractMutation.variables === t.id && (
                      <span className="button-spinner" aria-hidden="true" />
                    )}
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <h3>Cards conectados</h3>
          <ConnectedCardsSection pipelineId={pipelineId} cardId={cardId} canEdit={canEdit} />

          <h3>Comentários</h3>
          <ul className="comment-list">
            {comments?.map((c) => (
              <li key={c.id}>
                <strong>{c.user_name}</strong>: {c.body}
              </li>
            ))}
          </ul>
          <form className="inline-form" onSubmit={handleAddComment}>
            <input
              placeholder="Escrever um comentário..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <button type="submit">Enviar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function describeEvent(h: { event_type: string; old_value?: unknown; new_value?: unknown }): string {
  switch (h.event_type) {
    case 'created':
      return 'criou o card';
    case 'moved':
      return 'moveu o card de fase';
    case 'field_updated':
      return 'atualizou um campo';
    case 'assigned':
      if (h.new_value != null && h.old_value == null) return 'adicionou um responsável';
      if (h.old_value != null && h.new_value == null) return 'removeu um responsável';
      return 'alterou o responsável';
    case 'comment_added':
      return 'adicionou um comentário';
    case 'attachment_added':
      return 'adicionou um anexo';
    default:
      return h.event_type;
  }
}

function eventIcon(eventType: string): string {
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

function FieldInput({
  pipelineId,
  cardId,
  field,
  value,
  linkedRecordTitle,
  onCommit,
  disabled,
}: {
  pipelineId: number;
  cardId: number;
  field: CustomField;
  value: unknown;
  linkedRecordTitle?: string | null;
  onCommit: (value: unknown) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value ?? (field.type === 'boolean' ? false : ''));

  const { data: linkedRecordsData } = useQuery({
    queryKey: ['database-records', field.linked_database_id],
    queryFn: () => DatabasesApi.listRecords(field.linked_database_id!),
    enabled: field.type === 'database_link' && !!field.linked_database_id,
  });

  return (
    <label className="field-input">
      {field.label}
      {field.required && <span className="required">*</span>}
      {field.type === 'database_link' && (
        <select
          value={local ? String(local) : ''}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : null;
            setLocal(next ?? '');
            onCommit(next);
          }}
          disabled={disabled}
        >
          <option value="">{linkedRecordTitle ? linkedRecordTitle : 'Selecione um registro...'}</option>
          {(linkedRecordsData?.records ?? []).map((record) => (
            <option key={record.id} value={record.id}>
              {record.title}
            </option>
          ))}
        </select>
      )}
      {field.type === 'text' && (
        <input
          value={String(local ?? '')}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onCommit(local)}
          disabled={disabled}
        />
      )}
      {field.type === 'textarea' && (
        <textarea
          value={String(local ?? '')}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onCommit(local)}
          disabled={disabled}
        />
      )}
      {field.type === 'number' && (
        <input
          type="number"
          value={local === '' ? '' : Number(local)}
          onChange={(e) => setLocal(e.target.value === '' ? '' : Number(e.target.value))}
          onBlur={() => onCommit(local === '' ? null : Number(local))}
          disabled={disabled}
        />
      )}
      {field.type === 'date' && (
        <input
          type="date"
          value={String(local ?? '')}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onCommit(local)}
          disabled={disabled}
        />
      )}
      {field.type === 'boolean' && (
        <input
          type="checkbox"
          checked={Boolean(local)}
          onChange={(e) => {
            setLocal(e.target.checked);
            onCommit(e.target.checked);
          }}
          disabled={disabled}
        />
      )}
      {field.type === 'select' && (
        <select
          value={String(local ?? '')}
          onChange={(e) => { setLocal(e.target.value); onCommit(e.target.value); }}
          disabled={disabled}
        >
          <option value="">Selecione...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {field.type === 'photo_gallery' && (
        <PhotoGalleryField
          pipelineId={pipelineId}
          cardId={cardId}
          value={Array.isArray(value) ? (value as number[]) : []}
          disabled={!!disabled}
          onCommit={onCommit}
        />
      )}
    </label>
  );
}
