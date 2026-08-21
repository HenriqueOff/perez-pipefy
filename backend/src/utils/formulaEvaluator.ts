import { AppError } from './AppError';

type FormulaNode =
  | { type: 'num'; value: number }
  | { type: 'ref'; key: string }
  | { type: 'call'; name: string; args: FormulaNode[] }
  | { type: 'unary'; op: '-'; arg: FormulaNode }
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '%'; left: FormulaNode; right: FormulaNode };

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '%' | '(' | ')' | ',' }
  | { type: 'eof' };

const FUNCTIONS: Record<string, number> = { ROUND: 2, MIN: 2, MAX: 2, ABS: 1 };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      const raw = input.slice(i, j);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new AppError(`Número inválido na fórmula: "${raw}"`, 422);
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < input.length && /[a-zA-Z0-9_]/.test(input[j])) j++;
      tokens.push({ type: 'ident', value: input.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/%(),'.includes(c)) {
      tokens.push({ type: 'op', value: c as '+' | '-' | '*' | '/' | '%' | '(' | ')' | ',' });
      i++;
      continue;
    }
    throw new AppError(`Caractere inválido na fórmula: "${c}"`, 422);
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private expectOp(value: string) {
    const t = this.next();
    if (t.type !== 'op' || t.value !== value) {
      throw new AppError(`Fórmula inválida: esperava "${value}"`, 422);
    }
  }

  parse(): FormulaNode {
    const node = this.parseExpr();
    if (this.peek().type !== 'eof') {
      throw new AppError('Fórmula inválida: caracteres extras no final', 422);
    }
    return node;
  }

  private parseExpr(): FormulaNode {
    let node = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t.type === 'op' && (t.value === '+' || t.value === '-')) {
        this.next();
        node = { type: 'binary', op: t.value, left: node, right: this.parseTerm() };
      } else {
        break;
      }
    }
    return node;
  }

  private parseTerm(): FormulaNode {
    let node = this.parseFactor();
    for (;;) {
      const t = this.peek();
      if (t.type === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        this.next();
        node = { type: 'binary', op: t.value, left: node, right: this.parseFactor() };
      } else {
        break;
      }
    }
    return node;
  }

  private parseFactor(): FormulaNode {
    const t = this.peek();
    if (t.type === 'op' && t.value === '-') {
      this.next();
      return { type: 'unary', op: '-', arg: this.parseFactor() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FormulaNode {
    const t = this.next();
    if (t.type === 'num') return { type: 'num', value: t.value };
    if (t.type === 'ident') {
      if (this.peek().type === 'op' && (this.peek() as { type: 'op'; value: string }).value === '(') {
        this.next();
        const args: FormulaNode[] = [];
        if (!(this.peek().type === 'op' && (this.peek() as { type: 'op'; value: string }).value === ')')) {
          args.push(this.parseExpr());
          while (this.peek().type === 'op' && (this.peek() as { type: 'op'; value: string }).value === ',') {
            this.next();
            args.push(this.parseExpr());
          }
        }
        this.expectOp(')');
        const name = t.value.toUpperCase();
        const arity = FUNCTIONS[name];
        if (arity === undefined) {
          throw new AppError(`Fórmula inválida: função desconhecida "${t.value}"`, 422);
        }
        if (args.length !== arity) {
          throw new AppError(`Fórmula inválida: ${name} espera ${arity} argumento(s)`, 422);
        }
        return { type: 'call', name, args };
      }
      return { type: 'ref', key: t.value };
    }
    if (t.type === 'op' && t.value === '(') {
      const node = this.parseExpr();
      this.expectOp(')');
      return node;
    }
    throw new AppError('Fórmula inválida: expressão incompleta', 422);
  }
}

export function parseFormula(expression: string): FormulaNode {
  if (!expression || !expression.trim()) {
    throw new AppError('Fórmula vazia', 422);
  }
  return new Parser(tokenize(expression)).parse();
}

export function extractFieldRefs(node: FormulaNode): string[] {
  const refs = new Set<string>();
  function walk(n: FormulaNode) {
    switch (n.type) {
      case 'ref':
        refs.add(n.key);
        break;
      case 'unary':
        walk(n.arg);
        break;
      case 'binary':
        walk(n.left);
        walk(n.right);
        break;
      case 'call':
        n.args.forEach(walk);
        break;
    }
  }
  walk(node);
  return Array.from(refs);
}

function toNumber(value: unknown, key: string): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (value == null || value === '' || !Number.isFinite(num)) {
    throw new AppError(`Campo "${key}" não tem um valor numérico`, 422);
  }
  return num;
}

export function evaluateFormula(node: FormulaNode, values: Record<string, unknown>): number {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'ref':
      return toNumber(values[node.key], node.key);
    case 'unary':
      return -evaluateFormula(node.arg, values);
    case 'binary': {
      const left = evaluateFormula(node.left, values);
      const right = evaluateFormula(node.right, values);
      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          if (right === 0) throw new AppError('Divisão por zero na fórmula', 422);
          return left / right;
        case '%':
          if (right === 0) throw new AppError('Divisão por zero na fórmula', 422);
          return left % right;
      }
      break;
    }
    case 'call': {
      const args = node.args.map((a) => evaluateFormula(a, values));
      switch (node.name) {
        case 'ROUND': {
          const factor = 10 ** args[1];
          return Math.round(args[0] * factor) / factor;
        }
        case 'MIN':
          return Math.min(args[0], args[1]);
        case 'MAX':
          return Math.max(args[0], args[1]);
        case 'ABS':
          return Math.abs(args[0]);
        default:
          throw new AppError(`Função desconhecida "${node.name}"`, 422);
      }
    }
  }
}

export type { FormulaNode };
