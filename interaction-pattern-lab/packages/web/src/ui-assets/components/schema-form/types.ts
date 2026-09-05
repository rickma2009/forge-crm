export type FieldKind = 'text' | 'number' | 'date' | 'select' | 'remote-select';

export type FormMode = 'create' | 'view' | 'edit';

export type EvaluatedFieldState = 'editable' | 'readonly' | 'disabled' | 'hidden';

export type FieldId<TValues> = Extract<keyof TValues, string>;

export type FieldRule<TValues> =
  | { type: 'always'; value: boolean }
  | { type: 'mode-is'; mode: FormMode }
  | { type: 'field-equals'; fieldId: FieldId<TValues>; value: unknown }
  | { type: 'not'; rule: FieldRule<TValues> }
  | { type: 'all'; rules: FieldRule<TValues>[] }
  | { type: 'any'; rules: FieldRule<TValues>[] };

export interface SelectOption {
  value: string;
  label: string;
}

export interface ResolvedRemoteSelectValue {
  id: string;
  label: string;
}

export type RemoteSelectState =
  | { status: 'resolved'; value: ResolvedRemoteSelectValue }
  | { status: 'loading'; id: string }
  | { status: 'failed'; id: string; message: string };

interface FieldSchemaBase<TValues, TKind extends FieldKind> {
  id: FieldId<TValues>;
  kind: TKind;
  label: string;
  groupId: string;
  requiredWhen?: FieldRule<TValues>;
  visibleWhen?: FieldRule<TValues>;
  readonlyWhen?: FieldRule<TValues>;
  disabledReason?: string;
  helpText?: string;
}

export type TextFieldSchema<TValues> = FieldSchemaBase<TValues, 'text'>;
export type NumberFieldSchema<TValues> = FieldSchemaBase<TValues, 'number'>;
export type DateFieldSchema<TValues> = FieldSchemaBase<TValues, 'date'>;
export type SelectFieldSchema<TValues> = FieldSchemaBase<TValues, 'select'> & { options: SelectOption[] };
export type RemoteSelectFieldSchema<TValues> = FieldSchemaBase<TValues, 'remote-select'> & { options?: SelectOption[] };

export type FieldSchema<TValues> =
  | TextFieldSchema<TValues>
  | NumberFieldSchema<TValues>
  | DateFieldSchema<TValues>
  | SelectFieldSchema<TValues>
  | RemoteSelectFieldSchema<TValues>;

export interface FieldError<TValues = Record<string, unknown>> {
  id: string;
  fieldId: FieldId<TValues>;
  message: string;
}

export type HiddenErrorPolicy = 'reveal' | 'clear';
