import { Component, type ErrorInfo, type ReactNode } from 'react';

interface DemoBoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

interface DemoBoundaryState {
  failed: boolean;
}

export class DemoBoundary extends Component<DemoBoundaryProps, DemoBoundaryState> {
  state: DemoBoundaryState = { failed: false };

  static getDerivedStateFromError(): DemoBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Demo adapter failed', error.message, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="ipl-state-panel" role="alert">
          <span className="ipl-state-code">DEMO_UNAVAILABLE</span>
          <h3>交互案例暂不可用</h3>
          <p>模式说明和目录仍可使用。可重试加载，或先切换到其他模式。</p>
          <button type="button" className="ipl-primary-button" onClick={this.props.onRetry}>重试原型</button>
        </div>
      );
    }
    return this.props.children;
  }
}
