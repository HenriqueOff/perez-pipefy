import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  member: 'Membro',
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileMutation = useMutation({
    mutationFn: () => AuthApi.updateProfile({ name: name.trim() }),
    onSuccess: (updated) => {
      setUser(updated);
      setProfileMessage('Nome atualizado.');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => AuthApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setPasswordMessage('Senha alterada com sucesso.');
      setPasswordError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      setPasswordMessage(null);
      setPasswordError(err?.response?.data?.message ?? 'Não foi possível alterar a senha.');
    },
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
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            Nova senha
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          <label>
            Confirmar nova senha
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={passwordMutation.isPending}>
            Alterar senha
          </button>
        </form>
        {passwordMessage && <p className="success">{passwordMessage}</p>}
        {passwordError && <p className="error">{passwordError}</p>}
      </section>
    </div>
  );
}
