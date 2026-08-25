import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabasesApi } from '../api/databases';
import { DatabaseField, DatabaseRecord } from '../types';
import Icon from './Icon';

function FieldInput({
  field,
  value,
  onCommit,
  disabled,
}: {
  field: DatabaseField;
  value: unknown;
  onCommit: (value: unknown) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value ?? (field.type === 'boolean' ? false : ''));

  return (
    <label className="field-input">
      {field.label}
      {field.required && <span className="required">*</span>}
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
          onChange={(e) => {
            setLocal(e.target.value);
            onCommit(e.target.value);
          }}
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
    </label>
  );
}

interface Props {
  databaseId: number;
  record: DatabaseRecord | null;
  fields: DatabaseField[];
  canEdit: boolean;
  onClose: () => void;
}

export default function DatabaseRecordModal({ databaseId, record, fields, canEdit, onClose }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(record?.title ?? '');
  const [newFields, setNewFields] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['database-records', databaseId] });

  const valueByFieldId = new Map((record?.fieldValues ?? []).map((v) => [v.fieldId, v.value]));

  const createMutation = useMutation({
    mutationFn: () => DatabasesApi.createRecord(databaseId, { title: title.trim(), fields: newFields }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível criar o registro');
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: (value: string) => DatabasesApi.updateRecord(databaseId, record!.id, { title: value }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível salvar o título'),
  });

  const updateFieldMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) => DatabasesApi.updateRecordFields(databaseId, record!.id, fields),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível salvar o campo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => DatabasesApi.deleteRecord(databaseId, record!.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: () => setError('Não foi possível excluir o registro'),
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate();
  }

  const isNew = !record;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? 'Novo registro' : 'Editar registro'}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}

          {isNew ? (
            <form onSubmit={handleCreate}>
              <label>
                Título
                <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus disabled={!canEdit} />
              </label>
              <div className="field-grid">
                {fields.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    value={newFields[field.key]}
                    onCommit={(value) => setNewFields((prev) => ({ ...prev, [field.key]: value }))}
                    disabled={!canEdit}
                  />
                ))}
              </div>
              <button type="submit" disabled={!canEdit || createMutation.isPending}>
                {createMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
                Criar registro
              </button>
            </form>
          ) : (
            <>
              <label>
                Título
                <input
                  defaultValue={title}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== record.title) {
                      updateTitleMutation.mutate(e.target.value.trim());
                    }
                  }}
                  disabled={!canEdit}
                />
              </label>
              <div className="field-grid">
                {fields.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    value={valueByFieldId.get(field.id)}
                    onCommit={(value) => updateFieldMutation.mutate({ [field.key]: value })}
                    disabled={!canEdit}
                  />
                ))}
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    if (confirm('Excluir este registro?')) deleteMutation.mutate();
                  }}
                >
                  Excluir registro
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
