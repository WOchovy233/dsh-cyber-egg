# 赛博鸡蛋 · Cyber eggs

DeepSeek Harness 插件：每天捡免费 token，一键装进模型列表，中转站自动签到，面板内一键更新。

左侧栏「赛博鸡蛋」入口，四个标签页：**鸡蛋市场 / 匿名免费 / 我的中转站 / 自动领取**。

匿名免费有三个免注册池（Kilo 公共网关 + Pollinations + LLM7），点「全池体检」会逐个发「你好」，只保留能聊的、自动移除连不上的（可一键恢复）；点检查更新 / 更新成功后也会自动体检一次。桌面端和安卓 DSH Go 装同一个包。

---

## 一键下载（永久链接）

| 扫码直接下载最新包 | 扫码打开版本页 | 扫码打开仓库 |
|:---:|:---:|:---:|
| <img src="qr/download.png" width="180" alt="下载最新 cyber-egg-latest.tgz"> | <img src="qr/releases.png" width="180" alt="全部版本"> | <img src="qr/repo.png" width="180" alt="仓库主页"> |
| `cyber-egg-latest.tgz` | 历史版本与更新说明 | 源码 |

**点一下就下载（这条链接永远指向最新版，不需要换）：**

```
https://github.com/WOchovy233/dsh-cyber-egg/releases/latest/download/cyber-egg-latest.tgz
```

- 版本页：https://github.com/WOchovy233/dsh-cyber-egg/releases/latest
- 校验：`sha256` 以对应 Release 说明为准（每次发版都会更新）

---

## 安装方式

### 方式一：直连 URL 安装（最省事，永远装最新版）

手机 DSH Go 终端，或电脑终端，一行搞定：

```bash
dsh plugin --profile web add https://github.com/WOchovy233/dsh-cyber-egg/releases/latest/download/cyber-egg-latest.tgz
```

也可以先扫码下载到手机，再装本地文件：

```bash
dsh plugin --profile web add file:/sdcard/Download/cyber-egg-latest.tgz
```

### 方式二：直接装 Git 仓库

```bash
dsh plugin --profile web add github:WOchovy233/dsh-cyber-egg
```

仓库地址：https://github.com/WOchovy233/dsh-cyber-egg

### 方式三：DSH Go（安卓）

1. 先装 App：[DSH Go Releases](https://github.com/ccch1mneyyy/dsh-Go/releases)（第三方客户端，Android 8+，常用手机选 arm64），首次启动选「本机安装运行环境」；
2. 用方式一或方式二把插件装进手机里的 DSH；
3. 重启引擎 → 设置 → 插件 → 启用「赛博鸡蛋」；
4. 回到对话页点左侧栏鸡蛋图标。

装好之后不再需要命令行：面板右上角 **「检查更新 → 更新到 vX」** 一键升级。

---

## 更新机制

面板读取仓库根目录的 [`update.json`](./update.json)（带签名文件 `update.json.sig`）：

1. 检查更新：比较版本号，有新版本时按钮变为 **「更新到 vX」**；
2. 点击后下载安装包、校验签名与 sha256，再交给运行环境安装；
3. 提示「已更新，刷新页面」或「重启 DSH 后生效」。

`cyber-egg-latest.tgz` 是永久文件名，所以上面的直链和二维码不会失效。

---

## 目录

| 文件 | 说明 |
|---|---|
| `index.js` | Host 半身：HTTP API、市场安装、中转站签到、定时器、Kilo 转发、自更新 |
| `client.js` | 浏览器半身：左侧栏入口 + 面板 UI |
| `catalog.js` | 免费 token 来源数据（分级、额度、注册条件） |
| `update.json` | 自更新清单（版本 / 下载地址 / sha256） |
| `qr/*.png` | 下载二维码（最新包 / 版本页 / 仓库） |
| `cyber-egg-*.tgz` | 可直接安装的插件包 |
| `cordis.patch.yml` | bundle patch |
| `locale/*.json` | 插件标题与描述（中英） |

## 安全与限制

- API Key 与中转站口令只保存在本机凭据库，不写入插件配置，也不随插件包分发。
- 中转站、雷达、订阅与更新状态只保存在本机；更新包缓存在本机。
- 匿名免费通道经本机随机机房端口转发（每台设备自己的端口，被占用自动顺延，路由跟随实际端口），转发只发生在你自己这台机器内部，不记录对话内容。免费池的提示词可能被上游记录，勿发敏感内容。
- 自更新清单带数字签名，版本号、校验值与下载地址都在签名范围内；镜像被篡改只会导致升级失败。验签失败时请到 Release 页面手动下载安装包。
- 需要人类验证 / 图形验证码 / 微信小程序登录的站点无法自动签到。
- 自更新依赖运行环境的插件管理服务；DSH Go 的本机引擎提供该服务，远程主机模式只支持插件开关。

## License

MIT
