import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const { user, login, verifyTwoFactor } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.twoFactorRequired) {
        setTempToken(result.tempToken);
      }
    } catch {
      setError('E-mail ou senha inválidos');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (!tempToken) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyTwoFactor(tempToken, code);
    } catch {
      setError('Código inválido ou expirado');
    } finally {
      setSubmitting(false);
    }
  }

  if (tempToken) {
    return (
      <AuthLayout>
        <form className="auth-form" onSubmit={handleVerifyCode}>
          <h1>Verificação em duas etapas</h1>
          <p className="subtitle">Digite o código de 6 dígitos do seu app autenticador</p>
          <label>
            Código
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting || code.length !== 6}>
            {submitting && <span className="button-spinner" aria-hidden="true" />}
            {submitting ? 'Verificando...' : 'Verificar'}
          </button>
          <p className="back-link">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setTempToken(null);
                setCode('');
                setError(null);
              }}
            >
              Voltar
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Entrar</h1>
        <p className="subtitle">Acesse sua conta pra continuar</p>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Senha
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting && <span className="button-spinner" aria-hidden="true" />}
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="back-link">
          <Link to="/forgot-password">Esqueceu a senha?</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
