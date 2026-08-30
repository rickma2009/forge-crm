const shell = document.querySelector('[data-shell]');
const groups = [...document.querySelectorAll('[data-group]')];
const menuSearch = document.querySelector('[data-menu-search]');
const clearButton = document.querySelector('[data-clear]');
const emptyState = document.querySelector('[data-empty]');
const globalSearch = document.querySelector('[data-global-search]');
const message = document.querySelector('[data-demo-message]');

const setGroupOpen = (group, open) => {
  group.classList.toggle('open', open);
  group.querySelector('.nav-parent').setAttribute('aria-expanded', String(open));
};

groups.forEach((group) => {
  group.querySelector('.nav-parent').addEventListener('click', () => {
    setGroupOpen(group, !group.classList.contains('open'));
  });
  group.addEventListener('mouseenter', () => {
    if (shell.classList.contains('collapsed')) setGroupOpen(group, true);
  });
  group.addEventListener('mouseleave', () => {
    if (shell.classList.contains('collapsed')) setGroupOpen(group, false);
  });
  group.addEventListener('focusin', () => {
    if (shell.classList.contains('collapsed')) setGroupOpen(group, true);
  });
  group.addEventListener('focusout', (event) => {
    if (shell.classList.contains('collapsed') && !group.contains(event.relatedTarget)) setGroupOpen(group, false);
  });
});

document.querySelector('[data-collapse]').addEventListener('click', (event) => {
  const collapsed = shell.classList.toggle('collapsed');
  if (collapsed) {
    groups.forEach((group) => setGroupOpen(group, false));
    menuSearch.value = '';
    menuSearch.dispatchEvent(new Event('input'));
  }
  event.currentTarget.textContent = collapsed ? '▸' : '◂';
  event.currentTarget.title = collapsed ? '展开侧栏' : '折叠侧栏';
  event.currentTarget.setAttribute('aria-label', collapsed ? '展开侧栏' : '折叠侧栏');
  localStorage.setItem('golden-nav-collapsed', collapsed ? '1' : '0');
});

if (localStorage.getItem('golden-nav-collapsed') === '1') {
  shell.classList.add('collapsed');
  document.querySelector('[data-collapse]').textContent = '▸';
  document.querySelector('[data-collapse]').title = '展开侧栏';
  document.querySelector('[data-collapse]').setAttribute('aria-label', '展开侧栏');
}

menuSearch.addEventListener('input', () => {
  const query = menuSearch.value.trim().toLowerCase();
  let matches = 0;
  document.querySelectorAll('.nav > .nav-item, .nav-group').forEach((node) => {
    if (node.classList.contains('nav-group')) {
      const children = [...node.querySelectorAll('.child')];
      const parentMatch = node.dataset.label.toLowerCase().includes(query);
      let childMatches = 0;
      children.forEach((child) => {
        const match = !query || child.dataset.label.toLowerCase().includes(query);
        child.hidden = !match && !parentMatch;
        if (match || parentMatch) childMatches += 1;
      });
      const visible = !query || parentMatch || childMatches > 0;
      node.hidden = !visible;
      if (query && visible) setGroupOpen(node, true);
      if (visible) matches += 1;
    } else {
      const visible = !query || node.dataset.label.toLowerCase().includes(query);
      node.hidden = !visible;
      if (visible) matches += 1;
    }
  });
  clearButton.hidden = !query;
  emptyState.hidden = matches > 0;
});

clearButton.addEventListener('click', () => {
  menuSearch.value = '';
  menuSearch.dispatchEvent(new Event('input'));
  menuSearch.focus();
});

document.querySelector('[data-mobile-menu]').addEventListener('click', () => shell.classList.toggle('mobile-open'));
document.querySelector('[data-scrim]').addEventListener('click', () => shell.classList.remove('mobile-open'));
document.querySelectorAll('.nav a').forEach((link) => link.addEventListener('click', () => shell.classList.remove('mobile-open')));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') shell.classList.remove('mobile-open');
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    globalSearch.focus();
  }
});

globalSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && globalSearch.value.trim()) {
    message.textContent = `全局搜索已提交：${globalSearch.value.trim()}（案例仅演示交互，实际系统必须连接真实查询范围）`;
  }
});
