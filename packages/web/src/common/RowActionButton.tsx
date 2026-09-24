import type { ButtonHTMLAttributes } from 'react';
import './row-actions.css';
import { IconPencil, IconTrash, IconCheck, IconX, IconArrowUp, IconArrowDown, IconCopy, IconPlayerPause, IconPlayerPlay, IconSettings, IconUserMinus, IconUsers, IconGitCompare, IconArrowBackUp, IconPlayerStop } from '@tabler/icons-react';

/** Shared icon-only row action. Authorization and confirmation stay with the caller. */
export function RowActionButton({ label, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const Icon = /删除/.test(label) ? IconTrash : /移除/.test(label) ? IconUserMinus : /编辑|修改/.test(label) ? IconPencil
    : /停用|禁用/.test(label) ? IconPlayerPause : /启用/.test(label) ? IconPlayerPlay : /审核|通过|确认/.test(label) ? IconCheck
    : /撤销|拒绝|驳回|取消/.test(label) ? IconX : /复制/.test(label) ? IconCopy : /上移|↑/.test(label) ? IconArrowUp
    : /下移|↓/.test(label) ? IconArrowDown : /成员|权限/.test(label) ? IconUsers : /比较/.test(label) ? IconGitCompare : /回滚/.test(label) ? IconArrowBackUp : /结束/.test(label) ? IconPlayerStop : IconSettings;
  return <button type={type} {...props} aria-label={props['aria-label'] ?? label} title={props.title ?? label}
    className={`row-action-button ${/删除|移除/.test(label) ? 'is-danger' : ''} ${className}`}><Icon size={16} aria-hidden="true" /></button>;
}
