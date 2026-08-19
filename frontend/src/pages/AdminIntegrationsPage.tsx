import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IntegrationsApi } from '../api/integrations';

export default function AdminIntegrationsPage() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['imoview-config'],
    queryFn: IntegrationsApi.getImoviewConfig,
  });

  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config?.base_url) setBaseUrl(config.base_url);
  }, [config?.base_url]);

  const saveMutation = useMutation({
    mutationFn: () => IntegrationsApi.upsertImoviewConfig({ base_url: baseUrl.trim(), api_key: apiKey.trim() }),
    onSuccess: () => {
      setError(null);
      setApiKey('');
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['imoview-config'] });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível salvar a integração');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!baseUrl.trim() || !apiKey.trim()) {
      setError('Informe a URL base e a chave de API');
      return;
    }
    saveMutation.mutate();
  }

  const isConfigured = Boolean(config?.base_url);

  return (
    <div>
      <div className="page-header">
        <h1>Integração Imoview</h1>
      </div>

      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <div className="integration-card">
          <div className="integration-status">
            <span className={`status-badge ${isConfigured ? 'status-badge-active' : 'status-badge-inactive'}`}>
              {isConfigured ? 'Configurado' : 'Não configurado'}
            </span>
            {isConfigured && config?.updated_at && (
              <span className="muted">
                Última atualização em {new Date(config.updated_at).toLocaleString('pt-BR')}
              </span>
            )}
          </div>

          <p className="topic-intro muted">
            Conecte o Imoview para importar imóveis e contatos diretamente para os cards de um pipeline. A chave de
            API é armazenada de forma criptografada e nunca é exibida novamente após salva.
          </p>

          {error && <p className="error">{error}</p>}
          {saved && <p className="muted">Integração salva com sucesso.</p>}

          <form className="modal-body" onSubmit={handleSubmit}>
            <label>
              URL base da API
              <input
                placeholder="https://api.imoview.com.br"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </label>
            <label>
              Chave de API
              <input
                type="password"
                placeholder={isConfigured ? '•••••••• (informe para substituir)' : 'Chave de API'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>
            <button type="submit" disabled={saveMutation.isPending}>
              Salvar integração
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
