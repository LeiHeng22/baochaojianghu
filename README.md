# 爆炒江湖个人图鉴

只在本文件夹做版本控制。用来记录我有的厨师，并按采集效率排出探索对照表。

## 数据

- 个人数据：`data/userData.json`（从白菜菊花下载的 `userData.txt`）
- 图鉴数据：`data/data.min.json`（来自 https://h5.baochaojianghu.com/ ）

游戏里更新厨师/遗玉后：把新的 `userData.txt` 覆盖到 `data/userData.json`，再跑一次脚本。

## 生成报告

```text
node scripts/build-report.js
```

生成文件：

- `reports/厨师总表.md`：已有厨师、光环、采集数值
- `reports/采集对照表.md`：菜园 / 玉片 / 调料对照
- `reports/采集对照表.csv`：同样内容，方便用 Excel 打开

## 规则摘要

- 厨神/开业上场 3 人；光环厨对场上所有厨师生效
- 探索每个地点上场 4 个采集厨，每个厨师只能去一个地区
- 菜园看单一采集维合计 + 素材获得%
- 玉片看双采集维合计，15 一档
- 调料看对应口味值，目标 1080
