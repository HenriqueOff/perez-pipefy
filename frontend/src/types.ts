export type GlobalRole = 'admin' | 'member';
export type PipelineRole = 'owner' | 'manager' | 'editor' | 'viewer';
export type CustomFieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'formula';

export interface User {
  id: number;
  name: string;
  email: string;
  role: GlobalRole;
}

export interface Pipeline {
  id: number;
  name: string;
  description: string | null;
  archived: boolean;
  created_by: number;
}

export interface PipelineOverviewItem extends Pipeline {
  cardCount: number;
  overdueCount: number;
  slaBreachedCount: number;
}

// Painel admin-only do pipe (engrenagem no board) — GET /pipelines/:id/audit-log
export interface AuditLogEntry {
  id: number;
  event_type: string;
  created_at: string;
  card_id: number;
  card_title: string;
  user_name: string | null;
}

// GET /pipelines/:id/admin-info
export interface PipelineAdminInfo {
  id: number;
  archived: boolean;
  public_form_enabled: boolean;
  pipefy_pipe_id: string | null;
  created_at: string;
  created_by_name: string | null;
  counts: {
    cards: number;
    phases: number;
    customFields: number;
    automations: number;
    labels: number;
    members: number;
    emailTemplates: number;
    connections: number;
  };
}

export interface RecentActivityItem {
  id: number;
  event_type: string;
  created_at: string;
  card_id: number;
  card_title: string;
  pipeline_id: number;
  pipeline_name: string;
  user_name: string | null;
}

export interface PipelinesOverview {
  pipelines: PipelineOverviewItem[];
  recentActivity: RecentActivityItem[];
}

export interface CustomField {
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
}

export interface Phase {
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
  customFields: CustomField[];
}

export interface PipelineMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  pipeline_role: PipelineRole;
}

export interface PipelineDetail extends Pipeline {
  phases: Phase[];
  members: PipelineMember[];
}

export interface CardFieldValue {
  id: number;
  card_id: number;
  custom_field_id: number;
  value: unknown;
}

export interface Label {
  id: number;
  pipeline_id?: number;
  name: string;
  color: string;
}

export interface CardAssignee {
  user_id: number;
  name: string;
}

export interface ChecklistItem {
  id: number;
  card_id: number;
  title: string;
  done: boolean;
  position: number;
}

export interface ChecklistSummary {
  total: number;
  done: number;
}

export interface Card {
  id: number;
  pipeline_id: number;
  current_phase_id: number;
  title: string;
  position: number;
  due_date: string | null;
  current_phase_since: string;
  fieldValues: CardFieldValue[];
  labels: Label[];
  assignees: CardAssignee[];
  checklistSummary: ChecklistSummary;
}

export interface CardHistoryEntry {
  id: number;
  event_type: string;
  from_phase_id: number | null;
  to_phase_id: number | null;
  field_id: number | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
  user_name: string | null;
}

export interface CardDetail extends Card {
  history: CardHistoryEntry[];
}

export interface Comment {
  id: number;
  card_id: number;
  user_id: number;
  user_name: string;
  body: string;
  created_at: string;
}

export interface Attachment {
  id: number;
  card_id: number;
  uploaded_by: number;
  uploader_name: string;
  file_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  // Só vêm preenchidos quando quem pediu a lista é admin (GET /users retorna um
  // conjunto reduzido de campos pra quem não é, ex. seletor de responsável).
  global_role?: GlobalRole;
  active?: boolean;
  created_at?: string;
}

export type AutomationTriggerType =
  | 'card_created_in_phase'
  | 'card_moved_to_phase'
  | 'card_left_phase'
  | 'field_updated'
  | 'sla_breached'
  | 'recurring_activity'
  | 'all_connected_cards_in_phase';
export type AutomationActionType =
  | 'move_to_phase'
  | 'assign_user'
  | 'add_label'
  | 'remove_label'
  | 'update_field'
  | 'create_card'
  | 'distribute_assignees'
  | 'send_email_template'
  | 'apply_sla_rule'
  | 'apply_formula'
  | 'http_request'
  | 'create_connected_card'
  | 'move_connected_cards';

export interface PipelineConnection {
  id: number;
  owner_pipeline_id: number;
  target_pipeline_id: number;
  name: string;
}

export interface ConnectedCardSummary {
  card_connection_id: number;
  pipeline_connection_id: number;
  card_id: number;
  title: string;
  pipeline_id: number;
  pipeline_name: string;
  phase_name: string;
}

export interface CardConnectionGroup {
  connection: PipelineConnection;
  cards: ConnectedCardSummary[];
}

export interface CardConnectionsResponse {
  asOwner: CardConnectionGroup[];
  asTarget: CardConnectionGroup[];
}

export interface SearchCardResult {
  card_id: number;
  title: string;
  pipeline_id: number;
  phase_name: string;
}

export interface EmailTemplate {
  id: number;
  pipeline_id: number;
  name: string;
  subject: string;
  body_html: string;
}

export interface Automation {
  id: number;
  pipeline_id: number;
  name: string;
  trigger_type: AutomationTriggerType;
  trigger_config: Record<string, unknown> | null;
  action_type: AutomationActionType;
  action_config: Record<string, unknown> | null;
  active: boolean;
}

export type NotificationType = 'card_assigned' | 'comment_added' | 'card_moved' | 'sla_breached' | 'mentioned';

export interface AppNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  card_id: number | null;
  pipeline_id: number | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface PublicFormInfo {
  enabled: boolean;
  token: string | null;
}

export interface PublicFormFieldSchema {
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[] | null;
  required: boolean;
}

export interface PublicFormSchema {
  pipeline_name: string;
  fields: PublicFormFieldSchema[];
}

export interface DashboardData {
  totalCards: number;
  cardsByPhase: { phase_id: number; phase_name: string; color: string | null; count: number }[];
  overdueCount: number;
  slaBreachedCount: number;
  cardsByAssignee: { user_id: number | null; name: string; count: number }[];
  avgTimeInPhase: { phase_id: number; phase_name: string; avg_hours: number | null; sample_size: number }[];
}

export interface ImoviewConfig {
  configured?: boolean;
  id?: number;
  provider?: 'imoview';
  base_url?: string;
  config?: Record<string, unknown> | null;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}
