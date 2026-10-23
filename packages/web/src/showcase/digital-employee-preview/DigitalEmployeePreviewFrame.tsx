import { useEffect, useState } from 'react';
import { digitalEmployeePreviewOrigin } from './config';
import './digital-employee-preview.css';

export function DigitalEmployeePreviewFrame({ refreshKey }: { refreshKey: number }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    const timer = window.setTimeout(() => {
      controller.abort();
      setStatus('error');
    }, 10000);
    void fetch(digitalEmployeePreviewOrigin, { mode: 'no-cors', signal: controller.signal })
      .then(() => {
        window.clearTimeout(timer);
        setStatus('ready');
      })
      .catch(() => {
        window.clearTimeout(timer);
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, refreshKey]);
  return <div className="digital-employee-preview-host">
    {status === 'loading' && <p role="status">正在打开数字员工原型…</p>}
    {status === 'error' && <div className="enterprise-card digital-employee-preview-error" role="alert"><h2>数字员工原型服务尚未就绪</h2><p>在项目根目录运行 <code>bash prototypes/digital-employee/start.sh</code> 后重试。其他业务页面仍可正常使用。</p><button type="button" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}>重试数字员工预览</button></div>}
    <iframe key={`${attempt}:${refreshKey}`} title="制造业数字员工原型预览" src={`${digitalEmployeePreviewOrigin}/?embedded=1`} sandbox="allow-scripts allow-same-origin allow-forms allow-modals" referrerPolicy="no-referrer" style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }} />
  </div>;
}
