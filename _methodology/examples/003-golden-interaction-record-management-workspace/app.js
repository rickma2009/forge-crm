const titles = { list: '记录管理', create: '新增记录', detail: '记录详情' };
const tabs = document.querySelector('[data-tabs]');
const views = [...document.querySelectorAll('[data-page]')];
let open = ['list'];
let active = 'list';

function render() {
  views.forEach((view) => { view.hidden = view.dataset.page !== active; });
  tabs.innerHTML = open.map((key) => `<button class="tab ${key === active ? 'active' : ''}" data-tab="${key}">${titles[key]} <span class="close" data-close="${key}">×</span></button>`).join('');
  document.querySelector('.tab.fixed').classList.toggle('active', active === 'home');
}

function openView(key) {
  if (key !== 'home' && !open.includes(key)) open.push(key);
  active = key;
  render();
}

document.addEventListener('click', (event) => {
  const closeTarget = event.target.closest('[data-close]');
  if (closeTarget) {
    const key = closeTarget.dataset.close;
    const index = open.indexOf(key);
    open = open.filter((item) => item !== key);
    if (active === key) active = open[Math.max(0, index - 1)] || 'home';
    render();
    return;
  }

  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.tab) openView(target.dataset.tab);
  if (target.dataset.view) openView(target.dataset.view);
  if (target.dataset.open) openView(target.dataset.open);

  if (target.matches('[data-reset]')) {
    document.querySelector('[data-query]').value = '';
    document.querySelectorAll('[data-rows] tr').forEach((row) => { row.hidden = false; });
    document.querySelector('[data-count]').textContent = '共 2 条';
  }

  if (target.matches('[data-search]')) {
    const query = document.querySelector('[data-query]').value.trim();
    let count = 0;
    document.querySelectorAll('[data-rows] tr').forEach((row) => {
      row.hidden = Boolean(query && !row.textContent.includes(query));
      if (!row.hidden) count += 1;
    });
    document.querySelector('[data-count]').textContent = `共 ${count} 条`;
  }
});

render();
