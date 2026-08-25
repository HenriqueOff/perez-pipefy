import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabasesApi } from '../api/databases';
import { Database } from '../types';
import Icon from './Icon';

interface Props {
  database: Database;
  onClose: () => void;
}

export default function DatabaseSettingsModal({ database, onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(database.name);
  const [description, setDescription] = useState(database.description ?? '');
  const [category, setCategory] = useState(database.category ?? '');
  const [error, setError] = useState<string | null>(null);

  const { data: allDatabases } = useQuery({ queryKey: ['databases'], queryFn: DatabasesApi.list });
  const existingCategories = [...new Set((allDatabases ?? []).map((d) => d.category?.trim()).filter(Boolean))] as string[];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['database', database.id] });
    queryClient.invalidateQueries({ queryKey: ['databases'] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      DatabasesApi.update(database.id, {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
      }),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível salvar');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => DatabasesApi.update(database.id, { archived: !database.archived }),
    onSuccess: invalidate,
  });

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configurações do database</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}

          <form onSubmit={handleSave}>
            <label>
              Nome
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Descrição
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              Setor
              <input
                list="database-settings-categories"
                placeholder="Ex: Pessoas, Imóveis, Financeiro..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <span className="muted">Define em qual grupo este database aparece na aba Databases.</span>
            </label>
            <datalist id="database-settings-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="page-header-actions">
              <button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
                Salvar
              </button>
            </div>
          </form>

          <hr className="div" />

          <div className="admin-only-setting">
            <strong>Zona de risco</strong>
            <p className="muted">
              {database.archived
                ? 'Este database está arquivado — some das listagens, mas nenhum dado foi apagado.'
                : 'Arquivar remove este database das listagens de todos os membros. Não apaga nada.'}
            </p>
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                if (database.archived || confirm(`Arquivar o database "${database.name}"? Ele some das listagens de todos os membros até você reverter.`)) {
                  archiveMutation.mutate();
                }
              }}
            >
              {database.archived ? 'Reativar database' : 'Arquivar database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
