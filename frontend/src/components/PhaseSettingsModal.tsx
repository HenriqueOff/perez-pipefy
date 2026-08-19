import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { CustomField, CustomFieldType, Phase } from '../types';
import Icon from './Icon';

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  number: 'Número',
  date: 'Data',
  boolean: 'Sim/Não',
  select: 'Lista de opções',
};

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[];

const DIACRITICS_PATTERN = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g'
);

function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

interface Props {
  pipelineId: number;
  phase: Phase;
  onClose: () => void;
}

export default function PhaseSettingsModal({ pipelineId, phase, onClose }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(phase.name);
  const [color, setColor] = useState(phase.color ?? '#6b7280');
  const [isInitial, setIsInitial] = useState(phase.is_initial);
  const [isFinal, setIsFinal] = useState(phase.is_final);
  const [slaHours, setSlaHours] = useState(phase.sla_hours != null ? String(phase.sla_hours) : '');
  const [wipLimit, setWipLimit] = useState(phase.wip_limit != null ? String(phase.wip_limit) : '');

  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [showAddField, setShowAddField] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pipeline', pipelineId] });

  const savePhaseMutation = useMutation({
    mutationFn: () =>
      PipelinesApi.updatePhase(pipelineId, phase.id, {
        name,
        color,
        is_initial: isInitial,
        is_final: isFinal,
        sla_hours: slaHours.trim() ? Number(slaHours) : null,
        wip_limit: wipLimit.trim() ? Number(wipLimit) : null,
      }),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível salvar a fase');
    },
  });

  const deletePhaseMutation = useMutation({
    mutationFn: () => PipelinesApi.deletePhase(pipelineId, phase.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível excluir a fase');
    },
  });

  function handleSavePhase(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    savePhaseMutation.mutate();
  }

  function handleDeletePhase() {
    if (!confirm(`Excluir a fase "${phase.name}"? Essa ação não pode ser desfeita.`)) return;
    deletePhaseMutation.mutate();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configurar fase</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}

          <form onSubmit={handleSavePhase} className="phase-settings-form">
            <div className="modal-top-fields">
              <label>
                Nome da fase
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Cor
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="color-input" />
              </label>
            </div>
            <div className="modal-top-fields">
              <label>
                SLA da fase (horas até virar atrasado)
                <input
                  type="number"
                  min={1}
                  placeholder="Sem limite"
                  value={slaHours}
                  onChange={(e) => setSlaHours(e.target.value)}
                />
              </label>
              <label>
                Limite de cards (WIP)
                <input
                  type="number"
                  min={1}
                  placeholder="Sem limite"
                  value={wipLimit}
                  onChange={(e) => setWipLimit(e.target.value)}
                />
              </label>
            </div>
            <div className="phase-flags">
              <label className="checkbox-label">
                <input type="checkbox" checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)} />
                Fase inicial (cards novos entram aqui por padrão)
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
                Fase final (encerra o processo)
              </label>
            </div>
            <div className="page-header-actions">
              <button type="submit" disabled={savePhaseMutation.isPending}>
                Salvar fase
              </button>
              <button type="button" className="danger-button" onClick={handleDeletePhase}>
                Excluir fase
              </button>
            </div>
          </form>

          <hr className="div" />

          <div className="page-header">
            <h3>Campos customizados</h3>
            <button type="button" className="secondary-button" onClick={() => setShowAddField((v) => !v)}>
              {showAddField ? 'Cancelar' : '+ Novo campo'}
            </button>
          </div>

          {showAddField && (
            <AddFieldForm
              pipelineId={pipelineId}
              phaseId={phase.id}
              onDone={() => {
                setShowAddField(false);
                invalidate();
              }}
              onError={setError}
            />
          )}

          <ul className="field-manage-list">
            {phase.customFields.length === 0 && <p className="muted">Esta fase ainda não tem campos customizados.</p>}
            {phase.customFields.map((field) =>
              editingFieldId === field.id ? (
                <EditFieldForm
                  key={field.id}
                  pipelineId={pipelineId}
                  phaseId={phase.id}
                  field={field}
                  onDone={() => {
                    setEditingFieldId(null);
                    invalidate();
                  }}
                  onCancel={() => setEditingFieldId(null)}
                  onError={setError}
                />
              ) : (
                <li key={field.id} className="field-manage-row">
                  <div className="member-info">
                    <span className="member-name">
                      {field.label} {field.required && <span className="required">*</span>}
                    </span>
                    <span className="muted">
                      {FIELD_TYPE_LABELS[field.type]} · <code>{field.key}</code>
                    </span>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => setEditingFieldId(field.id)}>
                    Editar
                  </button>
                  <DeleteFieldButton
                    pipelineId={pipelineId}
                    phaseId={phase.id}
                    fieldId={field.id}
                    onDone={invalidate}
                    onError={setError}
                  />
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AddFieldForm({
  pipelineId,
  phaseId,
  onDone,
  onError,
}: {
  pipelineId: number;
  phaseId: number;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      PipelinesApi.createCustomField(pipelineId, phaseId, {
        label: label.trim(),
        key: key.trim(),
        type,
        required,
        options: type === 'select' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
      }),
    onSuccess: onDone,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      onError(message ?? 'Não foi possível criar o campo');
    },
  });

  function handleLabelChange(value: string) {
    setLabel(value);
    if (!keyTouched) setKey(slugify(value));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !key.trim()) return;
    createMutation.mutate();
  }

  return (
    <form className="field-builder-form" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field-input">
          Rótulo
          <input value={label} onChange={(e) => handleLabelChange(e.target.value)} autoFocus />
        </label>
        <label className="field-input">
          Chave (key)
          <input
            value={key}
            onChange={(e) => {
              setKey(slugify(e.target.value));
              setKeyTouched(true);
            }}
          />
        </label>
        <label className="field-input">
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as CustomFieldType)}>
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        {type === 'select' && (
          <label className="field-input">
            Opções (separadas por vírgula)
            <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Opção A, Opção B" />
          </label>
        )}
      </div>
      <label className="checkbox-label">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        Campo obrigatório para avançar de fase
      </label>
      <button type="submit" disabled={createMutation.isPending}>
        Adicionar campo
      </button>
    </form>
  );
}

