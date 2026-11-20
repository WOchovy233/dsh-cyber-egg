# 赛博鸡蛋 · Cyber eggs

DeepSeek Harness 插件：每天捡免费 token，一键装进模型列表，中转站自动签到，手机上也能一键更新。

- 左侧栏「赛博鸡蛋」入口，面板四个标签页：**鸡蛋市场 / 匿名免费 / 我的中转站 / 自动领取**
- 市场按 🔥 热门、荐 编辑推荐、更多 三段排序，每张卡片写明每天额度与国内注册条件
- 全球免费模型雷达（OpenRouter 实时数据；不可达时自动降级到 Kilo 免费池）
- 匿名免费：Kilo 公共网关的免注册免 Key 模型，本机透明转发去掉鉴权头
- 中转站 New API / One API 每日签到，可设时间、可补领
- **面板内「检查更新 / 更新到 vX」**：点击即下载并安装新版本

## 安装

### 方式一：本地 tarball（推荐手机用）

```bash
dsh plugin --profile web add file:/path/to/cyber-egg-1.4.0.tgz
```

### 方式二：直接装 Git 仓库

```bash
dsh plugin --profile web add github:WOchovy233/dsh-cyber-egg
```

### 方式三：DSH Go（安卓）

DSH Go 用「本机引擎」模式，把 `cyber-egg-1.4.0.tgz` 传到手机后：

```bash
dsh plugin --profile web add file:/sdcard/Download/cyber-egg-1.4.0.tgz
```

重启引擎，设置 → 插件 → 启用「赛博鸡蛋」。

## 更新

插件面板右上角有一个 **「检查更新」** 按钮。它读取本仓库的
[`update.json`](./update.json)：

1. 依次尝试 GitHub Release、raw.githubusercontent、jsDelivr 上的 `update.json`；
2. 比较版本号，有新版本时按钮变为 **「更新到 vX」**；
3. 点击后下载对应 tarball、校验 sha256，再调用 DSH 的 `pluginManager.installBundle()` 完成安装；
4. 提示「已更新，刷新页面」或「重启 DSH 后生效」。

版本号、下载地址和 sha256 都在 `update.json` 里，升级时只改这一个文件。

## 目录

| 文件 | 说明 |
|---|---|
| `index.js` | Host 半身：HTTP API、市场安装、中转站签到、定时器、Kilo 转发、自更新 |
| `client.js` | 浏览器半身：左侧栏入口 + 面板 UI |
| `catalog.js` | 免费 token 来源数据（分级、额度、注册条件） |
| `update.json` | 自更新清单（版本 / 下载地址 / sha256） |
| `cyber-egg-*.tgz` | 可直接安装的插件包 |
| `cordis.patch.yml` | bundle patch |
| `locale/*.json` | 插件标题与描述（中英） |

## 安全与限制

- API Key 写入本机凭据库（`EGG_*_API_KEY`），中转站口令写入 `CYBER_EGG_RELAY_*`，都不进 `cordis.patch.yml`。
- 中转站、雷达、订阅与更新状态保存在 `<DSH_HOME>/cyber-egg/<profile>.json`。
- Kilo 匿名通道在本机 `127.0.0.1:18878` 做透明转发：DSH 适配器强制带鉴权头，而该网关要求不带；转发只改这一处，不记录对话。免费池的提示词可能被上游记录，勿发敏感内容。
- 需要人类验证 / 图形验证码 / 微信小程序登录的站点无法自动签到。
- 自更新依赖 `pluginManager` 服务；DSH Go 的本机引擎提供该服务，远程主机模式只支持插件开关。

## License

MIT
