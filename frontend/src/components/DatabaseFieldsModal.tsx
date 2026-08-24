import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabasesApi } from '../api/databases';
import { DatabaseField, DatabaseFieldType } from '../types';
import Icon from './Icon';

const TYPE_LABELS: Record<DatabaseFieldType, string> = {
  text: 'Texto',
  textarea: 'Texto longo',
  number: 'Número',
  date: 'Data',
  boolean: 'Sim/Não',
  select: 'Lista de opções',
};

const DIACRITICS_PATTERN = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g');

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
  databaseId: number;
  fields: DatabaseField[];
  canManage: boolean;
  onClose: () => void;
}

export default function DatabaseFieldsModal({ databaseId, fields, canManage, onClose }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<DatabaseFieldType>('text');
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['database', databaseId] });
    queryClient.invalidateQueries({ queryKey: ['database-records', databaseId] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      DatabasesApi.createField(databaseId, {
        label: label.trim(),
        key: slugify(label),
        type,
        required,
        options: type === 'select' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setLabel('');
      setRequired(false);
      setOptionsText('');
      setError(null);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível criar o campo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fieldId: number) => DatabasesApi.deleteField(databaseId, fieldId),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível excluir o campo'),
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    createMutation.mutate();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Campos do database</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}

          <ul className="member-list">
            {fields.map((field) => (
              <li key={field.id} className="member-row">
                <div className="member-info">
                  <span className="member-name">
                    {field.label} {field.required && <span className="required">*</span>}
                  </span>
                  <span className="muted">
                    {TYPE_LABELS[field.type]}
                    {field.type === 'select' && field.options ? `: ${field.options.join(', ')}` : ''}
                  </span>
                </div>
                {canManage && (
                  <button
                    className="icon-button"
                    title="Excluir campo"
                    onClick={() => {
                      if (confirm(`Excluir o campo "${field.label}"? Os valores já preenchidos se perdem.`)) {
                        deleteMutation.mutate(field.id);
                      }
                    }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </li>
            ))}
            {fields.length === 0 && <p className="muted">Nenhum campo criado ainda.</p>}
          </ul>

          {canManage && (
            <form onSubmit={handleCreate}>
              <div className="modal-top-fields">
                <label>
                  Nome do campo
                  <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Telefone" />
                </label>
                <label>
                  Tipo
                  <select value={type} onChange={(e) => setType(e.target.value as DatabaseFieldType)}>
                    {Object.entries(TYPE_LABELS).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {type === 'select' && (
                <label>
                  Opções (separadas por vírgula)
                  <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Ex: Novo, Em análise, Concluído" />
                </label>
              )}
              <label className="checkbox-label">
                <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
                Obrigatório
              </label>
              <button type="submit" disabled={createMutation.isPending}>
                Adicionar campo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
