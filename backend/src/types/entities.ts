import {
  AutomationActionType,
  AutomationTriggerType,
  CardHistoryEventType,
  CustomFieldType,
  GlobalRole,
  IntegrationProvider,
  NotificationType,
  PipelineRole,
  SyncDirection,
  SyncStatus,
} from './enums';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  global_role: GlobalRole;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokenRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface PasswordResetTokenRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface PipelineRow {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  archived: boolean;
  public_form_token: string | null;
  public_form_enabled: boolean;
  pipefy_pipe_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PipelineMemberRow {
  id: number;
  pipeline_id: number;
  user_id: number;
  pipeline_role: PipelineRole;
  created_at: Date;
}

export interface PhaseRow {
  id: number;
  pipeline_id: number;
  name: string;
  position: number;
  color: string | null;
  is_initial: boolean;
  is_final: boolean;
  sla_hours: number | null;
  wip_limit: number | null;
  min_move_in_role: PipelineRole | null;
  min_move_out_role: PipelineRole | null;
  allow_manual_card_creation: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CustomFieldRow {
  id: number;
  phase_id: number;
  label: string;
  key: string;
  type: CustomFieldType;
  options: string[] | null;
  formula: string | null;
  min_view_role: PipelineRole | null;
  min_edit_role: PipelineRole | null;
  required: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface CardRow {
  id: number;
  pipeline_id: number;
  current_phase_id: number;
  title: string;
  created_by: number;
  position: number;
  due_date: string | null;
  current_phase_since: Date;
  sla_override_hours: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CardAssigneeRow {
  id: number;
  card_id: number;
  user_id: number;
  due_date: string | null;
  note: string | null;
  created_at: Date;
}

export interface CardFieldValueRow {
  id: number;
  card_id: number;
  custom_field_id: number;
  value: unknown;
  updated_at: Date;
}

export interface CardHistoryRow {
  id: number;
  card_id: number;
  user_id: number | null;
  event_type: CardHistoryEventType;
  from_phase_id: number | null;
  to_phase_id: number | null;
  field_id: number | null;
  old_value: unknown;
  new_value: unknown;
  created_at: Date;
}

export interface CommentRow {
  id: number;
  card_id: number;
  user_id: number;
  body: string;
  created_at: Date;
  updated_at: Date;
}

export interface LabelRow {
  id: number;
  pipeline_id: number;
  name: string;
  color: string;
  created_at: Date;
}

export interface CardLabelRow {
  id: number;
  card_id: number;
  label_id: number;
  created_at: Date;
}

export interface AttachmentRow {
  id: number;
  card_id: number;
  uploaded_by: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  created_at: Date;
}

export interface IntegrationConfigRow {
  id: number;
  provider: IntegrationProvider;
  base_url: string;
  credentials_encrypted: string;
  config: Record<string, unknown> | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface ImoviewSyncLogRow {
  id: number;
  integration_config_id: number;
  direction: SyncDirection;
  entity_type: string;
  external_id: string | null;
  internal_id: number | null;
  status: SyncStatus;
  payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: Date;
}

export interface AutomationRow {
  id: number;
  pipeline_id: number;
  name: string;
  trigger_type: AutomationTriggerType;
  trigger_config: Record<string, unknown> | null;
  action_type: AutomationActionType;
  action_config: Record<string, unknown> | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplateRow {
  id: number;
  pipeline_id: number;
  name: string;
  subject: string;
  body_html: string;
  created_at: Date;
  updated_at: Date;
}

export interface PipelineConnectionRow {
  id: number;
  owner_pipeline_id: number;
  target_pipeline_id: number;
  name: string;
  created_at: Date;
}

export interface CardConnectionRow {
  id: number;
  pipeline_connection_id: number;
  owner_card_id: number;
  target_card_id: number;
  created_at: Date;
}

export interface AutomationRecurrenceRow {
  id: number;
  automation_id: number;
  card_id: number;
  last_fired_at: Date;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  type: NotificationType;
  card_id: number | null;
  pipeline_id: number | null;
  message: string;
  read_at: Date | null;
  created_at: Date;
}

export interface ChecklistItemRow {
  id: number;
  card_id: number;
  title: string;
  done: boolean;
  position: number;
  created_at: Date;
}

export interface CardExternalRefRow {
  id: number;
  card_id: number;
  provider: IntegrationProvider;
  external_id: string;
  external_type: string;
  last_synced_at: Date | null;
}

export interface DatabaseRow {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseMemberRow {
  id: number;
  database_id: number;
  user_id: number;
  database_role: PipelineRole;
  created_at: Date;
}

export interface DatabaseFieldRow {
  id: number;
  database_id: number;
  label: string;
  key: string;
  type: CustomFieldType;
  options: string[] | null;
  required: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseRecordRow {
  id: number;
  database_id: number;
  title: string;
  created_by: number;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseRecordFieldValueRow {
  id: number;
  record_id: number;
  database_field_id: number;
  value: unknown;
  updated_at: Date;
}
