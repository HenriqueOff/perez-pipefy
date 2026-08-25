import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthApi } from '../api/auth';
import { setAccessToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PasswordInput from '../components/PasswordInput';
import { parseUserAgent } from '../utils/userAgent';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  member: 'Membro',
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? '');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: AuthApi.listSessions,
  });

  const profileMutation = useMutation({
    mutationFn: () => AuthApi.updateProfile({ name: name.trim() }),
    onSuccess: (updated) => {
      setUser(updated);
      setProfileMessage('Nome atualizado.');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => AuthApi.changePassword({ currentPassword, newPassword }),
    onSuccess: ({ accessToken }) => {
      setAccessToken(accessToken);
      setPasswordMessage('Senha alterada com sucesso.');
      setPasswordError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setPasswordMessage(null);
      setPasswordError(message ?? 'Não foi possível alterar a senha.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: number) => AuthApi.revokeSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileMessage(null);
    profileMutation.mutate();
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('A nova senha precisa ter ao menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação não bate com a nova senha.');
      return;
    }
    passwordMutation.mutate();
  }

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Meu perfil</h1>
          <p className="muted">Seus dados de acesso ao Pipelines.</p>
        </div>
      </div>

      <div className="profile-summary">
        <Avatar name={user.name} size={48} />
        <div>
          <strong>{user.name}</strong>
          <p className="muted">
            {user.email} · {ROLE_LABELS[user.role] ?? user.role}
          </p>
        </div>
      </div>

      <section className="settings-card">
        <h2 className="section-title">Nome</h2>
        <form className="inline-form" onSubmit={handleProfileSubmit}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          <button type="submit" disabled={profileMutation.isPending || !name.trim()}>
            {profileMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
            Salvar
          </button>
        </form>
        {profileMessage && <p className="success">{profileMessage}</p>}
        {profileMutation.isError && <p className="error">Não foi possível salvar o nome.</p>}
      </section>

      <section className="settings-card">
        <h2 className="section-title">Alterar senha</h2>
        <form className="stacked-form" onSubmit={handlePasswordSubmit}>
          <label>
            Senha atual
            <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </label>
          <label>
            Nova senha
            <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
          </label>
          <label>
            Confirmar nova senha
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button type="submit" disabled={passwordMutation.isPending}>
            {passwordMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
            Alterar senha
          </button>
        </form>
        {passwordMessage && <p className="success">{passwordMessage}</p>}
        {passwordError && <p className="error">{passwordError}</p>}
      </section>

      <section className="settings-card">
        <h2 className="section-title">Sessões ativas</h2>
        <p className="muted">Dispositivos onde sua conta está conectada. Revogar encerra o acesso naquele dispositivo.</p>
        {loadingSessions && <p className="muted">Carregando...</p>}
        <ul className="member-list">
          {sessions?.map((s) => (
            <li key={s.id} className="member-row">
              <div className="member-info">
                <span className="member-name">
                  {parseUserAgent(s.user_agent)} {s.is_current && <span className="role-badge">Esta sessão</span>}
                </span>
                <span className="muted">Desde {new Date(s.created_at).toLocaleString('pt-BR')}</span>
              </div>
              {!s.is_current && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => revokeMutation.mutate(s.id)}
                  disabled={revokeMutation.isPending}
                >
                  Revogar
                </button>
              )}
            </li>
          ))}
        </ul>
        {!loadingSessions && sessions?.length === 0 && <p className="muted">Nenhuma sessão ativa.</p>}
      </section>
    </div>
  );
}
