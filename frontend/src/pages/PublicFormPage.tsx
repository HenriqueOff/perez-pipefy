import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PublicFormApi } from '../api/publicForm';

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

  const submitMutation = useMutation({
    mutationFn: () => PublicFormApi.submit(token!, { title: title.trim(), fields: fieldValues }),
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
            ) : (
              <input
                value={String(fieldValues[field.key] ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            )}
          </label>
        ))}

        <button type="submit" disabled={submitMutation.isPending}>
          {submitMutation.isPending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
