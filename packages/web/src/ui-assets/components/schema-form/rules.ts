import type { FieldError, FieldRule, FieldSchema, FormMode, HiddenErrorPolicy } from './types';

export interface EvaluatedField {
  fieldId: string;
  visible: boolean;
  required: boolean;
  state: 'editable' | 'readonly' | 'disabled' | 'hidden';
  disabledReason: string | null;
}

export type HiddenErrorResolution =
  | { action: 'reveal'; fieldIds: string[]; errorIds: string[] }
  | { action: 'clear'; fieldIds: []; errorIds: string[] }
  | { action: 'none'; fieldIds: []; errorIds: [] };

export function evaluateRule<TValues>(rule: FieldRule<TValues> | undefined, values: TValues, mode: FormMode, defaultValue: boolean): boolean {
  if (!rule) return defaultValue;

  switch (rule.type) {
    case 'always': return rule.value;
    case 'mode-is': return rule.mode === mode;
    case 'field-equals': return values[rule.fieldId] === rule.value;
    case 'not': return !evaluateRule(rule.rule, values, mode, false);
    case 'all': return rule.rules.every((child) => evaluateRule(child, values, mode, false));
    case 'any': return rule.rules.some((child) => evaluateRule(child, values, mode, false));
  }
}

export function evaluateField<TValues>(field: FieldSchema<TValues>, values: TValues, mode: FormMode): EvaluatedField {
  const visible = evaluateRule(field.visibleWhen, values, mode, true);
  if (!visible) return { fieldId: field.id, visible: false, required: false, state: 'hidden', disabledReason: null };

  const required = evaluateRule(field.requiredWhen, values, mode, false);
  if (mode === 'view') return { fieldId: field.id, visible: true, required, state: 'readonly', disabledReason: null };
  if (field.disabledReason) return { fieldId: field.id, visible: true, required, state: 'disabled', disabledReason: field.disabledReason };
  if (evaluateRule(field.readonlyWhen, values, mode, false)) return { fieldId: field.id, visible: true, required, state: 'readonly', disabledReason: null };
  return { fieldId: field.id, visible: true, required, state: 'editable', disabledReason: null };
}

export function resolveHiddenErrors<TValues>(
  errors: FieldError<TValues>[],
  fields: FieldSchema<TValues>[],
  values: TValues,
  mode: FormMode,
  policy: HiddenErrorPolicy,
): HiddenErrorResolution {
  const hiddenErrors = errors.filter((error) => {
    const field = fields.find((candidate) => candidate.id === error.fieldId);
    return field ? evaluateField(field, values, mode).state === 'hidden' : false;
  });

  if (hiddenErrors.length === 0) return { action: 'none', fieldIds: [], errorIds: [] };
  const errorIds = hiddenErrors.map((error) => error.id);
  if (policy === 'clear') return { action: 'clear', fieldIds: [], errorIds };
  return { action: 'reveal', fieldIds: [...new Set(hiddenErrors.map((error) => error.fieldId))], errorIds };
}
