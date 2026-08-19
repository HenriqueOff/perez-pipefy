import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Não foi possível enviar o e-mail. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="centered">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Esqueceu a senha?</h1>
        <p className="subtitle">Informe seu e-mail e enviaremos um link pra redefinir a senha.</p>
        {sent ? (
          <p className="success">
            Se esse e-mail estiver cadastrado, você vai receber um link de redefinição em instantes.
          </p>
        ) : (
          <>
            <label>
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          </>
        )}
        <p className="back-link">
          <Link to="/login">Voltar pro login</Link>
        </p>
      </form>
    </div>
  );
}
