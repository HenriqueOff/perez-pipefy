import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthApi } from '../api/auth';
import { setAccessToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AuthLayout from './AuthLayout';
import PasswordInput from './PasswordInput';

export default function ForcePasswordChangeGate() {
  const { user, setUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => AuthApi.changePassword({ currentPassword, newPassword }),
    onSuccess: ({ accessToken }) => {
      setAccessToken(accessToken);
      if (user) setUser({ ...user, must_change_password: false });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível trocar a senha');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    mutation.mutate();
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Troque sua senha</h1>
        <p className="subtitle">Por segurança, você precisa definir uma nova senha antes de continuar.</p>
        <label>
          Senha atual
          <PasswordInput
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoFocus
          />
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
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <span className="button-spinner" aria-hidden="true" />}
          {mutation.isPending ? 'Salvando...' : 'Salvar e continuar'}
        </button>
        <p className="back-link">
          <button type="button" className="link-button" onClick={() => logout()}>
            Sair
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
