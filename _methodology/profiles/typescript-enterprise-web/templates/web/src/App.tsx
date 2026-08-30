export function App() {
  return (
    <main className="app-shell">
      <section className="status-card" aria-labelledby="project-title">
        <span className="eyebrow">SDD governance initialized</span>
        <h1 id="project-title">{{project_name}}</h1>
        <p>工程骨架已建立。业务页面、角色、权限和数据模型必须来自已批准的纵向切片。</p>
        <dl>
          <div><dt>Web</dt><dd>React + Vite</dd></div>
          <div><dt>Server</dt><dd>NestJS</dd></div>
          <div><dt>Data</dt><dd>PostgreSQL + Prisma</dd></div>
        </dl>
      </section>
    </main>
  );
}
