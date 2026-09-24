import { IconLayoutGrid, IconSettings } from '@tabler/icons-react';
import './list-view-selector.css';

export type ListViewSelectorProps = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  onSettings: () => void;
  disabled?: boolean;
  settingsDisabled?: boolean;
  emptyLabel?: string;
  ariaLabel?: string;
};

/** Shared three-part view control; data loading and permissions stay with the caller. */
export function ListViewSelector({ value, options, onChange, onSettings, disabled = false, settingsDisabled = false, emptyLabel = '无可用视图', ariaLabel = '当前列表视图' }: ListViewSelectorProps) {
  return <div className="list-view-selector" role="group" aria-label="列表视图选择与设置">
    <span className="list-view-selector-label"><IconLayoutGrid size={16} aria-hidden="true" />当前视图</span>
    <select aria-label={ariaLabel} value={value} disabled={disabled || !options.length} onChange={(event) => onChange(event.target.value)}>
      {!options.length && <option value="">{emptyLabel}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <button type="button" disabled={disabled || settingsDisabled || !options.length} onClick={onSettings}><IconSettings size={16} aria-hidden="true" />设置</button>
  </div>;
}
