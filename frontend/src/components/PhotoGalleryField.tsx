import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import Icon from './Icon';

function Thumbnail({
  pipelineId,
  cardId,
  attachmentId,
  fileName,
  disabled,
  onRemove,
}: {
  pipelineId: number;
  cardId: number;
  attachmentId: number;
  fileName: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let currentUrl: string | null = null;
    let cancelled = false;
    PipelinesApi.downloadAttachment(pipelineId, cardId, attachmentId).then((blob) => {
      if (cancelled) return;
      currentUrl = URL.createObjectURL(blob);
      setObjectUrl(currentUrl);
    });
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [pipelineId, cardId, attachmentId]);

  return (
    <div className="photo-gallery-thumb">
      {objectUrl ? <img src={objectUrl} alt={fileName} /> : <div className="photo-gallery-thumb-loading" />}
      {!disabled && (
        <button type="button" className="photo-gallery-thumb-remove" title="Remover foto" onClick={onRemove}>
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
}

export default function PhotoGalleryField({
  pipelineId,
  cardId,
  value,
  disabled,
  onCommit,
}: {
  pipelineId: number;
  cardId: number;
  value: number[];
  disabled: boolean;
  onCommit: (value: number[]) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: attachments } = useQuery({
    queryKey: ['attachments', pipelineId, cardId],
    queryFn: () => PipelinesApi.listAttachments(pipelineId, cardId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => PipelinesApi.uploadAttachment(pipelineId, cardId, file),
    onSuccess: (attachment) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['attachments', pipelineId, cardId] });
      onCommit([...value, attachment.id]);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Não foi possível enviar a foto');
    },
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  }

  function handleRemove(attachmentId: number) {
    onCommit(value.filter((id) => id !== attachmentId));
  }

  const attachmentById = new Map((attachments ?? []).map((a) => [a.id, a]));

  return (
    <div className="photo-gallery-field">
      {error && <p className="error">{error}</p>}
      <div className="photo-gallery-grid">
        {value.map((id) => (
          <Thumbnail
            key={id}
            pipelineId={pipelineId}
            cardId={cardId}
            attachmentId={id}
            fileName={attachmentById.get(id)?.file_name ?? 'Foto'}
            disabled={disabled}
            onRemove={() => handleRemove(id)}
          />
        ))}
        {!disabled && (
          <button
            type="button"
            className="photo-gallery-add"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? <span className="button-spinner" aria-hidden="true" /> : '+'}
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
    </div>
  );
}
