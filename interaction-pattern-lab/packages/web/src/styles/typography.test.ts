import { afterEach, describe, expect, it } from 'vitest';
import './index.css';
import '../showcase/showcase.css';

afterEach(() => { document.body.innerHTML = ''; });

describe('project-wide enterprise typography', () => {
  it('uses the menu typography for titles, content and form controls', () => {
    document.body.innerHTML = `
      <main class="showcase-shell">
        <h1 id="title" class="showcase-page-header">标题</h1>
        <p id="content">内容</p>
        <button id="button">按钮</button>
        <select id="select"><option>下拉内容</option></select>
      </main>`;

    for (const id of ['title', 'content', 'button', 'select']) {
      const style = getComputedStyle(document.querySelector(`#${id}`)!);
      expect(style.fontSize).toBe('var(--ipl-font-size)');
      expect(style.fontFamily).toBe('var(--ipl-font-family)');
    }
    const rootStyle = getComputedStyle(document.documentElement);
    expect(rootStyle.getPropertyValue('--ipl-font-size').trim()).toBe('12px');
    expect(rootStyle.getPropertyValue('--ipl-font-family')).toContain('Avenir Next');
  });

  it('allows large text only through the global opt-in token', () => {
    document.body.innerHTML = '<main class="showcase-shell"><strong id="large" class="ipl-type-large">关键数字</strong></main>';
    expect(getComputedStyle(document.querySelector('#large')!).fontSize).toBe('var(--ipl-font-size-large)');
    expect(getComputedStyle(document.documentElement).getPropertyValue('--ipl-font-size-large').trim()).toBe('18px');
  });
});
