import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { Label } from '../types';
import Icon from './Icon';

export default function CardLabels({
  pipelineId,
  cardId,
  currentLabels,
  canEdit,
}: {
  pipelineId: number;
  cardId: number;
  currentLabels: Label[];
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: allLabels } = useQuery({
    queryKey: ['labels', pipelineId],
    queryFn: () => PipelinesApi.listLabels(pipelineId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cards', pipelineId] });
    queryClient.invalidateQueries({ queryKey: ['card', pipelineId, cardId] });
  };

  const attachMutation = useMutation({
    mutationFn: (labelId: number) => PipelinesApi.attachLabel(pipelineId, cardId, labelId),
    onSuccess: invalidate,
  });

  const detachMutation = useMutation({
    mutationFn: (labelId: number) => PipelinesApi.detachLabel(pipelineId, cardId, labelId),
    onSuccess: invalidate,
  });

  const currentIds = new Set(currentLabels.map((l) => l.id));
  const available = (allLabels ?? []).filter((l) => !currentIds.has(l.id));

  return (
    <div className="card-labels-editor">
      {currentLabels.map((label) => (
        <span key={label.id} className="label-chip" style={{ background: label.color }}>
          {label.name}
          {canEdit && (
            <button
              type="button"
              className="label-chip-remove"
              onClick={() => detachMutation.mutate(label.id)}
              title="Remover etiqueta"
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </span>
      ))}
      {currentLabels.length === 0 && !canEdit && <span className="muted">Sem etiquetas</span>}
      {canEdit && available.length > 0 && (
        <select
          className="label-add-select"
          value=""
          onChange={(e) => {
            if (e.target.value) attachMutation.mutate(Number(e.target.value));
          }}
        >
          <option value="">+ etiqueta</option>
          {available.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
