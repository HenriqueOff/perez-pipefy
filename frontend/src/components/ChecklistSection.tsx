import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import Icon from './Icon';

export default function ChecklistSection({
  pipelineId,
  cardId,
  canEdit,
}: {
  pipelineId: number;
  cardId: number;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: items } = useQuery({
    queryKey: ['checklist', pipelineId, cardId],
    queryFn: () => PipelinesApi.listChecklist(pipelineId, cardId),
  });

  const [title, setTitle] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['checklist', pipelineId, cardId] });
    queryClient.invalidateQueries({ queryKey: ['cards', pipelineId] });
    queryClient.invalidateQueries({ queryKey: ['card', pipelineId, cardId] });
  };

  const createMutation = useMutation({
    mutationFn: (t: string) => PipelinesApi.createChecklistItem(pipelineId, cardId, t),
    onSuccess: () => {
      setTitle('');
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, done }: { itemId: number; done: boolean }) =>
      PipelinesApi.updateChecklistItem(pipelineId, cardId, itemId, { done }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => PipelinesApi.deleteChecklistItem(pipelineId, cardId, itemId),
    onSuccess: invalidate,
  });

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate(title.trim());
  }

  const total = items?.length ?? 0;
  const done = items?.filter((i) => i.done).length ?? 0;

  return (
    <div className="checklist-section">
      {total > 0 && (
        <div className="checklist-progress">
          <div className="checklist-progress-bar">
            <div className="checklist-progress-fill" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="muted">
            {done}/{total}
          </span>
        </div>
      )}
      <ul className="checklist-list">
        {items?.map((item) => (
          <li key={item.id} className={`checklist-item ${item.done ? 'checklist-item-done' : ''}`}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={item.done}
                disabled={!canEdit}
                onChange={(e) => toggleMutation.mutate({ itemId: item.id, done: e.target.checked })}
              />
              {item.title}
            </label>
            {canEdit && (
              <button
                type="button"
                className="icon-button"
                title="Remover item"
                onClick={() => deleteMutation.mutate(item.id)}
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </li>
        ))}
        {total === 0 && <p className="muted">Nenhum item na checklist.</p>}
      </ul>
      {canEdit && (
        <form className="inline-form" onSubmit={handleAdd}>
          <input placeholder="Novo item da checklist" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
            Adicionar
          </button>
        </form>
      )}
    </div>
  );
}
