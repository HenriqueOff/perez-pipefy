import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PublicFormApi } from '../api/publicForm';
import { maskCpfCnpj } from '../utils/documentFormat';

export default function PublicFormPage() {
  const { token } = useParams();
  const {
    data: schema,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['public-form-schema', token],
    queryFn: () => PublicFormApi.getSchema(token!),
    enabled: !!token,
    retry: false,
  });

  const [title, setTitle] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Honeypot: campo real pra bot nenhum ver (escondido fora da tela + tabIndex -1 +
  // aria-hidden, pra não atrapalhar leitor de tela nem navegação por teclado de gente de
  // verdade). Ver backend/src/validators/publicForm.schema.ts.
  const [honeypot, setHoneypot] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => PublicFormApi.submit(token!, { title: title.trim(), fields: fieldValues, website: honeypot }),
    onSuccess: () => {
      setError(null);
      setDone(true);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível enviar o formulário. Verifique os campos e tente novamente.');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Informe um título.');
      return;
    }
    submitMutation.mutate();
  }

  function setField(key: string, value: unknown) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading) {
    return (
      <div className="centered">
        <p>Carregando formulário...</p>
      </div>
    );
  }

  if (isError || !schema) {
    return (
      <div className="centered">
        <div className="login-card">
          <h1>Formulário indisponível</h1>
          <p className="subtitle">Este link não existe ou não está mais ativo.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="centered">
        <div className="login-card">
          <h1>Recebido!</h1>
          <p className="subtitle">Sua solicitação foi enviada com sucesso. Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="centered">
      <form className="login-card public-form-card" onSubmit={handleSubmit}>
        <h1>{schema.pipeline_name}</h1>
        <p className="subtitle">Preencha os dados abaixo para enviar sua solicitação.</p>

        {error && <p className="error">{error}</p>}

        {/* Honeypot: invisível e fora da navegação por teclado pra gente de verdade, mas um
            bot que preenche todo <input> do formulário cai aqui. */}
        <label className="honeypot-field" aria-hidden="true">
          Site
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>

        <label>
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>

        {schema.fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.required && <span className="required">*</span>}
            {field.type === 'textarea' ? (
              <textarea
                value={String(fieldValues[field.key] ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            ) : field.type === 'select' ? (
              <select
                value={String(fieldValues[field.key] ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
              >
                <option value="">Selecione...</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'boolean' ? (
              <input
                type="checkbox"
                checked={Boolean(fieldValues[field.key])}
                onChange={(e) => setField(field.key, e.target.checked)}
              />
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={fieldValues[field.key] === undefined ? '' : String(fieldValues[field.key])}
                onChange={(e) => setField(field.key, e.target.value === '' ? '' : Number(e.target.value))}
              />
            ) : field.type === 'date' ? (
              <input
                type="date"
                value={String(fieldValues[field.key] ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            ) : field.type === 'currency' ? (
              <div className="currency-field-row">
                <span className="currency-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={fieldValues[field.key] === undefined ? '' : String(fieldValues[field.key])}
                  onChange={(e) => setField(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            ) : field.type === 'cpf_cnpj' ? (
              <input
                value={String(fieldValues[field.key] ?? '')}
                onChange={(e) => setField(field.key, maskCpfCnpj(e.target.value))}
                placeholder="CPF ou CNPJ"
                inputMode="numeric"
              />
            ) : (
              <input
                value={String(fieldValues[field.key] ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            )}
          </label>
        ))}

        <button type="submit" disabled={submitMutation.isPending}>
          {submitMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
          {submitMutation.isPending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
