import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthApi } from '../api/auth';
import { setAccessToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PasswordInput from '../components/PasswordInput';
import { parseUserAgent } from '../utils/userAgent';
import { getStoredTheme, setTheme, ThemePreference } from '../utils/theme';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  member: 'Membro',
};

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Igual ao sistema',
  light: 'Claro',
  dark: 'Escuro',
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

  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);

  const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredTheme());

  function handleThemeChange(pref: ThemePreference) {
    setTheme(pref);
    setThemePreference(pref);
  }

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

  const setupTwoFactorMutation = useMutation({
    mutationFn: AuthApi.setupTwoFactor,
    onSuccess: (data) => {
      setTwoFactorSetup(data);
      setTwoFactorMessage(null);
      setTwoFactorError(null);
    },
    onError: () => setTwoFactorError('Não foi possível iniciar a configuração do 2FA.'),
  });

  const confirmTwoFactorMutation = useMutation({
    mutationFn: (code: string) => AuthApi.confirmTwoFactor(code),
    onSuccess: () => {
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      setTwoFactorError(null);
      setTwoFactorMessage('Autenticação em duas etapas ativada.');
      setUser({ ...user!, totp_enabled: true });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setTwoFactorMessage(null);
      setTwoFactorError(message ?? 'Código inválido.');
    },
  });

  const disableTwoFactorMutation = useMutation({
    mutationFn: (password: string) => AuthApi.disableTwoFactor(password),
    onSuccess: () => {
      setShowDisableForm(false);
      setDisablePassword('');
      setTwoFactorError(null);
      setTwoFactorMessage('Autenticação em duas etapas desativada.');
      setUser({ ...user!, totp_enabled: false });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setTwoFactorMessage(null);
      setTwoFactorError(message ?? 'Não foi possível desativar o 2FA.');
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

  function handleConfirmTwoFactor(e: FormEvent) {
    e.preventDefault();
    if (twoFactorCode.length !== 6) return;
    confirmTwoFactorMutation.mutate(twoFactorCode);
  }

  function handleDisableTwoFactor(e: FormEvent) {
    e.preventDefault();
    if (!disablePassword) return;
    disableTwoFactorMutation.mutate(disablePassword);
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
        <h2 className="section-title">Aparência</h2>
        <label className="field-input">
          Tema
          <select value={themePreference} onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}>
            {(Object.keys(THEME_LABELS) as ThemePreference[]).map((key) => (
              <option key={key} value={key}>
                {THEME_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </section>

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

      {user.role === 'admin' && (
        <section className="settings-card">
          <h2 className="section-title">Autenticação em duas etapas</h2>
          <p className="muted">
            Disponível pra contas administradoras. Exige um código do seu app autenticador a cada login.
          </p>

          {twoFactorMessage && <p className="success">{twoFactorMessage}</p>}
          {twoFactorError && <p className="error">{twoFactorError}</p>}

          {user.totp_enabled && !showDisableForm && (
            <div className="two-factor-status">
              <span className="role-badge">Ativado</span>
              <button type="button" className="secondary-button" onClick={() => setShowDisableForm(true)}>
                Desativar
              </button>
            </div>
          )}

          {user.totp_enabled && showDisableForm && (
            <form className="inline-form" onSubmit={handleDisableTwoFactor}>
              <PasswordInput
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Confirme sua senha"
                required
              />
              <button type="submit" disabled={disableTwoFactorMutation.isPending}>
                {disableTwoFactorMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
                Confirmar desativação
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setShowDisableForm(false);
                  setDisablePassword('');
                }}
              >
                Cancelar
              </button>
            </form>
          )}

          {!user.totp_enabled && !twoFactorSetup && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setupTwoFactorMutation.mutate()}
              disabled={setupTwoFactorMutation.isPending}
            >
              {setupTwoFactorMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
              Ativar
            </button>
          )}

          {!user.totp_enabled && twoFactorSetup && (
            <div className="two-factor-setup">
              <p className="muted">
                Escaneie o QR code com seu app autenticador (Google Authenticator, Authy...) e digite o código gerado
                pra confirmar.
              </p>
              <img src={twoFactorSetup.qrCodeDataUrl} alt="QR code de configuração do 2FA" className="two-factor-qr" />
              <p className="muted">
                Ou digite manualmente: <code>{twoFactorSetup.secret}</code>
              </p>
              <form className="inline-form" onSubmit={handleConfirmTwoFactor}>
                <input
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Código de 6 dígitos"
                  required
                />
                <button type="submit" disabled={confirmTwoFactorMutation.isPending || twoFactorCode.length !== 6}>
                  {confirmTwoFactorMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
                  Confirmar
                </button>
                <button type="button" className="link-button" onClick={() => setTwoFactorSetup(null)}>
                  Cancelar
                </button>
              </form>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
