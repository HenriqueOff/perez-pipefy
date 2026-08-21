import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { CardConnectionGroup } from '../types';
import Icon from './Icon';
import AttachCardModal from './AttachCardModal';

export default function ConnectedCardsSection({
  pipelineId,
  cardId,
  canEdit,
}: {
  pipelineId: number;
  cardId: number;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['card-connections', pipelineId, cardId],
    queryFn: () => PipelinesApi.listCardConnections(pipelineId, cardId),
  });

  const [attachingConnectionId, setAttachingConnectionId] = useState<number | null>(null);
  const [attachingSide, setAttachingSide] = useState<'owner' | 'target' | null>(null);
  const [attachingTargetPipelineId, setAttachingTargetPipelineId] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['card-connections', pipelineId, cardId] });
  };

  const attachMutation = useMutation({
    mutationFn: (otherCardId: number) =>
      PipelinesApi.attachCardConnection(pipelineId, cardId, {
        pipeline_connection_id: attachingConnectionId!,
        from_side: attachingSide!,
        other_card_id: otherCardId,
      }),
    onSuccess: () => {
      invalidate();
      setAttachingConnectionId(null);
      setAttachingSide(null);
      setAttachingTargetPipelineId(null);
    },
  });

  const detachMutation = useMutation({
    mutationFn: (cardConnectionId: number) => PipelinesApi.detachCardConnection(pipelineId, cardId, cardConnectionId),
    onSuccess: invalidate,
  });

  function openAttach(group: CardConnectionGroup, side: 'owner' | 'target') {
    setAttachingConnectionId(group.connection.id);
    setAttachingSide(side);
    setAttachingTargetPipelineId(side === 'owner' ? group.connection.target_pipeline_id : group.connection.owner_pipeline_id);
  }

  function renderGroup(group: CardConnectionGroup, side: 'owner' | 'target') {
    return (
      <div key={group.connection.id} className="checklist-section">
        <div className="page-header">
          <span className="member-name">{group.connection.name}</span>
          {canEdit && (
            <button type="button" className="secondary-button" onClick={() => openAttach(group, side)}>
              + Anexar
            </button>
          )}
        </div>
        <ul className="automation-list">
          {group.cards.map((c) => (
            <li key={c.card_connection_id} className="automation-row">
              <div className="automation-info">
                <Link to={`/pipelines/${c.pipeline_id}?card=${c.card_id}`} className="member-name">
                  {c.title}
                </Link>
                <span className="muted">
                  {c.pipeline_name} · {c.phase_name}
                </span>
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="icon-button"
                  title="Desanexar"
                  onClick={() => detachMutation.mutate(c.card_connection_id)}
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </li>
          ))}
          {group.cards.length === 0 && <p className="muted">Nenhum card conectado.</p>}
        </ul>
      </div>
    );
  }

  const hasAnyConnection = (data?.asOwner.length ?? 0) + (data?.asTarget.length ?? 0) > 0;

  return (
    <div>
      {!hasAnyConnection && <p className="muted">Nenhuma conexão configurada para este pipeline.</p>}
      {data?.asOwner.map((g) => renderGroup(g, 'owner'))}
      {data?.asTarget.map((g) => renderGroup(g, 'target'))}

      {attachingConnectionId != null && attachingTargetPipelineId != null && (
        <AttachCardModal
          targetPipelineId={attachingTargetPipelineId}
          excludeCardIds={[cardId]}
          onAttach={(otherCardId) => attachMutation.mutate(otherCardId)}
          onClose={() => {
            setAttachingConnectionId(null);
            setAttachingSide(null);
            setAttachingTargetPipelineId(null);
          }}
        />
      )}
    </div>
  );
}
