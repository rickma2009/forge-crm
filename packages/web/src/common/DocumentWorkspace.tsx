import type { ComponentProps, ReactNode } from 'react';
import { DetailHeader, DetailWorkspace } from './DetailWorkspace';
import './document-workspace.css';

/** UI-DOCUMENT-01: a document header, master fields, then line items; no implicit tabs. */
export function DocumentWorkspace({ children, ...header }: ComponentProps<typeof DetailHeader> & { children: ReactNode }) {
  return <DetailWorkspace className="document-workspace"><DetailHeader {...header} /><div className="document-body">{children}</div></DetailWorkspace>;
}
