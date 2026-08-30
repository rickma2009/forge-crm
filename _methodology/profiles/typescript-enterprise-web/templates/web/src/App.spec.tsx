import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('states that business behavior still requires an approved slice', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('{{project_name}}');
    expect(html).toContain('必须来自已批准的纵向切片');
  });
});
