import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import Icon from './Icon';

export default function PublicFormModal({ pipelineId, onClose }: { pipelineId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: info } = useQuery({
    queryKey: ['public-form', pipelineId],
    queryFn: () => PipelinesApi.getPublicFormInfo(pipelineId),
  });
  const [copied, setCopied] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['public-form', pipelineId] });

  const enableMutation = useMutation({ mutationFn: () => PipelinesApi.enablePublicForm(pipelineId), onSuccess: invalidate });
  const disableMutation = useMutation({ mutationFn: () => PipelinesApi.disablePublicForm(pipelineId), onSuccess: invalidate });
  const regenerateMutation = useMutation({
    mutationFn: () => PipelinesApi.regeneratePublicFormToken(pipelineId),
    onSuccess: invalidate,
  });

  const formUrl = info?.token ? `${window.location.origin}/forms/${info.token}` : null;

  function handleCopy() {
    if (!formUrl) return;
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Formulário público de entrada</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          <p className="topic-intro muted">
            Qualquer pessoa com o link pode criar um card diretamente na fase inicial deste pipeline, sem precisar de
            login. Útil para captar leads de um site ou formulário externo.
          </p>

          <div className="integration-status">
            <span className={`status-badge ${info?.enabled ? 'status-badge-active' : 'status-badge-inactive'}`}>
              {info?.enabled ? 'Ativo' : 'Desativado'}
            </span>
          </div>

          {info?.enabled && formUrl && (
            <div className="public-form-link-row">
              <input readOnly value={formUrl} onFocus={(e) => e.target.select()} />
              <button type="button" className="secondary-button" onClick={handleCopy}>
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
            </div>
          )}

          <div className="page-header-actions" style={{ marginTop: 16 }}>
            {info?.enabled ? (
              <>
                <button type="button" className="danger-button" onClick={() => disableMutation.mutate()}>
                  Desativar formulário
                </button>
                <button type="button" className="secondary-button" onClick={() => regenerateMutation.mutate()}>
                  Gerar novo link
                </button>
              </>
            ) : (
              <button type="button" onClick={() => enableMutation.mutate()}>
                Ativar formulário público
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
