import { useEffect, useRef, useState } from 'react';
import { approvalChannel, approvalHostPath, approvalPreviewOrigin, parsePreviewMessage } from './protocol';
import './approval-preview.css';

export function ApprovalPreviewFrame({ route, refreshKey, onNavigate, onState }: {
  route: string; refreshKey: number;
  onNavigate: (path: string) => void;
  onState: (path: string, title: string, count: number, dirty: boolean) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const current = useRef({ route, refreshKey, onNavigate, onState });
  current.current = { route, refreshKey, onNavigate, onState };
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const ready = useRef(false);
  const send = () => frame.current?.contentWindow?.postMessage({ channel: approvalChannel, version: 1, type: 'route', route: current.current.route, refreshKey: current.current.refreshKey }, approvalPreviewOrigin);
  useEffect(() => {
    ready.current = false; setStatus('loading');
    const timeout = window.setTimeout(() => { if (!ready.current) setStatus('error'); }, 10000);
    const receive = (event: MessageEvent) => {
      const message = parsePreviewMessage(event, frame.current?.contentWindow ?? null);
      if (!message) return;
      if (message.type === 'navigate') { current.current.onNavigate(approvalHostPath(message.route)); return; }
      if (!ready.current) { ready.current = true; setStatus('ready'); send(); }
      current.current.onState(approvalHostPath(message.route), message.title, message.count, message.dirty);
    };
    window.addEventListener('message', receive);
    return () => { window.clearTimeout(timeout); window.removeEventListener('message', receive); };
  }, [attempt]);
  useEffect(() => { if (ready.current) send(); }, [route, refreshKey]);
  return <div className="approval-preview-host">
    {status === 'loading' && <p role="status">正在打开审批中心预览…</p>}
    {status === 'error' && <div className="enterprise-card approval-preview-error" role="alert"><h2>审批原型服务尚未就绪</h2><p>在项目根目录运行 <code>bash prototypes/approval-workflow/start.sh</code> 后重试。其他业务页面仍可正常使用。</p><button type="button" onClick={() => setAttempt(n => n + 1)}>重试审批预览</button></div>}
    <iframe key={attempt} ref={frame} title="审批中心原型预览" src={`${approvalPreviewOrigin}/?embedded=1&hostOrigin=${encodeURIComponent(window.location.origin)}#todo`} sandbox="allow-scripts allow-same-origin allow-forms allow-modals" referrerPolicy="no-referrer" onLoad={send} style={{ visibility: status === 'error' ? 'hidden' : 'visible' }} />
  </div>;
}
