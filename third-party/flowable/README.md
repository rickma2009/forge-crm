# Flowable 上游边界

使用 Flowable OSS 7.2.0，官方 tag/commit、依赖及运行矩阵见 version-lock.json。Spring Boot 3.5.4 来自该版本官方 flowable-dependencies POM；不是从当前在线最新文档推测。8.0.0 改为 Boot4/Jackson3，本阶段未验证该组合。

- 官方源码：https://github.com/flowable/flowable-engine/tree/flowable-7.2.0
- 发布说明：https://github.com/flowable/flowable-engine/releases/tag/flowable-7.2.0
- 许可：https://github.com/flowable/flowable-engine/blob/flowable-7.2.0/LICENSE
- NOTICE：该锁定源码根目录没有单独NOTICE文件；再分发时保留各依赖制品实际携带的NOTICE，不虚构上游文件。
- 官方依赖：https://repo.maven.apache.org/maven2/org/flowable/flowable-dependencies/7.2.0/flowable-dependencies-7.2.0.pom

运行使用Maven官方制品，自有服务位于 services/workflow-engine。完整源码独立克隆至 ~/projects/third-party/flowable-engine，通过 scripts/workflow/fetch-source.sh 校验锁定commit；已有目录不会自动切换版本或清理。未修改上游源码，不引入商业版UI。再分发镜像时保留Maven依赖内的LICENSE/NOTICE，同时提供此来源索引。

锁版本是可复现开发基线，不表示完成生产漏洞扫描、许可法律审查或获得长期维护承诺；上线前应验证官方维护版本及升级路径。
