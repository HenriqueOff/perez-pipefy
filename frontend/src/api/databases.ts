import { api } from './client';
import {
  Database,
  DatabaseDetail,
  DatabaseField,
  DatabaseFieldType,
  DatabaseMember,
  DatabaseRecord,
  DatabaseRecordsResponse,
  PipelineRole,
} from '../types';

export const DatabasesApi = {
  list: () => api.get<Database[]>('/databases').then((r) => r.data),
  detail: (id: number) => api.get<DatabaseDetail>(`/databases/${id}`).then((r) => r.data),
  create: (input: { name: string; description?: string }) =>
    api.post<Database>('/databases', input).then((r) => r.data),
  update: (id: number, changes: { name?: string; description?: string | null; archived?: boolean }) =>
    api.patch<Database>(`/databases/${id}`, changes).then((r) => r.data),

  listMembers: (id: number) => api.get<DatabaseMember[]>(`/databases/${id}/members`).then((r) => r.data),
  addMember: (id: number, input: { userId: number; role: PipelineRole }) =>
    api.post<DatabaseMember>(`/databases/${id}/members`, input).then((r) => r.data),
  removeMember: (id: number, userId: number) => api.delete(`/databases/${id}/members/${userId}`).then((r) => r.data),

  createField: (
    id: number,
    input: { label: string; key: string; type: DatabaseFieldType; options?: string[]; required?: boolean }
  ) => api.post<DatabaseField>(`/databases/${id}/fields`, input).then((r) => r.data),
  updateField: (
    id: number,
    fieldId: number,
    changes: { label?: string; options?: string[]; required?: boolean; position?: number }
  ) => api.patch<DatabaseField>(`/databases/${id}/fields/${fieldId}`, changes).then((r) => r.data),
  deleteField: (id: number, fieldId: number) => api.delete(`/databases/${id}/fields/${fieldId}`).then((r) => r.data),

  listRecords: (id: number) => api.get<DatabaseRecordsResponse>(`/databases/${id}/records`).then((r) => r.data),
  createRecord: (id: number, input: { title: string; fields?: Record<string, unknown> }) =>
    api.post<DatabaseRecord>(`/databases/${id}/records`, input).then((r) => r.data),
  updateRecord: (id: number, recordId: number, changes: { title?: string }) =>
    api.patch<DatabaseRecord>(`/databases/${id}/records/${recordId}`, changes).then((r) => r.data),
  updateRecordFields: (id: number, recordId: number, fields: Record<string, unknown>) =>
    api.patch(`/databases/${id}/records/${recordId}/fields`, { fields }).then((r) => r.data),
  deleteRecord: (id: number, recordId: number) => api.delete(`/databases/${id}/records/${recordId}`).then((r) => r.data),
};
