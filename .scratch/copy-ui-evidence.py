from pathlib import Path
for name,source in {'web-build':'ui-audit-web-build','web-lint':'ui-audit-web-lint','server-lint':'ui-audit-server-lint'}.items():
 Path('evidence/ui-audit-20260924/'+name+'.log').write_text(Path('/private/tmp/'+source+'.log').read_text())
