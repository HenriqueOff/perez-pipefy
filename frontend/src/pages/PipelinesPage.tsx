import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PipelinesApi } from '../api/pipelines';

export default function PipelinesPage() {
  const queryClient = useQueryClient();
  const { data: pipelines, isLoading } = useQuery({ queryKey: ['pipelines'], queryFn: PipelinesApi.list });
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input: { name: string }) => PipelinesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      setName('');
      setCreating(false);
    },
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim() });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Pipelines</h1>
        <button onClick={() => setCreating((v) => !v)}>{creating ? 'Cancelar' : 'Novo pipeline'}</button>
      </div>

      {creating && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input
            placeholder="Nome do pipeline (ex: Captação de imóveis)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={createMutation.isPending}>
            Criar
          </button>
        </form>
      )}

      {isLoading && <p>Carregando...</p>}

      <div className="pipeline-grid">
        {pipelines?.map((pipeline) => (
          <Link to={`/pipelines/${pipeline.id}`} key={pipeline.id} className="pipeline-card">
            <h3>{pipeline.name}</h3>
            {pipeline.description && <p>{pipeline.description}</p>}
          </Link>
        ))}
        {pipelines?.length === 0 && <p>Nenhum pipeline ainda. Crie o primeiro acima.</p>}
      </div>
    </div>
  );
}
