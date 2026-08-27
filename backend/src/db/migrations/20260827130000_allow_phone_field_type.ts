import type { Knex } from 'knex';

/**
 * `custom_fields.type` ganha 'phone' — campo de texto que, além do input normal, ganha
 * um botão "Abrir no WhatsApp" no card (link wa.me, sem precisar de credencial nenhuma
 * do WhatsApp Business API).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula','database_link','photo_gallery','phone'))`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula','database_link','photo_gallery'))`
  );
}
