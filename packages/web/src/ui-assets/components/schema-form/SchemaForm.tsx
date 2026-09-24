import { FieldAdapter, type FieldAdapterValue } from '../../primitives/field-adapters';
import { evaluateField, type HiddenErrorResolution } from './rules';
import type { FieldError, FieldId, FieldSchema, FormMode, RemoteSelectState } from './types';

export interface FormGroup {
  id: string;
  label: string;
}

export interface FieldChange<TValues> {
  fieldId: FieldId<TValues>;
  value: FieldAdapterValue;
}

interface SchemaFormBaseProps<TValues> {
  groups: FormGroup[];
  schema: FieldSchema<TValues>[];
  values: TValues;
  errors: FieldError<TValues>[];
  mode: FormMode;
  remoteStates?: Partial<Record<FieldId<TValues>, RemoteSelectState>>;
  onChange: (nextValues: TValues, change: FieldChange<TValues>) => void;
}

type RevealResolution = Extract<HiddenErrorResolution, { action: 'reveal' }>;
type ClearResolution = Extract<HiddenErrorResolution, { action: 'clear' }>;
type NoHiddenErrorResolution = Extract<HiddenErrorResolution, { action: 'none' }>;

export type SchemaFormProps<TValues> = SchemaFormBaseProps<TValues> & (
  | { hiddenErrorResolution?: NoHiddenErrorResolution; onRevealError?: never; onClearHiddenErrors?: never }
  | { hiddenErrorResolution: RevealResolution; onRevealError: (error: FieldError<TValues>) => void; onClearHiddenErrors?: never }
  | { hiddenErrorResolution: ClearResolution; onRevealError?: never; onClearHiddenErrors: (errorIds: string[]) => void }
);

export function fieldControlId(fieldId: string) {
  return `schema-form-field-${fieldId}`;
}

export type ErrorTargetState = 'editable' | 'readonly' | 'disabled' | 'hidden';

export function errorTargetId(error: Pick<FieldError<Record<string, unknown>>, 'id' | 'fieldId'>, resolution?: HiddenErrorResolution, state?: ErrorTargetState) {
  if (!resolution) {
    if (state === 'disabled') return disabledErrorTargetId(error.id);
    if (state === 'hidden') return hiddenErrorConfigurationTargetId(error.id);
    return fieldControlId(error.fieldId);
  }
  const resolutionErrorIds: string[] = resolution?.errorIds ?? [];
  if (resolutionErrorIds.includes(error.id)) {
    return resolution.action === 'reveal'
      ? hiddenErrorRevealControlId(error.id)
      : resolution.action === 'clear'
        ? hiddenErrorClearControlId(error.id)
        : fieldControlId(error.fieldId);
  }
  return state === 'disabled' ? disabledErrorTargetId(error.id) : fieldControlId(error.fieldId);
}

export function hiddenErrorRevealControlId(errorId: string) {
  return `schema-form-reveal-${errorId}`;
}

export function hiddenErrorClearControlId(errorId: string) {
  return `schema-form-clear-${errorId}`;
}

export function disabledErrorTargetId(errorId: string) {
  return `schema-form-disabled-error-${errorId}`;
}

export function SchemaForm<TValues>(props: SchemaFormProps<TValues>) {
  const { groups, schema, values, errors, mode, remoteStates, hiddenErrorResolution, onChange } = props;
  const runtimeHandlers = props as SchemaFormBaseProps<TValues> & {
    onRevealError?: (error: FieldError<TValues>) => void;
    onClearHiddenErrors?: (errorIds: string[]) => void;
  };
  const visibleFields = schema.filter((field) => evaluateField(field, values, mode).visible);
  const hiddenErrorIds = new Set(hiddenErrorResolution?.errorIds ?? []);
  const errorsByField = new Map<string, FieldError<TValues>[]>();
  for (const error of errors) {
    if (hiddenErrorIds.has(error.id)) continue;
    const fieldErrors = errorsByField.get(error.fieldId) ?? [];
    fieldErrors.push(error);
    errorsByField.set(error.fieldId, fieldErrors);
  }

  return <form noValidate>
    {groups.map((group) => {
      const groupFields = visibleFields.filter((field) => field.groupId === group.id);
      if (groupFields.length === 0) return null;
      return <fieldset key={group.id}>
        <legend>{group.label}</legend>
        {groupFields.map((field) => {
          const evaluated = evaluateField(field, values, mode);
          const fieldErrors = errorsByField.get(field.id) ?? [];
          const descriptionIds = [
            field.helpText ? helpTextId(field.id) : null,
            evaluated.disabledReason ? disabledReasonId(field.id) : null,
            ...fieldErrors.map((error) => evaluated.state === 'disabled' ? disabledErrorTargetId(error.id) : errorMessageId(error.id)),
          ].filter((id): id is string => id !== null);

          return <div key={field.id}>
            <label htmlFor={fieldControlId(field.id)}>{field.label}{evaluated.required && <><span aria-hidden="true"> *</span><span> 必填</span></>}</label>
            {field.helpText && <p id={helpTextId(field.id)}>{field.helpText}</p>}
            {evaluated.disabledReason && <p id={disabledReasonId(field.id)}>{evaluated.disabledReason}</p>}
            <FieldAdapter
              field={field}
              value={values[field.id] as FieldAdapterValue}
              state={evaluated.state === 'hidden' ? 'readonly' : evaluated.state}
              remoteState={remoteStates?.[field.id]}
              controlId={fieldControlId(field.id)}
              describedBy={descriptionIds.join(' ') || undefined}
              invalid={fieldErrors.length > 0}
              required={evaluated.required}
              onChange={(value) => onChange({ ...values, [field.id]: value } as TValues, { fieldId: field.id, value })}
            />
            {fieldErrors.map((error) => evaluated.state === 'disabled'
              ? <p id={disabledErrorTargetId(error.id)} key={error.id} role="alert" tabIndex={-1}>{field.label}当前不可编辑：{evaluated.disabledReason}</p>
              : <p id={errorMessageId(error.id)} key={error.id} role="alert">{error.message}</p>)}
          </div>;
        })}
      </fieldset>;
    })}
    <HiddenErrorActions schema={schema} values={values} mode={mode} errors={errors} resolution={hiddenErrorResolution} onRevealError={runtimeHandlers.onRevealError} onClearHiddenErrors={runtimeHandlers.onClearHiddenErrors} />
  </form>;
}

