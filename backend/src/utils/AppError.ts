export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static notFound(message = 'Recurso não encontrado'): AppError {
    return new AppError(message, 404);
  }

  static forbidden(message = 'Acesso negado'): AppError {
    return new AppError(message, 403);
  }

  static unauthorized(message = 'Não autenticado'): AppError {
    return new AppError(message, 401);
  }

  static conflict(message = 'Conflito de dados'): AppError {
    return new AppError(message, 409);
  }
}
