import type { Knex } from 'knex';

/**
 * `custom_fields.type` ganha 'photo_gallery' — campo que guarda um array de ids de
 * `attachments` (a galeria em si reaproveita o upload/storage de anexos já existente).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula','database_link','photo_gallery'))`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula','database_link'))`
  );
}