function HiddenErrorActions<TValues>({ schema, values, mode, errors, resolution, onRevealError, onClearHiddenErrors }: {
  schema: FieldSchema<TValues>[];
  values: TValues;
  mode: FormMode;
  errors: FieldError<TValues>[];
  resolution?: HiddenErrorResolution;
  onRevealError?: (error: FieldError<TValues>) => void;
  onClearHiddenErrors?: (errorIds: string[]) => void;
}) {
  if (!resolution || resolution.action === 'none') {
    const unresolvedHiddenErrors = errors.filter((error) => {
      const field = schema.find((candidate) => candidate.id === error.fieldId);
      return field ? evaluateField(field, values, mode).state === 'hidden' : false;
    });
    return unresolvedHiddenErrors.length > 0 ? <HiddenErrorConfigurationError errors={unresolvedHiddenErrors} action="处理" /> : null;
  }
  const hiddenErrors = errors.filter((error) => resolution.errorIds.includes(error.id));

  if (resolution.action === 'reveal') {
    if (!onRevealError) return <HiddenErrorConfigurationError errors={hiddenErrors} action="显示" />;
    return <section aria-label="隐藏字段错误">
      {hiddenErrors.map((error) => <HiddenErrorAction key={error.id} error={error} label={schema.find((field) => field.id === error.fieldId)?.label ?? error.fieldId} controlId={hiddenErrorRevealControlId(error.id)} actionLabel="显示" onAction={() => onRevealError?.(error)} />)}
    </section>;
  }

  if (!onClearHiddenErrors) return <HiddenErrorConfigurationError errors={hiddenErrors} action="清除" />;
  return <section aria-label="隐藏字段错误">
    {hiddenErrors.map((error) => <HiddenErrorAction key={error.id} error={error} label={schema.find((field) => field.id === error.fieldId)?.label ?? error.fieldId} controlId={hiddenErrorClearControlId(error.id)} actionLabel="清除" onAction={() => onClearHiddenErrors?.([error.id])} />)}
  </section>;
}

function HiddenErrorConfigurationError<TValues>({ errors, action }: { errors: FieldError<TValues>[]; action: '显示' | '清除' | '处理' }) {
  return <section aria-label="隐藏字段错误配置">
    {errors.map((error) => <p id={hiddenErrorConfigurationTargetId(error.id)} key={error.id} role="alert" tabIndex={-1}>隐藏错误处理配置错误：无法{action}“{error.message}”。</p>)}
  </section>;
}

function HiddenErrorAction<TValues>({ error, label, controlId, actionLabel, onAction }: {
  error: FieldError<TValues>;
  label: string;
  controlId: string;
  actionLabel: '显示' | '清除';
  onAction: () => void;
}) {
  const buttonText = actionLabel === '显示' ? `显示${label}字段以修复错误` : `清除${label}的隐藏错误`;
  return <p role="alert">{error.message} <button id={controlId} type="button" onClick={onAction}>{buttonText}</button></p>;
}

function helpTextId(fieldId: string) {
  return `schema-form-help-${fieldId}`;
}

function disabledReasonId(fieldId: string) {
  return `schema-form-disabled-${fieldId}`;
}

function errorMessageId(errorId: string) {
  return `schema-form-error-${errorId}`;
}

function hiddenErrorConfigurationTargetId(errorId: string) {
  return `schema-form-hidden-error-configuration-${errorId}`;
}
