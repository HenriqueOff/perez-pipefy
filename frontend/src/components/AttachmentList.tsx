import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import Icon from './Icon';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentList({
  pipelineId,
  cardId,
  canEdit,
}: {
  pipelineId: number;
  cardId: number;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const { data: attachments } = useQuery({
    queryKey: ['attachments', pipelineId, cardId],
    queryFn: () => PipelinesApi.listAttachments(pipelineId, cardId),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['attachments', pipelineId, cardId] }),
      queryClient.invalidateQueries({ queryKey: ['card', pipelineId, cardId] }),
    ]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => PipelinesApi.uploadAttachment(pipelineId, cardId, file),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível enviar o arquivo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => PipelinesApi.deleteAttachment(pipelineId, cardId, attachmentId),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível remover o anexo');
    },
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!canEdit) return;
    e.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDraggingOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    if (!canEdit) return;
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadMutation.mutate(file);
  }

  async function handleDownload(attachmentId: number, fileName: string) {
    setDownloadingId(attachmentId);
    try {
      const blob = await PipelinesApi.downloadAttachment(pipelineId, cardId, attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Não foi possível baixar o anexo');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div
      className={`attachment-section ${isDraggingOver ? 'attachment-section-drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {error && <p className="error">{error}</p>}
      {isDraggingOver && <p className="attachment-drop-hint">Solte o arquivo aqui pra anexar</p>}
      <ul className="attachment-list">
        {attachments?.map((a) => (
          <li key={a.id} className="attachment-row">
            <span className="attachment-icon" aria-hidden>
              <Icon name="paperclip" size={16} />
            </span>
            <div className="attachment-info">
              <button
                type="button"
                className="attachment-name"
                onClick={() => handleDownload(a.id, a.file_name)}
                disabled={downloadingId === a.id}
                title="Baixar arquivo"
              >
                {a.file_name}
              </button>
              <span className="muted">
                {formatSize(a.size)} · enviado por {a.uploader_name} em {new Date(a.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {canEdit && (
              <button
                type="button"
                className="icon-button"
                title="Remover anexo"
                onClick={() => deleteMutation.mutate(a.id)}
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </li>
        ))}
        {attachments?.length === 0 && <p className="muted">Nenhum anexo neste card.</p>}
      </ul>
      {canEdit && (
        <>
          <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
          <button
            type="button"
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending && <span className="button-spinner" aria-hidden="true" />}
            {uploadMutation.isPending ? 'Enviando...' : '+ Adicionar anexo'}
          </button>
        </>
      )}
    </div>
  );
}
