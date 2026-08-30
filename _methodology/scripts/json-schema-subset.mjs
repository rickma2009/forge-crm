import { isDeepStrictEqual } from 'node:util';

function hasType(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'null') return value === null;
  return typeof value === type;
}

export function validateJsonSchema(schema, value, location = '$') {
  const errors = [];
  const allowedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (allowedTypes.length > 0 && !allowedTypes.some((type) => hasType(value, type))) {
    return [`${location} 应为 ${allowedTypes.join(' | ')}`];
  }
  if ('const' in schema && !isDeepStrictEqual(value, schema.const)) errors.push(`${location} 不等于 const`);
  if (schema.enum && !schema.enum.some((item) => isDeepStrictEqual(item, value))) errors.push(`${location} 不在 enum 中`);

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${location} 长度小于 ${schema.minLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${location} 不匹配 ${schema.pattern}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${location} 项数小于 ${schema.minItems}`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${location} 项数大于 ${schema.maxItems}`);
    if (schema.items) value.forEach((item, index) => errors.push(...validateJsonSchema(schema.items, item, `${location}[${index}]`)));
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${location}.${key} 缺失`);
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) errors.push(...validateJsonSchema(childSchema, value[key], `${location}.${key}`));
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`${location}.${key} 是未允许字段`);
    }
  }
  return errors;
}
