export type GlobalRole = 'admin' | 'member';

export type ThemePreference = 'system' | 'light' | 'dark';

export type PipelineRole = 'owner' | 'manager' | 'editor' | 'viewer';

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'formula'
  | 'database_link'
  | 'photo_gallery'
  | 'phone';

export type CardHistoryEventType =
  | 'created'
  | 'moved'
  | 'field_updated'
  | 'assigned'
  | 'comment_added'
  | 'attachment_added';

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

export type NotificationType =
  | 'card_assigned'
  | 'comment_added'
  | 'card_moved'
  | 'sla_breached'
  | 'mentioned';

export type IntegrationProvider = 'imoview';

export type SyncDirection = 'import' | 'export';

export type SyncStatus = 'success' | 'error';