function EditFieldForm({
  pipelineId,
  phaseId,
  field,
  onDone,
  onCancel,
  onError,
}: {
  pipelineId: number;
  phaseId: number;
  field: CustomField;
  onDone: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [label, setLabel] = useState(field.label);
  const [required, setRequired] = useState(field.required);
  const [optionsText, setOptionsText] = useState((field.options ?? []).join(', '));

  const updateMutation = useMutation({
    mutationFn: () =>
      PipelinesApi.updateCustomField(pipelineId, phaseId, field.id, {
        label: label.trim(),
        required,
        options: field.type === 'select' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
      }),
    onSuccess: onDone,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      onError(message ?? 'Não foi possível salvar o campo');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    updateMutation.mutate();
  }

  return (
    <li className="field-manage-row field-manage-row-editing">
      <form className="field-builder-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field-input">
            Rótulo
            <input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
          </label>
          {field.type === 'select' && (
            <label className="field-input">
              Opções (separadas por vírgula)
              <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
            </label>
          )}
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Campo obrigatório para avançar de fase
        </label>
        <div className="page-header-actions">
          <button type="submit" disabled={updateMutation.isPending}>
            Salvar
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </li>
  );
}

function DeleteFieldButton({
  pipelineId,
  phaseId,
  fieldId,
  onDone,
  onError,
}: {
  pipelineId: number;
  phaseId: number;
  fieldId: number;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: () => PipelinesApi.deleteCustomField(pipelineId, phaseId, fieldId),
    onSuccess: onDone,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      onError(message ?? 'Não foi possível excluir o campo');
    },
  });

  return (
    <button
      type="button"
      className="icon-button"
      title="Excluir campo"
      onClick={() => {
        if (confirm('Excluir este campo? Os valores já preenchidos nos cards serão perdidos.')) {
          deleteMutation.mutate();
        }
      }}
    >
      <Icon name="x" size={14} />
    </button>
  );
}
