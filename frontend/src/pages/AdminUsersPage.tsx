import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UsersApi } from '../api/users';
import { GlobalRole } from '../types';

const ROLE_LABELS: Record<GlobalRole, string> = {
  admin: 'Administrador',
  member: 'Membro',
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: UsersApi.list });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState<GlobalRole>('member');
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const createMutation = useMutation({
    mutationFn: () => UsersApi.create({ name: name.trim(), email: email.trim(), password, global_role: globalRole }),
    onSuccess: () => {
      invalidate();
      setName('');
      setEmail('');
      setPassword('');
      setGlobalRole('member');
      setCreating(false);
      setError(null);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível criar o usuário');
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: GlobalRole }) =>
      UsersApi.update(userId, { global_role: role }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível alterar o papel do usuário'),
  });

  const activeMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: number; active: boolean }) => UsersApi.update(userId, { active }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível alterar o status do usuário'),
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError('Preencha nome, e-mail e uma senha com ao menos 8 caracteres');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Usuários</h1>
        <button onClick={() => setCreating((v) => !v)}>{creating ? 'Cancelar' : 'Novo usuário'}</button>
      </div>

      {error && <p className="error">{error}</p>}

      {creating && (
        <form className="admin-create-form" onSubmit={handleCreate}>
          <div className="field-grid">
            <label className="field-input">
              Nome
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <label className="field-input">
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field-input">
              Senha provisória
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="field-input">
              Papel
              <select value={globalRole} onChange={(e) => setGlobalRole(e.target.value as GlobalRole)}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" disabled={createMutation.isPending}>
            Criar usuário
          </button>
        </form>
      )}

      {isLoading && <p>Carregando...</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'admin-row-inactive'}>
                <td>{u.name}</td>
                <td className="muted">{u.email}</td>
                <td>
                  <select
                    value={u.global_role}
                    onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value as GlobalRole })}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className={`status-badge ${u.active ? 'status-badge-active' : 'status-badge-inactive'}`}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => activeMutation.mutate({ userId: u.id, active: !u.active })}
                  >
                    {u.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
