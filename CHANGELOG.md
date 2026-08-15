# 修改记录

## 2026-08-15

网页可像白菜菊花一样同步数据：游戏校验码导入角色、云端 ID 拉取、一键更新图鉴；新增角色一览。

- 游戏内「设置 → 白菜菊花」校验码调用 `yx518.com/api/archive.do`
- 「更新图鉴」拉取 `h5.baochaojianghu.com/data/data.min.json`
- 本地服务增加保存接口，导入后写回 `data/userData.json` / `data/data.min.json`
- 官方只含满级满阶，与本地已有合并，保留遗玉厨具

## 2026-08-15

增加本地网页：导入白菜菊花数据，配置开业三人队和各地采集四人队，右侧即时预览。

启动：`node scripts/serve.js`，打开 http://127.0.0.1:5173/web/

## 2026-08-15

初始化本目录 git。

- 导入白菜菊花个人数据 `data/userData.json`
- 拉取图鉴数据 `data/data.min.json`
- 增加 `scripts/build-report.js`：统计已有厨师，并按 4 人/地、厨师不跨区重复，计算菜园 / 玉片 / 调料采集对照表
- 生成 `reports/厨师总表.md`、`reports/采集对照表.md`、`reports/采集对照表.csv`
