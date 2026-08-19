import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      navigate('/login', { replace: true });
    } catch {
      setError('Link inválido ou expirado. Peça um novo link de redefinição.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="centered">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Nova senha</h1>
        <p className="subtitle">Escolha uma nova senha pra sua conta.</p>
        <label>
          Nova senha
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
            autoFocus
          />
        </label>
        <label>
          Confirmar nova senha
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar nova senha'}
        </button>
        <p className="back-link">
          <Link to="/login">Voltar pro login</Link>
        </p>
      </form>
    </div>
  );
}
