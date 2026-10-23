# 大宗商品监控改为免 Key 月度采集

用户补充：商品价格按月获取，暂不按日获取；采用免费方式，优先不使用 API Key。

处理决策：采用世界银行 Commodity Price Data (Pink Sheet) 的公开月度历史工作簿，按月保存铜、铝、金、银价格；保留 Frankfurter 无 Key 的 USD/CNY 汇率来源，行情月份使用该月最近一个可用汇率折算。由于商品源是月度序列，页面不提供按日/周粒度的伪造展示。

官方来源：
- https://thedocs.worldbank.org/en/doc/5d903e848db1d1b83e0ec8f744e55570-0350012021/
- https://frankfurter.dev/

边界：World Bank Pink Sheet 是月度基准价，并非实时或每日成交价。源站每月更新，下载地址的版本路径可能变化；集成需从官方目录定位当前月度文件，保存同步时间/游标并记录失败，不能把公开文件视为有 SLA 的 API。
