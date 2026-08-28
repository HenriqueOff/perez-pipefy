import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Sem isto, um erro de render em qualquer página derruba a árvore inteira e deixa a tela
 * branca sem nenhuma pista. Aqui mostramos um aviso e um botão de recarregar. (Quando
 * houver Sentry, é aqui que o erro deve ser reportado.)
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary capturou um erro de render:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-fallback">
          <div className="app-error-card">
            <h1>Algo deu errado</h1>
            <p>Ocorreu um erro inesperado ao carregar esta tela.</p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
