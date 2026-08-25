import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabasesApi } from '../api/databases';
import { UsersApi } from '../api/users';
import { DatabaseMember, PipelineRole } from '../types';
import Avatar from './Avatar';
import Icon from './Icon';

const ROLE_LABELS: Record<PipelineRole, string> = {
  owner: 'Dono',
  manager: 'Gerente',
  editor: 'Editor',
  viewer: 'Visualizador',
};

const ROLE_OPTIONS: PipelineRole[] = ['owner', 'manager', 'editor', 'viewer'];

interface Props {
  databaseId: number;
  members: DatabaseMember[];
  canManage: boolean;
  onClose: () => void;
}

export default function DatabaseMembersModal({ databaseId, members, canManage, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: allUsers } = useQuery({ queryKey: ['users'], queryFn: UsersApi.list });

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<PipelineRole>('editor');
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['database', databaseId] });

  const addMutation = useMutation({
    mutationFn: (input: { userId: number; role: PipelineRole }) => DatabasesApi.addMember(databaseId, input),
    onSuccess: () => {
      invalidate();
      setSelectedUserId('');
      setError(null);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível adicionar o membro');
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: PipelineRole }) =>
      DatabasesApi.addMember(databaseId, { userId, role }),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível alterar o papel');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => DatabasesApi.removeMember(databaseId, userId),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível remover o membro');
    },
  });

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableUsers = (allUsers ?? []).filter((u) => !memberUserIds.has(u.id));

  function handleAdd() {
    if (!selectedUserId) return;
    addMutation.mutate({ userId: Number(selectedUserId), role: selectedRole });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Membros do database</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}

          <ul className="member-list">
            {members.map((m) => (
              <li key={m.id} className="member-row">
                <Avatar name={m.name} />
                <div className="member-info">
                  <span className="member-name">{m.name}</span>
                  <span className="muted">{m.email}</span>
                </div>
                {canManage ? (
                  <select
                    className="member-role-select"
                    value={m.database_role}
                    onChange={(e) => changeRoleMutation.mutate({ userId: m.user_id, role: e.target.value as PipelineRole })}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="role-badge">{ROLE_LABELS[m.database_role]}</span>
                )}
                {canManage && (
                  <button className="icon-button" onClick={() => removeMutation.mutate(m.user_id)} title="Remover">
                    <Icon name="x" size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <div className="add-member-form">
              <h3>Adicionar membro</h3>
              <p className="muted section-hint" style={{ fontSize: 12 }}>
                Só quem já é gerente/dono deste database (ou admin geral) pode adicionar alguém — ninguém entra
                sozinho.
              </p>
              <div className="inline-form">
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">Selecione um usuário...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as PipelineRole)}>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <button onClick={handleAdd} disabled={!selectedUserId || addMutation.isPending}>
                  Adicionar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
