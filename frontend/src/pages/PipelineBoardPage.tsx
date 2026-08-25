import { FormEvent, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { PipelinesApi } from '../api/pipelines';
import { Card, Phase, PipelineRole } from '../types';
import { useAuth } from '../context/AuthContext';
import KanbanColumn from '../components/KanbanColumn';
import CardDetailModal from '../components/CardDetailModal';
import PipelineMembersModal from '../components/PipelineMembersModal';
import PhaseSettingsModal from '../components/PhaseSettingsModal';
import LabelsModal from '../components/LabelsModal';
import AutomationsModal from '../components/AutomationsModal';
import ConnectionsModal from '../components/ConnectionsModal';
import PublicFormModal from '../components/PublicFormModal';
import PipelineAdminSettingsModal from '../components/PipelineAdminSettingsModal';
import CardsTableView from '../components/CardsTableView';
import DashboardView from '../components/DashboardView';
import Tooltip from '../components/Tooltip';
import Icon from '../components/Icon';

export default function PipelineBoardPage() {
  const { pipelineId } = useParams();
  const id = Number(pipelineId);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: pipeline } = useQuery({ queryKey: ['pipeline', id], queryFn: () => PipelinesApi.detail(id) });
  const { data: cards } = useQuery({ queryKey: ['cards', id], queryFn: () => PipelinesApi.listCards(id) });

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  useEffect(() => {
    const cardParam = searchParams.get('card');
    if (cardParam) {
      setSelectedCardId(Number(cardParam));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('card')]);
  const [addingPhase, setAddingPhase] = useState(false);
  const [phaseName, setPhaseName] = useState('');
  const [addingCardForPhase, setAddingCardForPhase] = useState<number | null>(null);
  const [cardTitle, setCardTitle] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [showPublicForm, setShowPublicForm] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'dashboard'>('kanban');
  const [settingsPhaseId, setSettingsPhaseId] = useState<number | null>(null);

  const currentMembership = pipeline?.members.find((m) => m.user_id === user?.id);
  const canManageMembers = user?.role === 'admin' || currentMembership?.pipeline_role === 'owner' || currentMembership?.pipeline_role === 'manager';
  const canManagePhases = canManageMembers;
  const canEdit = user?.role === 'admin' || (!!currentMembership && currentMembership.pipeline_role !== 'viewer');
  const userRole: PipelineRole = user?.role === 'admin' ? 'owner' : currentMembership?.pipeline_role ?? 'viewer';
  const isGlobalAdmin = user?.role === 'admin';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cards', id] });
    queryClient.invalidateQueries({ queryKey: ['pipeline', id] });
  };

  const createPhaseMutation = useMutation({
    mutationFn: (name: string) => PipelinesApi.createPhase(id, { name }),
    onSuccess: () => {
      invalidate();
      setPhaseName('');
      setAddingPhase(false);
    },
  });

  const createCardMutation = useMutation({
    mutationFn: (input: { title: string; phase_id: number }) => PipelinesApi.createCard(id, input),
    onSuccess: () => {
      invalidate();
      setCardTitle('');
      setAddingCardForPhase(null);
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ cardId, toPhaseId }: { cardId: number; toPhaseId: number }) =>
      PipelinesApi.moveCard(id, cardId, toPhaseId),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(message ?? 'Não foi possível mover o card');
      invalidate();
    },
  });

  const movePhaseMutation = useMutation({
    mutationFn: ({ a, b }: { a: Phase; b: Phase }) =>
      Promise.all([
        PipelinesApi.updatePhase(id, a.id, { position: b.position }),
        PipelinesApi.updatePhase(id, b.id, { position: a.position }),
      ]),
    onSuccess: invalidate,
    onError: () => alert('Não foi possível reordenar as fases'),
  });

  function handleMovePhase(index: number, direction: -1 | 1) {
    if (!pipeline) return;
    const target = index + direction;
    if (target < 0 || target >= pipeline.phases.length) return;
    movePhaseMutation.mutate({ a: pipeline.phases[index], b: pipeline.phases[target] });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const card = active.data.current?.card as Card | undefined;
    const targetPhaseId = Number(over.id);
    if (!card || card.current_phase_id === targetPhaseId) return;
    moveMutation.mutate({ cardId: card.id, toPhaseId: targetPhaseId });
  }

  function handleCreatePhase(e: FormEvent) {
    e.preventDefault();
    if (!phaseName.trim()) return;
    createPhaseMutation.mutate(phaseName.trim());
  }

  function handleCreateCard(e: FormEvent, phaseId: number) {
    e.preventDefault();
    if (!cardTitle.trim()) return;
    createCardMutation.mutate({ title: cardTitle.trim(), phase_id: phaseId });
  }

  if (!pipeline || !cards) return <p>Carregando...</p>;

  const cardsByPhase = new Map<number, Card[]>();
  for (const card of cards) {
    const list = cardsByPhase.get(card.current_phase_id) ?? [];
    list.push(card);
    cardsByPhase.set(card.current_phase_id, list);
  }

  return (
    <div className="board-page">
      <div className="page-header">
        <h1>{pipeline.name}</h1>
        <div className="page-header-actions">
          <button className="secondary-button" onClick={() => setShowMembers(true)}>
            Membros ({pipeline.members.length})
          </button>
          <button className="secondary-button" onClick={() => setShowLabels(true)}>
            Etiquetas
          </button>
          {isGlobalAdmin && (
            <button className="secondary-button" onClick={() => setShowAutomations(true)}>
              Automações
            </button>
          )}
          {isGlobalAdmin && (
            <Tooltip label="Administração do pipe (só admins veem este botão)">
              <button
                className="icon-button admin-gear-button"
                onClick={() => setShowAdminSettings(true)}
                aria-label="Administração do pipe"
              >
                <Icon name="gear" />
              </button>
            </Tooltip>
          )}
          {isGlobalAdmin && (
            <button className="secondary-button" onClick={() => setShowConnections(true)}>
              Conexões
            </button>
          )}
          {isGlobalAdmin && (
            <button className="secondary-button" onClick={() => setShowPublicForm(true)}>
              Formulário público
            </button>
          )}
          {canManagePhases && (
            <button onClick={() => setAddingPhase((v) => !v)}>{addingPhase ? 'Cancelar' : 'Nova fase'}</button>
          )}
        </div>
      </div>

      <div className="view-toggle">
        <button
          type="button"
          className={`view-toggle-tab ${viewMode === 'kanban' ? 'view-toggle-tab-active' : ''}`}
          onClick={() => setViewMode('kanban')}
        >
          Quadro
        </button>
        <button
          type="button"
          className={`view-toggle-tab ${viewMode === 'table' ? 'view-toggle-tab-active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          Tabela
        </button>
        <button
          type="button"
          className={`view-toggle-tab ${viewMode === 'dashboard' ? 'view-toggle-tab-active' : ''}`}
          onClick={() => setViewMode('dashboard')}
        >
          Dashboard
        </button>
      </div>

      {addingPhase && (
        <form className="inline-form" onSubmit={handleCreatePhase}>
          <input placeholder="Nome da fase" value={phaseName} onChange={(e) => setPhaseName(e.target.value)} autoFocus />
          <button type="submit">Adicionar</button>
        </form>
      )}

      {viewMode === 'dashboard' && <DashboardView pipelineId={id} />}

      {viewMode === 'table' && (
        <CardsTableView
          cards={cards}
          phases={pipeline.phases}
          members={pipeline.members}
          onCardClick={(card) => setSelectedCardId(card.id)}
        />
      )}

      {viewMode === 'kanban' && (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {pipeline.phases.map((phase, index) => (
            <div key={phase.id} className="kanban-column-wrapper">
              <KanbanColumn
                phase={phase}
                cards={cardsByPhase.get(phase.id) ?? []}
                canEdit={canManagePhases}
                canMoveLeft={index > 0}
                canMoveRight={index < pipeline.phases.length - 1}
                onCardClick={(card) => setSelectedCardId(card.id)}
                onSettingsClick={() => setSettingsPhaseId(phase.id)}
                onMoveLeft={() => handleMovePhase(index, -1)}
                onMoveRight={() => handleMovePhase(index, 1)}
              />
              {addingCardForPhase === phase.id ? (
                <form className="inline-form" onSubmit={(e) => handleCreateCard(e, phase.id)}>
                  <input
                    placeholder="Título do card"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    autoFocus
                  />
                  <button type="submit">Adicionar</button>
                </form>
              ) : phase.allow_manual_card_creation ? (
                <button className="add-card-button" onClick={() => setAddingCardForPhase(phase.id)}>
                  + Novo card
                </button>
              ) : (
                <Tooltip label="Criação manual desativada nesta fase (cards entram por automação)">
                  <button className="add-card-button add-card-button-disabled" disabled>
                    + Novo card
                  </button>
                </Tooltip>
              )}
            </div>
          ))}
          {pipeline.phases.length === 0 && <p>Este pipeline ainda não tem fases. Crie a primeira acima.</p>}
        </div>
      </DndContext>
      )}

      {selectedCardId && (
        <CardDetailModal
          pipelineId={id}
          cardId={selectedCardId}
          phases={pipeline.phases}
          members={pipeline.members}
          canEdit={canEdit}
          userRole={userRole}
          onClose={() => {
            setSelectedCardId(null);
            if (searchParams.has('card')) {
              searchParams.delete('card');
              setSearchParams(searchParams, { replace: true });
            }
          }}
        />
      )}

      {showMembers && (
        <PipelineMembersModal
          pipelineId={id}
          members={pipeline.members}
          canManage={canManageMembers}
          onClose={() => setShowMembers(false)}
        />
      )}

      {showLabels && (
        <LabelsModal pipelineId={id} canManage={canManagePhases} onClose={() => setShowLabels(false)} />
      )}

      {showAutomations && (
        <AutomationsModal
          pipelineId={id}
          pipeline={pipeline}
          canManage={isGlobalAdmin}
          onClose={() => setShowAutomations(false)}
        />
      )}

      {showConnections && (
        <ConnectionsModal pipelineId={id} canManage={isGlobalAdmin} onClose={() => setShowConnections(false)} />
      )}

      {showPublicForm && <PublicFormModal pipelineId={id} onClose={() => setShowPublicForm(false)} />}

      {showAdminSettings && isGlobalAdmin && (
        <PipelineAdminSettingsModal pipelineId={id} pipeline={pipeline} onClose={() => setShowAdminSettings(false)} />
      )}

      {settingsPhaseId && (
        <PhaseSettingsModal
          pipelineId={id}
          phase={pipeline.phases.find((p) => p.id === settingsPhaseId)!}
          isGlobalAdmin={isGlobalAdmin}
          onClose={() => setSettingsPhaseId(null)}
        />
      )}
    </div>
  );
}
