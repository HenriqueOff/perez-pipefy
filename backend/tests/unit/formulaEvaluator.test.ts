import { evaluateFormula, extractFieldRefs, parseFormula } from '../../src/utils/formulaEvaluator';

describe('formulaEvaluator', () => {
  describe('parseFormula + evaluateFormula', () => {
    it('avalia aritmética simples com precedência correta', () => {
      const node = parseFormula('2 + 3 * 4');
      expect(evaluateFormula(node, {})).toBe(14);
    });

    it('respeita parênteses', () => {
      const node = parseFormula('(2 + 3) * 4');
      expect(evaluateFormula(node, {})).toBe(20);
    });

    it('resolve referências a campos pela key', () => {
      const node = parseFormula('valor_venda * comissao_pct / 100');
      expect(evaluateFormula(node, { valor_venda: 200000, comissao_pct: 6 })).toBe(12000);
    });

    it('suporta unário negativo', () => {
      const node = parseFormula('-x + 10');
      expect(evaluateFormula(node, { x: 3 })).toBe(7);
    });

    it('suporta módulo', () => {
      const node = parseFormula('10 % 3');
      expect(evaluateFormula(node, {})).toBe(1);
    });

    it('ROUND arredonda casas decimais', () => {
      const node = parseFormula('ROUND(x, 2)');
      expect(evaluateFormula(node, { x: 3.14159 })).toBe(3.14);
    });

    it('MIN e MAX', () => {
      expect(evaluateFormula(parseFormula('MIN(a, b)'), { a: 5, b: 2 })).toBe(2);
      expect(evaluateFormula(parseFormula('MAX(a, b)'), { a: 5, b: 2 })).toBe(5);
    });

    it('ABS', () => {
      expect(evaluateFormula(parseFormula('ABS(x)'), { x: -7 })).toBe(7);
    });

    it('lança erro pra referência sem valor numérico', () => {
      const node = parseFormula('x + 1');
      expect(() => evaluateFormula(node, { x: 'abc' })).toThrow();
      expect(() => evaluateFormula(node, {})).toThrow();
    });

    it('lança erro pra divisão por zero', () => {
      const node = parseFormula('x / y');
      expect(() => evaluateFormula(node, { x: 1, y: 0 })).toThrow();
    });

    it('lança erro de sintaxe pra expressão inválida', () => {
      expect(() => parseFormula('2 + * 3')).toThrow();
      expect(() => parseFormula('(2 + 3')).toThrow();
      expect(() => parseFormula('')).toThrow();
    });

    it('lança erro pra função desconhecida ou aridade errada', () => {
      expect(() => parseFormula('SOMA(1, 2)')).toThrow();
      expect(() => parseFormula('ABS(1, 2)')).toThrow();
    });
  });

  describe('extractFieldRefs', () => {
    it('extrai todas as keys referenciadas, sem duplicar', () => {
      const node = parseFormula('a + b * a - ROUND(c, 2)');
      expect(extractFieldRefs(node).sort()).toEqual(['a', 'b', 'c']);
    });

    it('retorna vazio pra expressão sem referências', () => {
      const node = parseFormula('1 + 2 * 3');
      expect(extractFieldRefs(node)).toEqual([]);
    });
  });
});
