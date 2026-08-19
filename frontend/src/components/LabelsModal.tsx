import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { Label } from '../types';
import Icon from './Icon';

const DEFAULT_COLORS = ['#4f46e5', '#dc2626', '#059669', '#d97706', '#0891b2', '#db2777', '#6b7280'];

interface Props {
  pipelineId: number;
  canManage: boolean;
  onClose: () => void;
}

export default function LabelsModal({ pipelineId, canManage, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: labels } = useQuery({
    queryKey: ['labels', pipelineId],
    queryFn: () => PipelinesApi.listLabels(pipelineId),
  });

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['labels', pipelineId] });
    queryClient.invalidateQueries({ queryKey: ['cards', pipelineId] });
  };

  const createMutation = useMutation({
    mutationFn: () => PipelinesApi.createLabel(pipelineId, { name: name.trim(), color }),
    onSuccess: () => {
      setName('');
      setError(null);
      invalidate();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível criar a etiqueta');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: { name?: string; color?: string } }) =>
      PipelinesApi.updateLabel(pipelineId, id, changes),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: () => setError('Não foi possível salvar a etiqueta'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => PipelinesApi.deleteLabel(pipelineId, id),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível excluir a etiqueta'),
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  function startEdit(label: Label) {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Etiquetas do pipeline</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}

          <ul className="label-manage-list">
            {labels?.map((label) =>
              editingId === label.id ? (
                <li key={label.id} className="label-manage-row">
                  <input
                    type="color"
                    className="color-input color-input-small"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate({ id: label.id, changes: { name: editName, color: editColor } })}
                  >
                    Salvar
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                </li>
              ) : (
                <li key={label.id} className="label-manage-row">
                  <span className="label-chip" style={{ background: label.color }}>
                    {label.name}
                  </span>
                  {canManage && (
                    <div className="page-header-actions" style={{ marginLeft: 'auto' }}>
                      <button type="button" className="secondary-button" onClick={() => startEdit(label)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Excluir etiqueta"
                        onClick={() => {
                          if (confirm(`Excluir a etiqueta "${label.name}"?`)) deleteMutation.mutate(label.id);
                        }}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  )}
                </li>
              )
            )}
            {labels?.length === 0 && <p className="muted">Nenhuma etiqueta criada ainda.</p>}
          </ul>

          {canManage && (
            <form className="inline-form" onSubmit={handleCreate}>
              <input
                type="color"
                className="color-input color-input-small"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <input placeholder="Nome da etiqueta" value={name} onChange={(e) => setName(e.target.value)} />
              <button type="submit" disabled={createMutation.isPending}>
                Criar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
