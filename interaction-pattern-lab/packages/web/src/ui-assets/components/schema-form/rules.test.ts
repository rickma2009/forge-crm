import { describe, expect, it } from 'vitest';
import { evaluateField, evaluateRule, resolveHiddenErrors } from './rules';
import type { FieldRule, FieldSchema, FormMode } from './types';

interface DocumentValues {
  paymentType: string;
  approvalCode: string;
  owner: string;
  notes: string;
}

const fields: Record<string, FieldSchema<DocumentValues>> = {
  paymentType: { id: 'paymentType', kind: 'select', label: '付款方式', groupId: 'main', options: [{ value: 'prepaid', label: '预付' }, { value: 'credit', label: '赊销' }] },
  approvalCode: {
    id: 'approvalCode', kind: 'text', label: '审批编号', groupId: 'main',
    visibleWhen: { type: 'field-equals', fieldId: 'paymentType', value: 'credit' },
    requiredWhen: { type: 'field-equals', fieldId: 'paymentType', value: 'credit' },
    readonlyWhen: { type: 'mode-is', mode: 'edit' },
  },
  owner: { id: 'owner', kind: 'text', label: '负责人', groupId: 'main', disabledReason: '创建后由审批流分配负责人。' },
  notes: { id: 'notes', kind: 'text', label: '备注', groupId: 'main' },
};

const values: DocumentValues = { paymentType: 'credit', approvalCode: '', owner: '陈思远', notes: '' };
describe('TASK-1004 SchemaForm pure rules', () => {
  it.each([
    ['uses an explicit always value', { type: 'always', value: true }, 'create', true],
    ['evaluates nested not and all rules', { type: 'not', rule: { type: 'all', rules: [{ type: 'field-equals', fieldId: 'paymentType', value: 'credit' }, { type: 'mode-is', mode: 'edit' }] } }, 'create', true],
    ['evaluates nested any rules', { type: 'any', rules: [{ type: 'always', value: false }, { type: 'all', rules: [{ type: 'field-equals', fieldId: 'paymentType', value: 'credit' }, { type: 'not', rule: { type: 'always', value: false } }] }] }, 'edit', true],
    ['treats an empty all list as true', { type: 'all', rules: [] }, 'create', true],
    ['treats an empty any list as false', { type: 'any', rules: [] }, 'create', false],
  ] satisfies Array<[string, FieldRule<DocumentValues>, FormMode, boolean]>)('%s', (_name, rule, mode, expected) => {
    expect(evaluateRule(rule, values, mode, false)).toBe(expected);
  });

  it.each([
    ['create leaves a visible conditional field editable and required', fields.approvalCode, values, 'create', { fieldId: 'approvalCode', visible: true, required: true, state: 'editable', disabledReason: null }],
    ['view makes a visible field readonly even without a readonly rule', fields.notes, values, 'view', { fieldId: 'notes', visible: true, required: false, state: 'readonly', disabledReason: null }],
    ['edit applies a declarative readonly rule', fields.approvalCode, values, 'edit', { fieldId: 'approvalCode', visible: true, required: true, state: 'readonly', disabledReason: null }],
    ['create exposes an explicit disabled state and its reason', fields.owner, values, 'create', { fieldId: 'owner', visible: true, required: false, state: 'disabled', disabledReason: '创建后由审批流分配负责人。' }],
    ['view remains readonly instead of disguising a field as disabled', fields.owner, values, 'view', { fieldId: 'owner', visible: true, required: false, state: 'readonly', disabledReason: null }],
    ['a failed visibility rule hides a field and removes its required state', fields.approvalCode, { ...values, paymentType: 'prepaid' }, 'create', { fieldId: 'approvalCode', visible: false, required: false, state: 'hidden', disabledReason: null }],
  ])('%s', (_name, field, fieldValues, mode, expected) => {
    expect(evaluateField(field, fieldValues, mode as FormMode)).toEqual(expected);
  });

  it('reveals a hidden field error with an explicit target instead of losing the blocking error', () => {
    expect(resolveHiddenErrors(
      [{ id: 'ERR-approval', fieldId: 'approvalCode', message: '请填写审批编号' }],
      Object.values(fields),
      { ...values, paymentType: 'prepaid' },
      'create',
      'reveal',
    )).toEqual({ action: 'reveal', fieldIds: ['approvalCode'], errorIds: ['ERR-approval'] });
  });

  it('returns hidden error IDs to clear when the configured policy is clear', () => {
    expect(resolveHiddenErrors(
      [{ id: 'ERR-approval', fieldId: 'approvalCode', message: '请填写审批编号' }],
      Object.values(fields),
      { ...values, paymentType: 'prepaid' },
      'create',
      'clear',
    )).toEqual({ action: 'clear', fieldIds: [], errorIds: ['ERR-approval'] });
  });
});
