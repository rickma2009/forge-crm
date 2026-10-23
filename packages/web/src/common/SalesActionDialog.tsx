import { useEffect,useId,useRef,useState,type ReactNode } from 'react';
/** Form shell with an outside-form slot for components that own a secondary form. */
export function SalesActionDialog({title,children,afterFields,onClose,onSave,saveLabel='保存'}:{title:string;children:ReactNode;afterFields?:ReactNode;onClose:()=>void;onSave:()=>Promise<void>;saveLabel?:string}){
 const dialog=useRef<HTMLDivElement>(null),busyRef=useRef(false),formId=useId();const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const old=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLElement>('input,textarea,select,button')?.focus();return()=>{old?.focus();};},[]);
 const close=()=>{if(!busyRef.current)onClose();};
 return <div className="enterprise-modal-backdrop"><div ref={dialog} className="enterprise-modal sales-action-dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDown={e=>{
  if(e.defaultPrevented||(e.target as Element).closest('[role="dialog"]')!==dialog.current)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  if(e.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled),a[href]')??[]).filter(n=>n.tabIndex>=0&&n.closest('[role="dialog"]')===dialog.current);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus();}}
 }}><header><h2>{title}</h2></header><div className="modal-body">{error&&<p className="enterprise-alert span-2" role="alert">{error}</p>}<form id={formId} className="sales-form-fields" onSubmit={e=>{e.preventDefault();e.stopPropagation();if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');void onSave().catch(e=>setError(e instanceof Error?e.message:'操作失败')).finally(()=>{busyRef.current=false;setBusy(false);});}}><fieldset className="sales-form-fields" disabled={busy}>{children}</fieldset></form>{afterFields}</div><footer><button type="button" disabled={busy} onClick={close}>取消</button><button type="submit" form={formId} className="is-primary" disabled={busy}>{busy?'处理中…':saveLabel}</button></footer></div></div>;
}
