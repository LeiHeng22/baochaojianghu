# 爆炒江湖个人图鉴

只在本文件夹做版本控制。用来记录我有的厨师，并按采集效率排出探索对照表。

## 数据

- 个人数据：`data/userData.json`（从白菜菊花下载的 `userData.txt`）
- 图鉴数据：`data/data.min.json`（来自 https://h5.baochaojianghu.com/ ）

游戏里更新厨师/遗玉后：把新的 `userData.txt` 覆盖到 `data/userData.json`，再跑一次脚本。

## 网页：开业 / 采集配置预览

```text
node scripts/serve.js
```

浏览器打开 http://127.0.0.1:5173/web/

线上（GitHub Pages）：https://leiheng22.github.io/baochaojianghu/

界面直接使用 [白菜菊花](https://h5.baochaojianghu.com/) 的样式、图标和表格组件，顶栏 / 抽屉 / 搜索 / 分页 / 计算器格与原站同一套。探索是本站加的各地四人采集。

- 默认载入 `data/userData.json` 和 `data/data.min.json`
- **从游戏导入**：游戏内点左上角昵称 → 设置 → 白菜菊花，复制校验码，粘贴后点「从游戏导入」
- 也可点「导入 userData」，选择白菜菊花下载的 `userData.txt`；或填白菜菊花云端 ID
- 「更新图鉴」会拉取官网最新 `data.min.json` 并写回 `data/`
- 角色一览：查看已有厨师的技能、采集、遗玉、厨具
- 开业案台：三人队，预览光环、开业时间、金币、稀客
- 采集派遣：菜园 / 玉片 / 调料各地四人，预览点数和收获；同一厨师不能同时去两个地点
- 方案保存在浏览器本地

官方接口只含**满级满阶**厨师和菜谱，会与本地已有合并；遗玉、厨具仍用本地数据。

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
