import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import './row-actions.css';
import { IconPencil, IconTrash, IconCheck, IconX, IconArrowUp, IconArrowDown, IconCopy, IconDownload, IconPlayerPause, IconPlayerPlay, IconSettings, IconUserMinus, IconUsers, IconGitCompare, IconArrowBackUp, IconPlayerStop, IconClockPause, IconEye, IconEyeOff, IconMessageReply, IconStar, IconStarFilled, IconNote, IconRefresh, IconCircleCheck, IconUserShare, IconRotateClockwise, IconArchive, IconFlagOff, IconUnlink } from '@tabler/icons-react';

function rowActionKind(label: string) { return /编辑|修改/.test(label) ? 'edit' : /删除|移除/.test(label) ? 'delete' : /审核|通过|确认/.test(label) ? 'review' : 'other'; }
function rowActionIcon(label: string) {
  if (/取消关注/.test(label)) return { Icon: IconStarFilled, code: 'star-filled' };
  if (/关注|收藏/.test(label)) return { Icon: IconStar, code: 'star' };
  if (/重新打开|重开/.test(label)) return { Icon: IconRotateClockwise, code: 'reopen' };
  if (/标记误报|误报/.test(label)) return { Icon: IconFlagOff, code: 'false-positive' };
  if (/标记无关|无关/.test(label)) return { Icon: IconUnlink, code: 'irrelevant' };
  if (/持续观察|观察/.test(label)) return { Icon: IconEye, code: 'observe' };
  if (/关闭事件|归档/.test(label)) return { Icon: IconArchive, code: 'archive' };
  if (/恢复|继续/.test(label)) return { Icon: IconRefresh, code: 'resume' };
  if (/暂挂/.test(label)) return { Icon: IconClockPause, code: 'hold' };
  if (/暂停|停用|禁用/.test(label)) return { Icon: IconPlayerPause, code: 'pause' };
  if (/等待回复|回复/.test(label)) return { Icon: IconMessageReply, code: 'reply' };
  if (/完成|办结/.test(label)) return { Icon: IconCircleCheck, code: 'complete' };
  if (/备注|记录/.test(label)) return { Icon: IconNote, code: 'note' };
  if (/开始|启动|启用/.test(label)) return { Icon: IconPlayerPlay, code: 'start' };
  if (/忽略|隐藏/.test(label)) return { Icon: IconEyeOff, code: 'ignore' };
  if (/分派|转派/.test(label)) return { Icon: IconUserShare, code: 'assign' };
  if (/暂缓/.test(label)) return { Icon: IconClockPause, code: 'snooze' };
  if (/删除/.test(label)) return { Icon: IconTrash, code: 'delete' };
  if (/移除/.test(label)) return { Icon: IconUserMinus, code: 'remove' };
  if (/编辑|修改/.test(label)) return { Icon: IconPencil, code: 'edit' };
  if (/审核|通过|确认/.test(label)) return { Icon: IconCheck, code: 'approve' };
  if (/撤回|撤销|拒绝|驳回|取消/.test(label)) return { Icon: IconX, code: 'reject' };
  if (/下载/.test(label)) return { Icon: IconDownload, code: 'download' };
  if (/复制/.test(label)) return { Icon: IconCopy, code: 'copy' };
  if (/上移|↑/.test(label)) return { Icon: IconArrowUp, code: 'move-up' };
  if (/下移|↓/.test(label)) return { Icon: IconArrowDown, code: 'move-down' };
  if (/成员|权限/.test(label)) return { Icon: IconUsers, code: 'members' };
  if (/比较/.test(label)) return { Icon: IconGitCompare, code: 'compare' };
  if (/回滚/.test(label)) return { Icon: IconArrowBackUp, code: 'rollback' };
  if (/结束|终止/.test(label)) return { Icon: IconPlayerStop, code: 'stop' };
  return { Icon: IconSettings, code: 'other' };
}

/** Shared icon-only row action. Authorization and confirmation stay with the caller. */
export function RowActionButton({ label, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const { Icon, code } = rowActionIcon(label);
  return <button type={type} {...props} data-row-action={rowActionKind(label)} data-row-action-icon={code} aria-label={props['aria-label'] ?? label} title={props.title ?? label}
    className={`row-action-button ${/删除|移除/.test(label) ? 'is-danger' : ''} ${className}`}><Icon size={16} aria-hidden="true" /></button>;
}

/** Link variant for actions such as downloading a file; shares icon semantics and hit area. */
export function RowActionLink({ label, className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string }) {
  const { Icon, code } = rowActionIcon(label);
  return <a {...props} data-row-action={rowActionKind(label)} data-row-action-icon={code} aria-label={props['aria-label'] ?? label} title={props.title ?? label}
    className={`row-action-button ${className}`}><Icon size={16} aria-hidden="true" /></a>;
}
