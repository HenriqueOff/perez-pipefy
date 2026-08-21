import { CardFieldValueModel } from '../models/cardFieldValue.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { CardModel } from '../models/card.model';
import { CustomFieldModel } from '../models/customField.model';
import { CustomFieldRow } from '../types/entities';
import { AppError } from '../utils/AppError';
import { evaluateFormula, extractFieldRefs, FormulaNode, parseFormula } from '../utils/formulaEvaluator';
import { logger } from '../utils/logger';

function buildFormulaGraph(fields: CustomFieldRow[], excludeFieldId?: number): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const field of fields) {
    if (field.type !== 'formula' || !field.formula) continue;
    if (excludeFieldId != null && field.id === excludeFieldId) continue;
    try {
      graph.set(field.key, extractFieldRefs(parseFormula(field.formula)));
    } catch {
      graph.set(field.key, []);
    }
  }
  return graph;
}

function hasCycle(graph: Map<string, string[]>, ownKey: string, refs: string[]): boolean {
  const visited = new Set<string>();
  function dfs(currentRefs: string[]): boolean {
    for (const ref of currentRefs) {
      if (ref === ownKey) return true;
      if (visited.has(ref)) continue;
      visited.add(ref);
      const next = graph.get(ref);
      if (next && dfs(next)) return true;
    }
    return false;
  }
  return dfs(refs);
}

export const FormulaFieldService = {
  /**
   * Valida sintaxe, referências a campos existentes e ausência de dependência circular.
   * `ownKey` é a key do campo sendo criado/editado; `excludeFieldId` (ao editar) evita
   * comparar a fórmula antiga do próprio campo contra a nova.
   */
  async validateFormula(pipelineId: number, ownKey: string, formula: string, excludeFieldId?: number): Promise<void> {
    const node = parseFormula(formula);
    const refs = extractFieldRefs(node);

    const fields = await CustomFieldModel.listByPipeline(pipelineId);
    const byKey = new Map(fields.map((f) => [f.key, f]));
    for (const ref of refs) {
      if (!byKey.has(ref)) {
        throw new AppError(`A fórmula referencia um campo inexistente: "${ref}"`, 422);
      }
    }

    const graph = buildFormulaGraph(fields, excludeFieldId);
    if (hasCycle(graph, ownKey, refs)) {
      throw new AppError('Essa fórmula cria uma dependência circular entre campos', 422);
    }
  },

  /**
   * Recalcula todos os campos-fórmula do pipeline do card, na ordem de dependência.
   * Best-effort: chamado depois que a escrita de campo que pode ter afetado uma fórmula
   * já foi commitada; erro em uma fórmula específica não derruba as demais nem a operação
   * que disparou o recálculo. Não dispara automações (evita cascata).
   */
  async recomputeForCard(cardId: number, actingUserId: number | null): Promise<void> {
    const card = await CardModel.findById(cardId);
    if (!card) return;

    const fields = await CustomFieldModel.listByPipeline(card.pipeline_id);
    const formulaFields = fields.filter((f) => f.type === 'formula' && f.formula);
    if (formulaFields.length === 0) return;

    const parsedByKey = new Map<string, { field: CustomFieldRow; node: FormulaNode; refs: string[] }>();
    for (const field of formulaFields) {
      try {
        const node = parseFormula(field.formula!);
        parsedByKey.set(field.key, { field, node, refs: extractFieldRefs(node) });
      } catch (err) {
        logger.warn({ err, fieldId: field.id }, 'Fórmula com erro de sintaxe ignorada no recálculo');
      }
    }

    const order: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    function visit(key: string) {
      if (visited.has(key) || visiting.has(key)) return;
      const entry = parsedByKey.get(key);
      if (!entry) return;
      visiting.add(key);
      for (const ref of entry.refs) visit(ref);
      visiting.delete(key);
      visited.add(key);
      order.push(key);
    }
    for (const key of parsedByKey.keys()) visit(key);

    const cardFieldValues = await CardFieldValueModel.listByCard(cardId);
    const fieldById = new Map(fields.map((f) => [f.id, f]));
    const valuesByKey: Record<string, unknown> = { title: card.title };
    for (const v of cardFieldValues) {
      const field = fieldById.get(v.custom_field_id);
      if (field) valuesByKey[field.key] = v.value;
    }

    for (const key of order) {
      const entry = parsedByKey.get(key)!;
      try {
        const result = evaluateFormula(entry.node, valuesByKey);
        valuesByKey[key] = result;
        const existing = await CardFieldValueModel.findOne(cardId, entry.field.id);
        await CardFieldValueModel.upsert(cardId, entry.field.id, result);
        await CardHistoryModel.record({
          card_id: cardId,
          user_id: actingUserId,
          event_type: 'field_updated',
          field_id: entry.field.id,
          old_value: existing?.value ?? null,
          new_value: result,
        });
      } catch (err) {
        logger.warn({ err, fieldId: entry.field.id, cardId }, 'Falha ao calcular fórmula no recálculo do card');
      }
    }
  },
};
