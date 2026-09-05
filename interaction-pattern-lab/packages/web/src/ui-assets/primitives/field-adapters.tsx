import type { RemoteSelectState, ResolvedRemoteSelectValue, SelectOption } from '../components/schema-form/types';

type AdapterState = 'editable' | 'readonly' | 'disabled';

export type RemoteSelectControlledValue = string | ResolvedRemoteSelectValue;
export type FieldAdapterValue = number | RemoteSelectControlledValue | null | undefined;

interface AdapterField {
  id: string;
  kind: string;
  label: string;
  groupId: string;
  options?: SelectOption[];
  disabledReason?: string;
}

export interface FieldAdapterProps {
  field: AdapterField;
  value: FieldAdapterValue;
  state: AdapterState;
  remoteState?: RemoteSelectState;
  controlId?: string;
  describedBy?: string;
  invalid?: boolean;
  onChange: (value: FieldAdapterValue) => void;
}

export function FieldAdapter({ field, value, state, remoteState, controlId, describedBy, invalid, onChange }: FieldAdapterProps) {
  const shared = { id: controlId, 'aria-label': field.label, 'aria-describedby': describedBy, 'aria-invalid': invalid || undefined, disabled: state === 'disabled', readOnly: state === 'readonly', title: state === 'disabled' ? field.disabledReason : undefined };
  const emitIfEditable = (nextValue: FieldAdapterValue) => { if (state === 'editable') onChange(nextValue); };

  switch (field.kind) {
    case 'text':
      return <input {...shared} type="text" value={asText(value)} onChange={(event) => emitIfEditable(event.target.value)} />;
    case 'number':
      return <input {...shared} type="number" value={value === null || value === undefined ? '' : String(value)} onChange={(event) => emitIfEditable(event.target.value === '' ? null : Number(event.target.value))} />;
    case 'date':
      return <input {...shared} type="date" value={asText(value)} onChange={(event) => emitIfEditable(event.target.value)} />;
    case 'select':
      if (state === 'readonly') return <ReadonlyValue label={field.label} value={optionLabel(field.options ?? [], asText(value))} controlId={controlId} describedBy={describedBy} invalid={invalid} />;
      return <select id={controlId} aria-label={field.label} aria-describedby={describedBy} aria-invalid={invalid || undefined} disabled={state === 'disabled'} title={state === 'disabled' ? field.disabledReason : undefined} value={asText(value)} onChange={(event) => emitIfEditable(event.target.value)}>{(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
    case 'remote-select':
      return <RemoteSelectAdapter field={field} value={value} state={state} remoteState={remoteState} controlId={controlId} describedBy={describedBy} invalid={invalid} onChange={onChange} />;
    default:
      return <p role="alert">字段 {field.id} 配置错误：未知字段类型 {field.kind}。</p>;
  }
}

function RemoteSelectAdapter({ field, value, state, remoteState, controlId, describedBy, invalid, onChange }: Pick<FieldAdapterProps, 'field' | 'value' | 'state' | 'remoteState' | 'controlId' | 'describedBy' | 'invalid' | 'onChange'>) {
  const currentId = remoteSelectId(value);
  if (currentId === null) return <p role="alert">{field.label}回显值格式错误。</p>;
  if (!remoteState) return <p role="alert">{field.label}回显状态缺失。</p>;
  if (!matchesCurrentRemoteValue(currentId, remoteState)) return <p role="alert">{field.label} {currentId} 回显状态与当前值不一致。</p>;
  if (remoteState.status === 'loading') return <p role="status">正在加载{field.label} {remoteState.id}…</p>;
  if (remoteState.status === 'failed') return <p role="alert">{remoteState.message}</p>;

  const options = remoteOptions(field.options ?? [], remoteState.value);
  if (state === 'readonly') return <ReadonlyValue label={field.label} value={remoteState.value.label} controlId={controlId} describedBy={describedBy} invalid={invalid} />;
  return <>
    <select id={controlId} aria-label={field.label} aria-describedby={describedBy} aria-invalid={invalid || undefined} disabled={state === 'disabled'} title={state === 'disabled' ? field.disabledReason : undefined} value={currentId} onChange={(event) => {
      const option = options.find((candidate) => candidate.value === event.target.value);
      if (option && state === 'editable') onChange({ id: option.value, label: option.label });
    }}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    <p>{remoteState.value.label}</p>
  </>;
}

function ReadonlyValue({ label, value, controlId, describedBy, invalid }: { label: string; value: string; controlId?: string; describedBy?: string; invalid?: boolean }) {
  return <input id={controlId} aria-label={label} aria-describedby={describedBy} aria-invalid={invalid || undefined} aria-readonly="true" readOnly type="text" value={value} />;
}

function matchesCurrentRemoteValue(currentId: string, remoteState: RemoteSelectState): boolean {
  return remoteState.status === 'resolved' ? remoteState.value.id === currentId : remoteState.id === currentId;
}

function remoteSelectId(value: FieldAdapterValue): string | null {
  if (typeof value === 'string') return value;
  if (isResolvedRemoteSelectValue(value)) return value.id;
  return null;
}

function isResolvedRemoteSelectValue(value: FieldAdapterValue): value is ResolvedRemoteSelectValue {
  return typeof value === 'object' && value !== null && 'id' in value && 'label' in value && typeof value.id === 'string' && typeof value.label === 'string';
}

function optionLabel(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function remoteOptions(options: SelectOption[], resolved: { id: string; label: string }): SelectOption[] {
  return options.some((option) => option.value === resolved.id) ? options : [{ value: resolved.id, label: resolved.label }, ...options];
}

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}
