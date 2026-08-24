import { api } from './client';
import {
  Attachment,
  AuditLogEntry,
  Automation,
  AutomationActionType,
  AutomationTriggerType,
  Card,
  CardAssignee,
  CardConnectionsResponse,
  CardDetail,
  ChecklistItem,
  Comment,
  DashboardData,
  EmailTemplate,
  PipelineAdminInfo,
  PipelineConnection,
  PublicFormInfo,
  CustomField,
  CustomFieldType,
  Label,
  Phase,
  Pipeline,
  PipelineDetail,
  PipelineMember,
  PipelineRole,
  PipelinesOverview,
  SearchCardResult,
} from '../types';

export const PipelinesApi = {
  list: () => api.get<Pipeline[]>('/pipelines').then((r) => r.data),
  overview: () => api.get<PipelinesOverview>('/pipelines/overview').then((r) => r.data),
  detail: (id: number) => api.get<PipelineDetail>(`/pipelines/${id}`).then((r) => r.data),
  create: (input: { name: string; description?: string }) =>
    api.post<Pipeline>('/pipelines', input).then((r) => r.data),
  update: (id: number, changes: { name?: string; description?: string | null; archived?: boolean }) =>
    api.patch<Pipeline>(`/pipelines/${id}`, changes).then((r) => r.data),

  auditLog: (id: number, params?: { limit?: number; offset?: number }) =>
    api.get<AuditLogEntry[]>(`/pipelines/${id}/audit-log`, { params }).then((r) => r.data),
  adminInfo: (id: number) => api.get<PipelineAdminInfo>(`/pipelines/${id}/admin-info`).then((r) => r.data),

  createPhase: (pipelineId: number, input: { name: string; is_initial?: boolean; is_final?: boolean }) =>
    api.post<Phase>(`/pipelines/${pipelineId}/phases`, input).then((r) => r.data),

  updatePhase: (
    pipelineId: number,
    phaseId: number,
    changes: {
      name?: string;
      position?: number;
      color?: string | null;
      is_initial?: boolean;
      is_final?: boolean;
      sla_hours?: number | null;
      wip_limit?: number | null;
      min_move_in_role?: PipelineRole | null;
      min_move_out_role?: PipelineRole | null;
    }
  ) => api.patch<Phase>(`/pipelines/${pipelineId}/phases/${phaseId}`, changes).then((r) => r.data),

  deletePhase: (pipelineId: number, phaseId: number) =>
    api.delete(`/pipelines/${pipelineId}/phases/${phaseId}`).then((r) => r.data),

  setPhaseManualCardCreation: (pipelineId: number, phaseId: number, allow: boolean) =>
    api.patch<Phase>(`/pipelines/${pipelineId}/phases/${phaseId}/manual-card-creation`, { allow }).then((r) => r.data),

  createCustomField: (
    pipelineId: number,
    phaseId: number,
    input: {
      label: string;
      key: string;
      type: CustomFieldType;
      options?: string[];
      formula?: string;
      min_view_role?: PipelineRole | null;
      min_edit_role?: PipelineRole | null;
      required?: boolean;
    }
  ) => api.post<CustomField>(`/pipelines/${pipelineId}/phases/${phaseId}/fields`, input).then((r) => r.data),

  updateCustomField: (
    pipelineId: number,
    phaseId: number,
    fieldId: number,
    changes: {
      label?: string;
      options?: string[];
      formula?: string;
      min_view_role?: PipelineRole | null;
      min_edit_role?: PipelineRole | null;
      required?: boolean;
      position?: number;
    }
  ) =>
    api
      .patch<CustomField>(`/pipelines/${pipelineId}/phases/${phaseId}/fields/${fieldId}`, changes)
      .then((r) => r.data),

  deleteCustomField: (pipelineId: number, phaseId: number, fieldId: number) =>
    api.delete(`/pipelines/${pipelineId}/phases/${phaseId}/fields/${fieldId}`).then((r) => r.data),

  listAttachments: (pipelineId: number, cardId: number) =>
    api.get<Attachment[]>(`/pipelines/${pipelineId}/cards/${cardId}/attachments`).then((r) => r.data),

  uploadAttachment: (pipelineId: number, cardId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<Attachment>(`/pipelines/${pipelineId}/cards/${cardId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  deleteAttachment: (pipelineId: number, cardId: number, attachmentId: number) =>
    api.delete(`/pipelines/${pipelineId}/cards/${cardId}/attachments/${attachmentId}`).then((r) => r.data),

  downloadAttachment: (pipelineId: number, cardId: number, attachmentId: number) =>
    api
      .get(`/pipelines/${pipelineId}/cards/${cardId}/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),

  listAutomations: (pipelineId: number) =>
    api.get<Automation[]>(`/pipelines/${pipelineId}/automations`).then((r) => r.data),

  createAutomation: (
    pipelineId: number,
    input: {
      name: string;
      trigger_type: AutomationTriggerType;
      trigger_config?: Record<string, unknown> | null;
      action_type: AutomationActionType;
      action_config?: Record<string, unknown> | null;
      active?: boolean;
    }
  ) => api.post<Automation>(`/pipelines/${pipelineId}/automations`, input).then((r) => r.data),

  updateAutomation: (
    pipelineId: number,
    automationId: number,
    changes: {
      name?: string;
      trigger_config?: Record<string, unknown> | null;
      action_type?: AutomationActionType;
      action_config?: Record<string, unknown> | null;
      active?: boolean;
    }
  ) => api.patch<Automation>(`/pipelines/${pipelineId}/automations/${automationId}`, changes).then((r) => r.data),

  deleteAutomation: (pipelineId: number, automationId: number) =>
    api.delete(`/pipelines/${pipelineId}/automations/${automationId}`).then((r) => r.data),

  listEmailTemplates: (pipelineId: number) =>
    api.get<EmailTemplate[]>(`/pipelines/${pipelineId}/email-templates`).then((r) => r.data),

  createEmailTemplate: (pipelineId: number, input: { name: string; subject: string; body_html: string }) =>
    api.post<EmailTemplate>(`/pipelines/${pipelineId}/email-templates`, input).then((r) => r.data),

  updateEmailTemplate: (
    pipelineId: number,
    templateId: number,
    changes: { name?: string; subject?: string; body_html?: string }
  ) => api.patch<EmailTemplate>(`/pipelines/${pipelineId}/email-templates/${templateId}`, changes).then((r) => r.data),

  deleteEmailTemplate: (pipelineId: number, templateId: number) =>
    api.delete(`/pipelines/${pipelineId}/email-templates/${templateId}`).then((r) => r.data),

  listPipelineConnections: (pipelineId: number) =>
    api
      .get<{ asOwner: PipelineConnection[]; asTarget: PipelineConnection[] }>(`/pipelines/${pipelineId}/connections`)
      .then((r) => r.data),

  createPipelineConnection: (pipelineId: number, input: { target_pipeline_id: number; name: string }) =>
    api.post<PipelineConnection>(`/pipelines/${pipelineId}/connections`, input).then((r) => r.data),

  deletePipelineConnection: (pipelineId: number, connectionId: number) =>
    api.delete(`/pipelines/${pipelineId}/connections/${connectionId}`).then((r) => r.data),

  listCardConnections: (pipelineId: number, cardId: number) =>
    api.get<CardConnectionsResponse>(`/pipelines/${pipelineId}/cards/${cardId}/connections`).then((r) => r.data),

  attachCardConnection: (
    pipelineId: number,
    cardId: number,
    input: { pipeline_connection_id: number; from_side: 'owner' | 'target'; other_card_id: number }
  ) => api.post(`/pipelines/${pipelineId}/cards/${cardId}/connections`, input).then((r) => r.data),

  detachCardConnection: (pipelineId: number, cardId: number, cardConnectionId: number) =>
    api.delete(`/pipelines/${pipelineId}/cards/${cardId}/connections/${cardConnectionId}`).then((r) => r.data),

  searchConnectableCards: (pipelineId: number, q: string, excludeCardIds: number[]) =>
    api
      .get<SearchCardResult[]>(`/pipelines/${pipelineId}/cards/search-connectable`, {
        params: { q, exclude: excludeCardIds.join(',') },
      })
      .then((r) => r.data),

  getPublicFormInfo: (pipelineId: number) =>
    api.get<PublicFormInfo>(`/pipelines/${pipelineId}/public-form`).then((r) => r.data),

  enablePublicForm: (pipelineId: number) =>
    api.post<PublicFormInfo>(`/pipelines/${pipelineId}/public-form/enable`).then((r) => r.data),

  disablePublicForm: (pipelineId: number) =>
    api.post<PublicFormInfo>(`/pipelines/${pipelineId}/public-form/disable`).then((r) => r.data),

  regeneratePublicFormToken: (pipelineId: number) =>
    api.post<PublicFormInfo>(`/pipelines/${pipelineId}/public-form/regenerate`).then((r) => r.data),

  dashboard: (pipelineId: number) => api.get<DashboardData>(`/pipelines/${pipelineId}/dashboard`).then((r) => r.data),

  listLabels: (pipelineId: number) => api.get<Label[]>(`/pipelines/${pipelineId}/labels`).then((r) => r.data),

  createLabel: (pipelineId: number, input: { name: string; color?: string }) =>
    api.post<Label>(`/pipelines/${pipelineId}/labels`, input).then((r) => r.data),

  updateLabel: (pipelineId: number, labelId: number, changes: { name?: string; color?: string }) =>
    api.patch<Label>(`/pipelines/${pipelineId}/labels/${labelId}`, changes).then((r) => r.data),

  deleteLabel: (pipelineId: number, labelId: number) =>
    api.delete(`/pipelines/${pipelineId}/labels/${labelId}`).then((r) => r.data),

  attachLabel: (pipelineId: number, cardId: number, labelId: number) =>
    api.post<Label[]>(`/pipelines/${pipelineId}/cards/${cardId}/labels`, { label_id: labelId }).then((r) => r.data),

  detachLabel: (pipelineId: number, cardId: number, labelId: number) =>
    api.delete<Label[]>(`/pipelines/${pipelineId}/cards/${cardId}/labels/${labelId}`).then((r) => r.data),

  listChecklist: (pipelineId: number, cardId: number) =>
    api.get<ChecklistItem[]>(`/pipelines/${pipelineId}/cards/${cardId}/checklist`).then((r) => r.data),

  createChecklistItem: (pipelineId: number, cardId: number, title: string) =>
    api.post<ChecklistItem>(`/pipelines/${pipelineId}/cards/${cardId}/checklist`, { title }).then((r) => r.data),

  updateChecklistItem: (
    pipelineId: number,
    cardId: number,
    itemId: number,
    changes: { title?: string; done?: boolean; position?: number }
  ) =>
    api
      .patch<ChecklistItem>(`/pipelines/${pipelineId}/cards/${cardId}/checklist/${itemId}`, changes)
      .then((r) => r.data),

  deleteChecklistItem: (pipelineId: number, cardId: number, itemId: number) =>
    api.delete(`/pipelines/${pipelineId}/cards/${cardId}/checklist/${itemId}`).then((r) => r.data),

  listCards: (pipelineId: number) => api.get<Card[]>(`/pipelines/${pipelineId}/cards`).then((r) => r.data),

  cardDetail: (pipelineId: number, cardId: number) =>
    api.get<CardDetail>(`/pipelines/${pipelineId}/cards/${cardId}`).then((r) => r.data),

  createCard: (pipelineId: number, input: { title: string; phase_id?: number; assignee_ids?: number[] }) =>
    api.post<Card>(`/pipelines/${pipelineId}/cards`, input).then((r) => r.data),

  moveCard: (pipelineId: number, cardId: number, toPhaseId: number) =>
    api.post<Card>(`/pipelines/${pipelineId}/cards/${cardId}/move`, { to_phase_id: toPhaseId }).then((r) => r.data),

  updateCard: (pipelineId: number, cardId: number, changes: { title?: string; due_date?: string | null }) =>
    api.patch<Card>(`/pipelines/${pipelineId}/cards/${cardId}`, changes).then((r) => r.data),

  addAssignee: (pipelineId: number, cardId: number, userId: number) =>
    api
      .post<CardAssignee[]>(`/pipelines/${pipelineId}/cards/${cardId}/assignees`, { user_id: userId })
      .then((r) => r.data),

  removeAssignee: (pipelineId: number, cardId: number, userId: number) =>
    api
      .delete<CardAssignee[]>(`/pipelines/${pipelineId}/cards/${cardId}/assignees/${userId}`)
      .then((r) => r.data),

  updateCardFields: (pipelineId: number, cardId: number, fields: Record<string, unknown>) =>
    api.patch(`/pipelines/${pipelineId}/cards/${cardId}/fields`, { fields }).then((r) => r.data),

  listMembers: (pipelineId: number) => api.get<PipelineMember[]>(`/pipelines/${pipelineId}/members`).then((r) => r.data),

  addMember: (pipelineId: number, input: { userId: number; role: PipelineRole }) =>
    api.post(`/pipelines/${pipelineId}/members`, input).then((r) => r.data),

  removeMember: (pipelineId: number, userId: number) =>
    api.delete(`/pipelines/${pipelineId}/members/${userId}`).then((r) => r.data),

  listComments: (pipelineId: number, cardId: number) =>
    api.get<Comment[]>(`/pipelines/${pipelineId}/cards/${cardId}/comments`).then((r) => r.data),

  createComment: (pipelineId: number, cardId: number, body: string) =>
    api.post<Comment>(`/pipelines/${pipelineId}/cards/${cardId}/comments`, { body }).then((r) => r.data),
};
