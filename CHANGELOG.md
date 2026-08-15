# 修改记录

## 2026-08-15

增加本地网页：导入白菜菊花数据，配置开业三人队和各地采集四人队，右侧即时预览。

启动：`node scripts/serve.js`，打开 http://127.0.0.1:5173/web/

## 2026-08-15

初始化本目录 git。

- 导入白菜菊花个人数据 `data/userData.json`
- 拉取图鉴数据 `data/data.min.json`
- 增加 `scripts/build-report.js`：统计已有厨师，并按 4 人/地、厨师不跨区重复，计算菜园 / 玉片 / 调料采集对照表
- 生成 `reports/厨师总表.md`、`reports/采集对照表.md`、`reports/采集对照表.csv`
