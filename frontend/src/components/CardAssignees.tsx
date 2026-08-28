import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { CardAssignee, PipelineMember } from '../types';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';
import Icon from './Icon';

export default function CardAssignees({
  pipelineId,
  cardId,
  currentAssignees,
  members,
  canEdit,
}: {
  pipelineId: number;
  cardId: number;
  currentAssignees: CardAssignee[];
  members: PipelineMember[];
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cards', pipelineId] });
    queryClient.invalidateQueries({ queryKey: ['card', pipelineId, cardId] });
  };

  const addMutation = useMutation({
    mutationFn: (userId: number) => PipelinesApi.addAssignee(pipelineId, cardId, userId),
    onSuccess: invalidate,
    onError: () => toast('Não foi possível adicionar o responsável', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => PipelinesApi.removeAssignee(pipelineId, cardId, userId),
    onSuccess: invalidate,
    onError: () => toast('Não foi possível remover o responsável', 'error'),
  });

  const currentIds = new Set(currentAssignees.map((a) => a.user_id));
  const available = members.filter((m) => !currentIds.has(m.user_id));

  return (
    <div className="card-assignees-editor">
      {currentAssignees.map((assignee) => (
        <span key={assignee.user_id} className="assignee-chip">
          <Avatar name={assignee.name} size={20} />
          {assignee.name}
          {canEdit && (
            <button
              type="button"
              className="assignee-chip-remove"
              onClick={() => removeMutation.mutate(assignee.user_id)}
              title="Remover responsável"
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </span>
      ))}
      {currentAssignees.length === 0 && <span className="muted">Sem responsáveis</span>}
      {canEdit && available.length > 0 && (
        <select
          className="label-add-select"
          value=""
          onChange={(e) => {
            if (e.target.value) addMutation.mutate(Number(e.target.value));
          }}
        >
          <option value="">+ responsável</option>
          {available.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
