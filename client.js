window.__ModuleLoader__.load({
  id: '@local/cyber-egg',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback, useRef, useMemo } = React

    /* ------------------------------------------------------------ locale */

    const DICT = {
      zh: {
        'entry.label': '赛博鸡蛋',
        'title': '赛博鸡蛋',
        'subtitle': '每天捡免费 token：一键装进模型列表，中转站自动签到。',
        'tab.market': '鸡蛋市场',
        'tab.anon': '匿名免费',
        'anon.title': '匿名免费模型（免注册 · 免 Key）',
        'anon.note':
          '直连 Kilo 公共免费网关，DSH 适配器强制带鉴权头，由本插件在本机随机机房端口做一次纯转发把该头去掉，不保存对话内容。免费池的提示词可能被上游记录，勿发敏感内容。',
        'anon.count': '免费模型 {n} 个',
        'anon.enabled': '已启用 {n} 个',
        'anon.route': '路由 {route}',
        'anon.port': '本机机房 :{port}',
        'anon.train': '可能记录提示词',
        'anon.enable': '启用',
        'anon.enabledState': '已启用',
        'anon.enableAll': '全部启用',
        'anon.disable': '全部停用',
        'anon.disabled': '已停用',
        'anon.stale': '已下架 {n} 个',
        'anon.prune': '清理已下架',
        'history.clear': '清空记录',
        'history.cleared': '记录已清空',
        'update.check': '检查更新',
        'update.checking': '检查中…',
        'update.latest': '已是最新 v{v}',
        'update.available': '更新到 v{v}',
        'update.installing': '更新中…',
        'update.done': '已更新到 v{v}，刷新页面即可',
        'update.restart': '已安装 v{v}，重启 DSH 后生效',
        'update.failed': '更新失败',
        'version': 'v{v}',
        'anon.test': '测试推理',
        'anon.testing': '推理中…',
        'anon.testOk': '推理成功：{text}',
        'anon.fail': '启用失败',
        'tab.relay': '我的中转站',
        'tab.auto': '自动领取',
        'group.hot': '大家都在用',
        'group.pick': '编辑推荐',
        'group.more': '更多鸡蛋',
        'group.feed': '自定义订阅源',
        'group.feedList': '订阅来的鸡蛋',
        'feed.manage': '管理订阅源',
        'feed.add': '添加',
        'feed.remove': '移除',
        'feed.empty': '还没有订阅源',
        'feed.failed': '拉取失败',
        'feed.placeholder': 'https://example.com/eggs.json',
        'feed.hint':
          '订阅源是任意一个 JSON 地址：{"sources":[{"id","name","baseURL","api","daily","access","signupUrl"}]}。点「刷新鸡蛋」时一起拉取，新条目会标「新」。',
        'feedAdded': '订阅源已添加',
        'feedRemoved': '订阅源已移除',
        'radar.title': '全球免费模型雷达',
        'radar.note': '实时数据：OpenRouter 公开模型接口里，输入与输出价格都为 0 的模型',
        'radar.free': '当前 {n} 个免费模型',
        'radar.new': '新上架 {n} 个',
        'radar.checked': '检查于 {time}',
        'radar.never': '还没刷新过',
        'radar.failed': '雷达拉取失败',
        'radar.fallback': 'OpenRouter 不可达（{msg}），已改用 Kilo 免费池',
        'radar.sourceKilo': 'Kilo 数据源',
        'radar.hint': '国内网络通常无法直连 OpenRouter；可挂代理后点「刷新鸡蛋」重试，或直接用「匿名免费」页里的 Kilo 免费池。',
        'radarUpdated': '已更新：当前 {n} 个免费模型',
        'refreshEggs': '刷新鸡蛋',
        'refreshing': '刷新中…',
        'showAll': '展开全部 {n} 个',
        'daily': '每天约',
        'refresh': '刷新',
        'loading': '读取中…',
        'loadFailed': '读取失败',
        'retry': '重试',
        'summary': '已装 {a} 个来源 · 今天领到 {b}/{c} 个中转站',
        'install': '一键安装',
        'installed': '已安装',
        'uninstall': '卸载',
        'models': '个模型',
        'signup': '去注册 / 拿 Key',
        'keyPlaceholder': '粘贴 API Key',
        'keyRequired': '先填入 API Key 再安装',
        'keyHint': 'Key 只写入本机凭据库，不会进配置文件。',
        'installNow': '拉取模型并安装',
        'installing': '正在安装…',
        'advanced': '手动指定模型（自动拉取失败时用）',
        'close': '关闭',
        'collapse': '收起',
        'advancedOptions': '高级选项',
        'relayNamePlaceholder': '例如 某某公益站',
        'uninstalled': '{name} 已卸载',
        'keyMissing': '口令缺失',
        'autoStatusOn': '自动领取：每天 {time}',
        'autoStatusOff': '自动领取：未开启',
        'gotoSettings': '去设置',
        'claimOk': '领取成功',
        'claimFail': '失败（{msg}）',
        'claimedCount': '已领取 {a}/{b}',
        'editRelay': '编辑中转站',
        'modelIdsPlaceholder': '每行一个模型 ID',
        'installDone': '装好了：{n} 个模型已加入模型列表',
        'installNeedModel': '没拉到模型列表，请在下面手动填模型 ID',
        'registeredNo': '已写入配置；若模型选择器里暂时没出现，刷新页面或切换一次模型即可。',
        'relay.empty': '还没有中转站。把你在用的免费中转站加进来，我每天帮你签到。',
        'relay.add': '＋ 添加中转站',
        'relay.name': '名称',
        'relay.baseURL': '站点地址',
        'relay.token': '口令 / Access Token',
        'relay.tokenKeep': '已保存，留空则不修改',
        'relay.userId': '用户 ID（New API 需要时填）',
        'relay.protocol': '签到协议',
        'relay.method': '请求方法',
        'relay.path': '请求路径',
        'relay.headers': '请求头（每行 Name: value）',
        'relay.body': '请求体（JSON）',
        'relay.keyword': '成功关键词（可选）',
        'relay.test': '测试连接',
        'relay.testing': '正在连接…',
        'relay.save': '保存',
        'relay.saving': '保存中…',
        'relay.cancel': '取消',
        'relay.edit': '编辑',
        'relay.delete': '删除',
        'relay.confirmDelete': '确认删除',
        'relay.claim': '立即领取',
        'relay.claiming': '领取中…',
        'relay.claimed': '今日已领',
        'relay.pending': '今日未领',
        'relay.paused': '已暂停',
        'relay.enable': '启用',
        'relay.disable': '暂停',
        'relay.ok': '连接正常',
        'relay.failed': '连接失败',
        'auto.title': '每天自动领取',
        'auto.enable': '开启自动领取',
        'auto.time': '每天领取时间',
        'auto.catchUp': 'DSH 启动时补领当天错过的',
        'auto.save': '保存设置',
        'auto.saved': '设置已保存',
        'auto.note': '自动领取在 DSH 运行期间执行；DSH 没开的日子不补（开启补领后，当天错过会在下次启动时补一次）。口令保存在本机凭据库。',
        'history.title': '领取记录',
        'history.empty': '还没有记录',
        'history.claimAll': '全部立即领取',
        'ok': '成功',
        'fail': '失败',
        'unknownError': '未知错误',
        'eggIcon': '赛博鸡蛋',
        'common.requestFailed': '请求失败',
        'feed.summary': '{n} 条 · {time}',
        'mark.hotTitle': '大家用得最多',
        'mark.pickTitle': '编辑推荐',
        'mark.new': '新',
        'group.pickMark': '荐',
        'region.cn': '国内节点',
        'region.intl': '海外节点',
        'optional': '可选',
        'relay.updated': '中转站已更新',
        'relay.added': '中转站已添加',
        'relay.keywordPlaceholder': '签到成功',
        'relay.testKeepToken': '用已保存的口令测试',
        'anon.health': '体检可用性',
        'anon.healthRunning': '逐个发「你好」…',
        'anon.healthDone': '体检完成：{kept} 个能聊，移除 {removed} 个连不上的',
        'anon.healthClean': '体检完成：{kept} 个全部能聊',
        'anon.healthRate': '体检完成：{kept} 个能聊，{limited} 个被限流（保留）',
        'anon.unblock': '恢复 {n} 个已屏蔽',
        'anon.healthEmpty': '还没有启用匿名模型',
        'anon.blocked': '已屏蔽 {n} 个连不上的',
        'pollinations.title': 'Pollinations 免注册池',
        'pollinations.note': '免 Key、免注册的公共接口；免费额度是每个 IP 每 45 秒 1 次，适合偶尔顶一下。',
        'update.health': '更新后体检：{kept} 个能聊，移除 {removed} 个',
        'update.signed': '清单已验签',
        'update.badSignature': '更新清单未通过签名校验，已拒绝安装。请到 Release 页面手动下载安装包。',
      },
      en: {
        'entry.label': 'Cyber eggs',
        'title': 'Cyber eggs',
        'subtitle': 'Collect free tokens daily: install a source as a model with one click, and auto check in to relay sites.',
        'tab.market': 'Market',
        'tab.anon': 'No-key',
        'anon.title': 'Anonymous free models (no sign-up, no key)',
        'anon.note':
          "Straight to Kilo's public free gateway. DSH's adapter always sends an auth header, so this plugin forwards through a random local port and strips it — conversations are not stored. The free pool may log prompts upstream; never send sensitive content.",
        'anon.count': '{n} free models',
        'anon.enabled': '{n} enabled',
        'anon.route': 'route {route}',
        'anon.port': 'local host :{port}',
        'anon.train': 'may log prompts',
        'anon.enable': 'Enable',
        'anon.enabledState': 'Enabled',
        'anon.enableAll': 'Enable all',
        'anon.disable': 'Disable all',
        'anon.disabled': 'Disabled',
        'anon.stale': '{n} no longer listed',
        'anon.prune': 'Remove delisted',
        'history.clear': 'Clear history',
        'history.cleared': 'History cleared',
        'update.check': 'Check for updates',
        'update.checking': 'Checking…',
        'update.latest': 'Up to date (v{v})',
        'update.available': 'Update to v{v}',
        'update.installing': 'Updating…',
        'update.done': 'Updated to v{v}; reload the page',
        'update.restart': 'v{v} installed; restart DSH to apply',
        'update.failed': 'Update failed',
        'version': 'v{v}',
        'anon.test': 'Test inference',
        'anon.testing': 'Thinking…',
        'anon.testOk': 'Inference works: {text}',
        'anon.fail': 'Enable failed',
        'tab.relay': 'My relays',
        'tab.auto': 'Auto claim',
        'group.hot': 'Most used',
        'group.pick': 'Editor picks',
        'group.more': 'More eggs',
        'group.feed': 'Custom feeds',
        'group.feedList': 'From feeds',
        'feed.manage': 'Manage feeds',
        'feed.add': 'Add',
        'feed.remove': 'Remove',
        'feed.empty': 'No feeds yet',
        'feed.failed': 'Fetch failed',
        'feed.placeholder': 'https://example.com/eggs.json',
        'feed.hint':
          'A feed is any JSON URL: {"sources":[{"id","name","baseURL","api","daily","access","signupUrl"}]}. Refresh eggs pulls it too; new entries get a "new" mark.',
        'feedAdded': 'Feed added',
        'feedRemoved': 'Feed removed',
        'radar.title': 'Global free-model radar',
        'radar.note': 'Live data: OpenRouter public model API, models priced 0 for both input and output',
        'radar.free': '{n} free models right now',
        'radar.new': '{n} newly listed',
        'radar.checked': 'checked {time}',
        'radar.never': 'not checked yet',
        'radar.failed': 'Radar fetch failed',
        'radar.fallback': 'OpenRouter is unreachable ({msg}); Kilo free pool is being used instead',
        'radar.sourceKilo': 'Kilo source',
        'radar.hint':
          'OpenRouter is usually unreachable from mainland networks. Use a proxy and press Refresh eggs, or use the Kilo pool on the No-key tab.',
        'radarUpdated': 'Updated: {n} free models right now',
        'refreshEggs': 'Refresh eggs',
        'refreshing': 'Refreshing…',
        'showAll': 'Show all {n}',
        'daily': 'Daily',
        'refresh': 'Refresh',
        'loading': 'Loading…',
        'loadFailed': 'Could not load',
        'retry': 'Retry',
        'summary': '{a} sources installed · {b}/{c} relays claimed today',
        'install': 'Install',
        'installed': 'Installed',
        'uninstall': 'Remove',
        'models': 'models',
        'signup': 'Get a key',
        'keyPlaceholder': 'Paste API key',
        'keyRequired': 'Enter an API key first',
        'keyHint': 'The key goes to the local credential store, never to a config file.',
        'installNow': 'Fetch models and install',
        'installing': 'Installing…',
        'advanced': 'Model ids (only if discovery fails)',
        'close': 'Close',
        'collapse': 'Hide',
        'advancedOptions': 'More options',
        'relayNamePlaceholder': 'e.g. My relay',
        'uninstalled': '{name} removed',
        'keyMissing': 'No token saved',
        'autoStatusOn': 'Auto claim: daily {time}',
        'autoStatusOff': 'Auto claim: off',
        'gotoSettings': 'Settings',
        'claimOk': 'Claimed',
        'claimFail': 'Failed ({msg})',
        'claimedCount': 'Claimed {a}/{b}',
        'editRelay': 'Edit relay',
        'modelIdsPlaceholder': 'One model id per line',
        'installDone': 'Installed: {n} models added to the model list',
        'installNeedModel': 'No model list returned; type model ids below',
        'registeredNo': 'Config written. If the model picker does not show it yet, reload the page.',
        'relay.empty': 'No relay sites yet. Add the free relay you use and it will be checked in daily.',
        'relay.add': '+ Add relay',
        'relay.name': 'Name',
        'relay.baseURL': 'Site URL',
        'relay.token': 'Token',
        'relay.tokenKeep': 'Saved — leave blank to keep',
        'relay.userId': 'User id (New API)',
        'relay.protocol': 'Check-in protocol',
        'relay.method': 'Method',
        'relay.path': 'Path',
        'relay.headers': 'Headers (one Name: value per line)',
        'relay.body': 'Body (JSON)',
        'relay.keyword': 'Success keyword (optional)',
        'relay.test': 'Test',
        'relay.testing': 'Testing…',
        'relay.save': 'Save',
        'relay.saving': 'Saving…',
        'relay.cancel': 'Cancel',
        'relay.edit': 'Edit',
        'relay.delete': 'Delete',
        'relay.confirmDelete': 'Confirm delete',
        'relay.claim': 'Claim now',
        'relay.claiming': 'Claiming…',
        'relay.claimed': 'Claimed today',
        'relay.pending': 'Not claimed',
        'relay.paused': 'Paused',
        'relay.enable': 'Enable',
        'relay.disable': 'Pause',
        'relay.ok': 'Reachable',
        'relay.failed': 'Unreachable',
        'auto.title': 'Daily auto claim',
        'auto.enable': 'Enable daily check-in',
        'auto.time': 'Check-in time',
        'auto.catchUp': 'Catch up a missed run at startup',
        'auto.save': 'Save',
        'auto.saved': 'Saved',
        'auto.note': 'Check-in runs while DSH is running. A day DSH was closed is not replayed unless catch-up is on. Tokens stay in the local credential store.',
        'history.title': 'History',
        'history.empty': 'No records yet',
        'history.claimAll': 'Claim all now',
        'ok': 'ok',
        'fail': 'failed',
        'unknownError': 'Unknown error',
        'eggIcon': 'Cyber eggs',
        'common.requestFailed': 'Request failed',
        'feed.summary': '{n} items · {time}',
        'mark.hotTitle': 'Most used',
        'mark.pickTitle': 'Editor picks',
        'mark.new': 'NEW',
        'group.pickMark': 'Pick',
        'region.cn': 'China region',
        'region.intl': 'Global region',
        'optional': 'optional',
        'relay.updated': 'Relay updated',
        'relay.added': 'Relay added',
        'relay.keywordPlaceholder': 'checkin success',
        'relay.testKeepToken': 'Test with the saved token',
        'anon.health': 'Check which models answer',
        'anon.healthRunning': 'Saying hi to each model…',
        'anon.healthDone': 'Check done: {kept} usable, {removed} unreachable removed',
        'anon.healthClean': 'Check done: all {kept} answer',
        'anon.healthRate': 'Check done: {kept} usable, {limited} throttled (kept)',
        'anon.unblock': 'Unblock {n}',
        'anon.healthEmpty': 'No anonymous model enabled yet',
        'anon.blocked': '{n} unreachable blocked',
        'pollinations.title': 'Pollinations no-signup pool',
        'pollinations.note': 'Public no-key, no-signup endpoint; the free tier allows one reply per IP every 45 seconds.',
        'update.health': 'Checked after update: {kept} usable, {removed} removed',
        'update.signed': 'manifest signed',
        'update.badSignature': 'The update manifest failed signature verification, so the install was refused. Download the package manually from the Release page.',
      },
    }

    let activeDict = DICT.zh

    function translate(key, vars) {
      let text = activeDict[key] ?? DICT.en[key] ?? key
      if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value))
      return text
    }

    function activeLocale(ctx) {
      let raw = ''
      try {
        const locale = ctx.locale
        const value = locale?.getLocale?.() ?? locale?.getSnapshot?.()
        raw = typeof value === 'string' ? value : value?.id ?? value?.locale ?? value?.current ?? ''
      } catch {
        raw = ''
      }
      if (!raw) raw = typeof navigator === 'undefined' ? '' : navigator.language || ''
      return /^en/i.test(String(raw)) ? 'en' : 'zh'
    }

    function useT(ctx) {
      const [localeId, setLocaleId] = useState(() => activeLocale(ctx))
      useEffect(() => {
        if (!ctx.locale?.subscribe) return undefined
        const unsubscribe = ctx.locale.subscribe(() => setLocaleId(activeLocale(ctx)))
        return () => {
          try {
            unsubscribe?.()
          } catch {
            /* ignore */
          }
        }
      }, [])
      const table = DICT[localeId] || DICT.zh
      activeDict = table
      return useCallback(
        (key, vars) => translate(key, vars),
        [localeId],
      )
    }

    /* --------------------------------------------------------------- data */

    async function api(path, body, options) {
      const opts = options || {}
      const request =
        body === undefined
          ? { headers: { accept: 'application/json' } }
          : {
              method: 'POST',
              headers: { 'content-type': 'application/json', accept: 'application/json' },
              body: JSON.stringify(body),
            }
      const response = await fetch(`/cyber-egg/api${path}`, request)
      const text = await response.text()
      let data = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = {}
      }
      if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`)
      if (data.ok === false && !opts.allowFail) {
        throw new Error(data.error || data.message || data.result?.message || translate('common.requestFailed'))
      }
      return data
    }

    /* --------------------------------------------------------------- icon */

    function EggIcon(props) {
      const size = Number(props?.size) > 0 ? Number(props.size) : 20
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block', opacity: props?.active ? 1 : 0.92 },
        },
        h('path', {
          d: 'M12.1 2.9c3.6.1 6.2 4.5 6.2 8.6 0 4.4-2.8 8-6.3 8.1-3.6.1-6.4-3.4-6.4-7.9 0-4.2 2.7-8.9 6.5-8.8Z',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinejoin: 'round',
          fill: 'none',
        }),
        h('path', {
          d: 'M17.9 3.6v3.1M16.35 5.15h3.1',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
      )
    }

    /* ---------------------------------------------------------------- css */

    const CSS = `
      .ce-root { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0;
        background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-size: 13px; }
      .ce-scroll { flex: 1; min-height: 0; overflow: auto; padding: 26px 30px 56px; }
      .ce-wrap { max-width: 1040px; margin: 0 auto; }
      .ce-head { display: flex; align-items: flex-start; gap: 12px; }
      .ce-head-main { flex: 1; min-width: 0; }
      .ce-title { display: flex; align-items: center; gap: 9px; font-size: 19px; font-weight: 600; letter-spacing: .2px; }
      .ce-title svg { color: var(--dsw-alias-brand-primary); }
      .ce-sub { margin-top: 6px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
      .ce-stats { margin-top: 10px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .ce-tabs { display: flex; gap: 2px; margin: 20px 0 18px; border-bottom: 1px solid var(--dsw-alias-border-l1);
        overflow-x: auto; scrollbar-width: none; }
      .ce-tabs::-webkit-scrollbar { display: none; }
      .ce-tab { appearance: none; border: 0; background: none; padding: 9px 13px; font: inherit; font-size: 13px;
        color: var(--dsw-alias-label-secondary); border-bottom: 2px solid transparent; cursor: pointer; }
      .ce-tab:hover { color: var(--dsw-alias-label-primary); }
      .ce-tab[aria-selected="true"] { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-brand-primary); font-weight: 600; }
      .ce-tab:focus-visible, .ce-btn:focus-visible, .ce-input:focus-visible, .ce-area:focus-visible, .ce-switch:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
      .ce-section { margin-top: 22px; }
      .ce-section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .ce-section-title { font-size: 13.5px; font-weight: 600; margin: 0; letter-spacing: .2px; }
      .ce-name-wrap { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; flex-wrap: wrap; }
      .ce-mark { font-size: 11px; line-height: 1; padding: 3px 6px; border-radius: 6px; border: 1px solid currentColor;
        color: var(--dsw-alias-state-success-primary); background: transparent; }
      .ce-mark.fire { border: 0; padding: 0 2px; font-size: 13px; color: inherit; }
      .ce-mark.pick { color: var(--dsw-alias-state-success-primary); background: rgba(63,142,126,.1); }
      .ce-mark.fresh { color: var(--dsw-alias-state-warn-primary); }
      .ce-daily { font-size: 12px; color: var(--dsw-alias-label-primary); font-weight: 500; }
      .ce-detail { font-size: 11.5px; line-height: 1.6; color: var(--dsw-alias-label-secondary);
        display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
      .ce-pill.warn { color: var(--dsw-alias-state-warn-primary); border-color: currentColor; }
      .ce-badge.new { color: var(--dsw-alias-state-warn-primary); border-color: currentColor; }
      .ce-radar { border-color: var(--dsw-alias-border-l2); }
      .ce-radar-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 4px 14px; }
      .ce-radar-item { display: flex; align-items: center; gap: 8px; font-size: 11.5px; min-width: 0; }
      .ce-radar-vendor { color: var(--dsw-alias-label-secondary); flex: none; }
      .ce-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ce-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(292px, 1fr)); gap: 12px; }
      .ce-card { display: flex; flex-direction: column; gap: 9px; padding: 15px; border-radius: 12px;
        background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); }
      .ce-card-top { display: flex; align-items: flex-start; gap: 8px; }
      .ce-name { font-size: 14px; font-weight: 600; line-height: 1.3; flex: 1; min-width: 0; }
      .ce-badges { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
      .ce-badge { font-size: 10.5px; line-height: 1; padding: 4px 7px; border-radius: 999px;
        border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .ce-badge.ok { color: var(--dsw-alias-state-success-primary); border-color: currentColor; }
      .ce-quota { font-size: 12px; color: var(--dsw-alias-label-primary); }
      .ce-blurb { font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
      .ce-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ce-row.end { margin-top: auto; padding-top: 4px; }
      .ce-btn { appearance: none; font: inherit; font-size: 12.5px; padding: 6px 11px; border-radius: 8px;
        border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary); cursor: pointer; text-decoration: none; display: inline-flex;
        align-items: center; gap: 6px; white-space: nowrap; }
      .ce-btn:hover { border-color: var(--dsw-alias-label-secondary); }
      .ce-btn:disabled { opacity: .55; cursor: default; }
      .ce-btn.primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #fff; font-weight: 600; }
      .ce-btn.primary:hover { filter: brightness(1.06); }
      .ce-btn.ghost { background: none; border-color: transparent; color: var(--dsw-alias-label-secondary); }
      .ce-btn.ghost:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
      .ce-btn.danger { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); background: none; }
      .ce-form { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding-top: 10px;
        border-top: 1px dashed var(--dsw-alias-border-l1); }
      .ce-field { display: flex; flex-direction: column; gap: 4px; }
      .ce-label { font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .ce-input, .ce-area { font: inherit; font-size: 12.5px; width: 100%; box-sizing: border-box; padding: 7px 9px;
        border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary); }
      .ce-area { resize: vertical; min-height: 54px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
      .ce-hint { font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
      .ce-error { font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-state-error-primary); }
      .ce-ok { font-size: 11.5px; color: var(--dsw-alias-state-success-primary); }
      .ce-list { display: flex; flex-direction: column; gap: 9px; }
      .ce-item { display: flex; gap: 14px; align-items: flex-start; justify-content: space-between; padding: 13px 15px;
        border-radius: 11px; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); }
      .ce-item-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .ce-item-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ce-item-url { font-size: 11.5px; color: var(--dsw-alias-label-secondary); word-break: break-all; }
      .ce-pill { font-size: 10.5px; padding: 3px 7px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2);
        color: var(--dsw-alias-label-secondary); }
      .ce-pill.ok { color: var(--dsw-alias-state-success-primary); border-color: currentColor; }
      .ce-pill.bad { color: var(--dsw-alias-state-error-primary); border-color: currentColor; }
      .ce-pill.idle { color: var(--dsw-alias-state-idle-primary); }
      .ce-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .ce-panel { border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); padding: 16px; }
      .ce-panel + .ce-panel { margin-top: 12px; }
      .ce-panel-title { font-size: 13px; font-weight: 600; margin-bottom: 10px; }
      .ce-switch { position: relative; width: 36px; height: 20px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2);
        background: var(--dsw-alias-bg-layer-2); cursor: pointer; padding: 0; flex: none; }
      .ce-switch .ce-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
        background: var(--dsw-alias-label-secondary); transition: transform .16s ease, background .16s ease; }
      .ce-switch[aria-checked="true"] { background: var(--dsw-alias-brand-primary); border-color: transparent; }
      .ce-switch[aria-checked="true"] .ce-knob { transform: translateX(16px); background: #fff; }
      .ce-inline { display: flex; align-items: center; gap: 10px; }
      .ce-history { display: flex; flex-direction: column; gap: 6px; }
      .ce-history-row { display: flex; gap: 10px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
      .ce-history-row b { font-weight: 500; color: var(--dsw-alias-label-primary); }
      .ce-toast { position: absolute; left: 50%; transform: translateX(-50%); bottom: 22px; z-index: 20;
        max-width: min(760px, calc(100% - 40px)); padding: 9px 14px; border-radius: 10px; pointer-events: none;
        font-size: 12.5px; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2);
        color: var(--dsw-alias-label-primary); box-shadow: 0 6px 24px rgba(0,0,0,.14); word-break: break-word; }
      .ce-toast.bad { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
      .ce-empty { padding: 26px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 12.5px;
        border: 1px dashed var(--dsw-alias-border-l1); border-radius: 12px; }
      @media (max-width: 720px) {
        .ce-scroll { padding: 18px 16px 44px; }
        .ce-item { flex-direction: column; }
        .ce-actions { justify-content: flex-start; }
        .ce-grid { grid-template-columns: 1fr; }
        .ce-radar-list { grid-template-columns: 1fr; }
        .ce-tab { padding: 10px 11px; white-space: nowrap; }
        .ce-btn { min-height: 34px; padding: 8px 12px; }
        .ce-input, .ce-area { min-height: 36px; }
        .ce-card { padding: 13px; }
      }
    `

    /* ------------------------------------------------------------ helpers */

    function Spinner() {
      return h(
        'svg',
        { width: 13, height: 13, viewBox: '0 0 24 24', 'aria-hidden': true, style: { animation: 'ce-spin 1s linear infinite' } },
        h('path', {
          d: 'M12 3a9 9 0 1 0 9 9',
          stroke: 'currentColor',
          strokeWidth: 2.4,
          strokeLinecap: 'round',
          fill: 'none',
        }),
      )
    }

    function Switch(props) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': props.checked ? 'true' : 'false',
          'aria-label': props.label,
          className: 'ce-switch',
          disabled: props.disabled,
          onClick: () => props.onChange(!props.checked),
        },
        h('span', { className: 'ce-knob' }),
      )
    }

    function Field(props) {
      return h(
        'label',
        { className: 'ce-field' },
        h('span', { className: 'ce-label' }, props.label),
        props.children,
      )
    }

    /* -------------------------------------------------------------- market */

    function RadarPanel(props) {
      const { t, radar, onRefresh, refreshing } = props
      const [showAll, setShowAll] = useState(false)
      const items = (radar && radar.items) || []
      const shown = showAll ? items : items.slice(0, 8)
      const checked = radar && radar.at ? new Date(radar.at).toLocaleString() : t('radar.never')
      return h(
        'div',
        { className: 'ce-panel ce-radar' },
        h(
          'div',
          { className: 'ce-row', style: { justifyContent: 'space-between', alignItems: 'flex-start' } },
          h(
            'div',
            { style: { minWidth: 0 } },
            h(
              'div',
              { className: 'ce-row', style: { gap: 8 } },
              h('div', { className: 'ce-panel-title', style: { margin: 0 } }, t('radar.title')),
              radar && radar.source === 'kilo'
                ? h('span', { className: 'ce-pill warn' }, t('radar.sourceKilo'))
                : null,
            ),
            h('div', { className: 'ce-hint' }, t('radar.note')),
          ),
          h(
            'button',
            { type: 'button', className: 'ce-btn primary', disabled: refreshing, onClick: onRefresh },
            refreshing ? h(Spinner) : null,
            refreshing ? t('refreshing') : t('refreshEggs'),
          ),
        ),
        h(
          'div',
          { className: 'ce-row', style: { marginTop: 10 } },
          h('span', { className: 'ce-badge ok' }, t('radar.free', { n: (radar && radar.freeCount) || 0 })),
          radar && radar.newIds && radar.newIds.length
            ? h('span', { className: 'ce-badge new' }, t('radar.new', { n: radar.newIds.length }))
            : null,
          h('span', { className: 'ce-hint' }, t('radar.checked', { time: checked })),
        ),
        radar && radar.warning
          ? h('div', { className: 'ce-pill warn', style: { marginTop: 8, whiteSpace: 'normal', lineHeight: 1.6 } },
              t('radar.fallback', { msg: radar.warning }))
          : null,
        radar && radar.error
          ? h(
              'div',
              { style: { marginTop: 8 } },
              h('div', { className: 'ce-error', role: 'alert' }, `${t('radar.failed')}：${radar.error}`),
              h('div', { className: 'ce-hint', style: { marginTop: 4 } }, t('radar.hint')),
            )
          : null,
        items.length
          ? h(
              'div',
              { style: { marginTop: 10 } },
              h(
                'div',
                { className: 'ce-radar-list' },
                shown.map(item =>
                  h(
                    'div',
                    { className: 'ce-radar-item', key: item.id },
                    h('span', { className: 'ce-radar-vendor' }, item.vendor),
                    h('span', { className: 'ce-mono', title: item.id }, item.name || item.id),
                    item.context ? h('span', { className: 'ce-hint' }, `${Math.round(item.context / 1000)}K`) : null,
                  ),
                ),
              ),
              items.length > 8
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'ce-btn ghost',
                      style: { marginTop: 6 },
                      onClick: () => setShowAll(value => !value),
                    },
                    showAll ? t('collapse') : t('showAll', { n: items.length }),
                  )
                : null,
            )
          : null,
      )
    }

    function FeedsPanel(props) {
      const { t, feeds, onFeed } = props
      const [url, setUrl] = useState('')
      const [busy, setBusy] = useState(false)
      const [open, setOpen] = useState(false)

      const submit = async () => {
        const value = url.trim()
        if (!value) return
        setBusy(true)
        try {
          const ok = await onFeed('add', value)
          if (ok) setUrl('')
        } finally {
          setBusy(false)
        }
      }

      return h(
        'div',
        { className: 'ce-panel', style: { marginTop: 20 } },
        h(
          'div',
          { className: 'ce-row', style: { justifyContent: 'space-between' } },
          h('div', { className: 'ce-panel-title', style: { margin: 0 } }, t('group.feed')),
          h(
            'button',
            {
              type: 'button',
              className: 'ce-btn ghost',
              'aria-expanded': open ? 'true' : 'false',
              onClick: () => setOpen(value => !value),
            },
            open ? t('collapse') : t('feed.manage'),
          ),
        ),
        h('div', { className: 'ce-hint', style: { marginTop: 6 } }, t('feed.hint')),
        open
          ? h(
              'div',
              null,
              h(
                'div',
                { className: 'ce-row', style: { marginTop: 10 } },
                h('input', {
                  className: 'ce-input',
                  style: { flex: 1, minWidth: 220 },
                  value: url,
                  placeholder: t('feed.placeholder'),
                  onChange: event => setUrl(event.target.value),
                  onKeyDown: event => {
                    if (event.key === 'Enter') submit()
                  },
                }),
                h(
                  'button',
                  { type: 'button', className: 'ce-btn primary', disabled: busy, onClick: submit },
                  busy ? h(Spinner) : null,
                  t('feed.add'),
                ),
              ),
              feeds && feeds.length
                ? h(
                    'div',
                    { className: 'ce-list', style: { marginTop: 10 } },
                    feeds.map(feed =>
                      h(
                        'div',
                        { className: 'ce-item', key: feed.url },
                        h(
                          'div',
                          { className: 'ce-item-main' },
                          h('div', { className: 'ce-item-url' }, feed.url),
                          feed.ok === false
                            ? h('div', { className: 'ce-error' }, `${t('feed.failed')}：${feed.error || ''}`)
                            : feed.at
                              ? h('div', { className: 'ce-hint' }, t('feed.summary', { n: feed.count || 0, time: new Date(feed.at).toLocaleString() }))
                              : null,
                        ),
                        h(
                          'button',
                          { type: 'button', className: 'ce-btn danger', onClick: () => onFeed('remove', feed.url) },
                          t('feed.remove'),
                        ),
                      ),
                    ),
                  )
                : h('div', { className: 'ce-empty', style: { marginTop: 10 } }, t('feed.empty')),
            )
          : null,
      )
    }

    function AnonGroup(props) {
      const { t, group, title, note, route, showTest, busy, testing, healthBusy, port, onInstall, onTest, onDisable, onPrune, onHealth } = props
      const items = (group && group.items) || []
      const installed = new Set((group && group.installed) || [])
      const stale = (group && group.stale) || []
      return h(
        'div',
        { style: { marginTop: 14 } },
        h(
          'div',
          { className: 'ce-panel ce-radar' },
          h(
            'div',
            { className: 'ce-row', style: { justifyContent: 'space-between', alignItems: 'flex-start' } },
            h(
              'div',
              { style: { minWidth: 0 } },
              h('div', { className: 'ce-panel-title', style: { margin: 0 } }, title),
              h('div', { className: 'ce-hint' }, note),
            ),
            h(
              'div',
              { className: 'ce-row' },
              h(
                'button',
                { type: 'button', className: 'ce-btn', disabled: healthBusy || installed.size === 0, onClick: onHealth, title: t('anon.health') },
                healthBusy ? h(Spinner) : null,
                healthBusy ? t('anon.healthRunning') : t('anon.health'),
              ),
              showTest
                ? h(
                    'button',
                    { type: 'button', className: 'ce-btn', disabled: testing || installed.size === 0, onClick: onTest },
                    testing ? h(Spinner) : null,
                    testing ? t('anon.testing') : t('anon.test'),
                  )
                : null,
              h(
                'button',
                { type: 'button', className: 'ce-btn primary', disabled: busy || !items.length, onClick: () => onInstall({ all: true }) },
                busy ? h(Spinner) : null,
                t('anon.enableAll'),
              ),
              installed.size
                ? h('button', { type: 'button', className: 'ce-btn ghost', disabled: busy, onClick: onDisable }, t('anon.disable'))
                : null,
              stale.length
                ? h(
                    'button',
                    { type: 'button', className: 'ce-btn ghost', disabled: busy, onClick: onPrune, title: stale.join(', ') },
                    t('anon.prune'),
                  )
                : null,
            ),
          ),
          h(
            'div',
            { className: 'ce-row', style: { marginTop: 10 } },
            h('span', { className: 'ce-badge ok' }, t('anon.count', { n: items.length })),
            installed.size ? h('span', { className: 'ce-badge ok' }, t('anon.enabled', { n: installed.size })) : null,
            stale.length ? h('span', { className: 'ce-badge' }, t('anon.stale', { n: stale.length })) : null,
            port ? h('span', { className: 'ce-badge ok' }, t('anon.port', { port })) : null,
            h('span', { className: 'ce-hint' }, t('anon.route', { route })),
          ),
          group && group.error ? h('div', { className: 'ce-error', role: 'alert', style: { marginTop: 8 } }, group.error) : null,
        ),
        items.length
          ? h(
              'div',
              { className: 'ce-grid', style: { marginTop: 14 } },
              items.map(item =>
                h(
                  'div',
                  { className: 'ce-card', key: item.id },
                  h(
                    'div',
                    { className: 'ce-card-top' },
                    h(
                      'div',
                      { className: 'ce-name-wrap' },
                      h('span', { className: 'ce-name' }, item.name || item.id),
                      item.mayTrain ? h('span', { className: 'ce-mark fresh', title: t('anon.train') }, '!') : null,
                    ),
                    h(
                      'div',
                      { className: 'ce-badges' },
                      installed.has(item.id) ? h('span', { className: 'ce-badge ok' }, t('anon.enabledState')) : null,
                    ),
                  ),
                  h('div', { className: 'ce-mono ce-item-url' }, item.id),
                  h(
                    'div',
                    { className: 'ce-row' },
                    h('span', { className: 'ce-pill' }, item.vendor),
                    item.context ? h('span', { className: 'ce-pill' }, `${Math.round(item.context / 1000)}K`) : null,
                    item.note ? h('span', { className: 'ce-pill' }, item.note) : null,
                  ),
                  h(
                    'div',
                    { className: 'ce-row end' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: installed.has(item.id) ? 'ce-btn ghost' : 'ce-btn primary',
                        disabled: busy || installed.has(item.id),
                        onClick: () => onInstall({ models: [item.id] }),
                      },
                      installed.has(item.id) ? t('anon.enabledState') : t('anon.enable'),
                    ),
                  ),
                ),
              ),
            )
          : h('div', { className: 'ce-empty', style: { marginTop: 14 } }, t('loading')),
      )
    }

    function AnonTab(props) {
      const { t, kilo, pollinations, anon, proxyPort, busy, testing, healthBusy, kiloActions, pollinationsActions, onUnblock } = props
      const blocked = (anon && anon.blocked) || []
      return h(
        'div',
        null,
        blocked.length
          ? h(
              'div',
              { className: 'ce-row', style: { marginTop: 10 } },
              h('span', { className: 'ce-hint', style: { flex: 1, minWidth: 0 }, title: blocked.join(', ') }, t('anon.blocked', { n: blocked.length })),
              h('button', { type: 'button', className: 'ce-btn ghost', onClick: onUnblock }, t('anon.unblock', { n: blocked.length })),
            )
          : null,
        h(
          AnonGroup,
          Object.assign(
            {
              t,
              group: kilo,
              title: t('anon.title'),
              note: t('anon.note'),
              route: 'kilo-free',
              showTest: true,
              busy,
              testing,
              healthBusy,
              port: proxyPort,
            },
            kiloActions || {},
          ),
        ),
        h(
          AnonGroup,
          Object.assign(
            {
              t,
              group: pollinations,
              title: t('pollinations.title'),
              note: t('pollinations.note'),
              route: 'pollinations-free',
              showTest: false,
              busy,
              testing: false,
              healthBusy,
            },
            pollinationsActions || {},
          ),
        ),
      )
    }

    function MarketTab(props) {
      const { t, sources, accessLabels, radar, feeds, refresh, refreshEggs, refreshing, toast, onFeed } = props
      const [drafts, setDrafts] = useState({})
      const [opened, setOpened] = useState({})
      const [busy, setBusy] = useState({})
      const [errors, setErrors] = useState({})
      const [advanced, setAdvanced] = useState({})
      const [pendingUninstall, setPendingUninstall] = useState('')

      const patchDraft = (id, patch) => setDrafts(current => ({ ...current, [id]: { ...current[id], ...patch } }))

      const runInstall = async source => {
        const draft = drafts[source.id] || {}
        const apiKey = (draft.key || '').trim()
        if (!apiKey) {
          setErrors(current => ({ ...current, [source.id]: t('keyRequired') }))
          return
        }
        setBusy(current => ({ ...current, [source.id]: true }))
        setErrors(current => ({ ...current, [source.id]: '' }))
        try {
          const result = await api('/install', { sourceId: source.id, apiKey, models: draft.models || '' })
          toast(t('installDone', { n: result.modelCount }) + (result.registered ? '' : ` ${t('registeredNo')}`))
          patchDraft(source.id, { key: '' })
          await refresh()
        } catch (error) {
          const message = String(error?.message || t('unknownError'))
          setErrors(current => ({ ...current, [source.id]: message }))
          if (/手动|model/i.test(message)) setAdvanced(current => ({ ...current, [source.id]: true }))
        } finally {
          setBusy(current => ({ ...current, [source.id]: false }))
        }
      }

      const runUninstall = async source => {
        if (pendingUninstall !== source.id) {
          setPendingUninstall(source.id)
          return
        }
        setBusy(current => ({ ...current, [source.id]: true }))
        try {
          await api('/uninstall', { sourceId: source.id })
          setPendingUninstall('')
          setErrors(current => ({ ...current, [source.id]: '' }))
          toast(t('uninstalled', { name: source.name }))
          await refresh()
        } catch (error) {
          setErrors(current => ({ ...current, [source.id]: String(error?.message || t('unknownError')) }))
        } finally {
          setBusy(current => ({ ...current, [source.id]: false }))
        }
      }

      const renderCard = source => {
        const draft = drafts[source.id] || {}
        const working = Boolean(busy[source.id])
        const error = errors[source.id]
        const accessText = (accessLabels && accessLabels[source.access]) || source.access || ''
        const accessClass =
          source.access === 'cn-direct' ? 'ce-pill ok' : source.access === 'cn-card' ? 'ce-pill bad' : 'ce-pill warn'
        return h(
          'div',
          { className: 'ce-card', key: source.id },
          h(
            'div',
            { className: 'ce-card-top' },
            h(
              'div',
              { className: 'ce-name-wrap' },
              h('span', { className: 'ce-name' }, source.name),
              source.tier === 'hot' ? h('span', { className: 'ce-mark fire', title: t('mark.hotTitle') }, '🔥') : null,
              source.tier === 'pick' ? h('span', { className: 'ce-mark pick', title: t('mark.pickTitle') }, t('group.pickMark')) : null,
              source.fresh ? h('span', { className: 'ce-mark fresh' }, t('mark.new')) : null,
            ),
            h(
              'div',
              { className: 'ce-badges' },
              source.installed
                ? h('span', { className: 'ce-badge ok' }, `${t('installed')} · ${source.modelCount} ${t('models')}`)
                : null,
            ),
          ),
          source.daily ? h('div', { className: 'ce-daily' }, `${t('daily')} ${source.daily}`) : h('div', { className: 'ce-daily' }, source.quota),
          h('div', { className: 'ce-row', style: { marginTop: 2 } },
            h('span', { className: accessClass }, accessText),
            source.region === 'cn' ? h('span', { className: 'ce-pill' }, t('region.cn')) : h('span', { className: 'ce-pill' }, t('region.intl')),
          ),
          source.blurb ? h('div', { className: 'ce-blurb' }, source.blurb) : null,
          source.detail ? h('div', { className: 'ce-detail' }, source.detail) : null,
          source.dailyNote ? h('div', { className: 'ce-hint' }, source.dailyNote) : null,
          h(
            'div',
            { className: 'ce-row end' },
            source.installed
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: pendingUninstall === source.id ? 'ce-btn danger' : 'ce-btn ghost',
                    disabled: working,
                    onClick: () => runUninstall(source),
                  },
                  pendingUninstall === source.id ? t('relay.confirmDelete') : t('uninstall'),
                )
              : h(
                  'button',
                  {
                    type: 'button',
                    className: opened[source.id] ? 'ce-btn' : 'ce-btn primary',
                    disabled: working,
                    'aria-expanded': opened[source.id] ? 'true' : 'false',
                    onClick: () => setOpened(current => ({ ...current, [source.id]: !current[source.id] })),
                  },
                  opened[source.id] ? t('close') : t('install'),
                ),
            h('a', { className: 'ce-btn', href: source.signupUrl, target: '_blank', rel: 'noreferrer' }, t('signup')),
          ),
          source.installed || !opened[source.id]
            ? null
            : h(
                'div',
                { className: 'ce-form' },
                h(
                  Field,
                  { label: 'API Key' },
                  h('input', {
                    className: 'ce-input',
                    type: 'password',
                    autoComplete: 'new-password',
                    placeholder: source.keyHint || t('keyPlaceholder'),
                    value: draft.key || '',
                    onChange: event => patchDraft(source.id, { key: event.target.value }),
                  }),
                ),
                advanced[source.id]
                  ? h(
                      Field,
                      { label: t('advanced') },
                      h('textarea', {
                        className: 'ce-area',
                        placeholder: t('modelIdsPlaceholder'),
                        value: draft.models || '',
                        onChange: event => patchDraft(source.id, { models: event.target.value }),
                      }),
                    )
                  : null,
                h(
                  'div',
                  { className: 'ce-row' },
                  h(
                    'button',
                    { type: 'button', className: 'ce-btn primary', disabled: working, onClick: () => runInstall(source) },
                    working ? h(Spinner) : null,
                    working ? t('installing') : t('installNow'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'ce-btn ghost',
                      onClick: () => setAdvanced(current => ({ ...current, [source.id]: !current[source.id] })),
                    },
                    advanced[source.id] ? t('collapse') : t('advancedOptions'),
                  ),
                ),
                h('div', { className: 'ce-hint' }, t('keyHint')),
              ),
          error ? h('div', { className: 'ce-error', role: 'alert' }, error) : null,
        )
      }

      const groups = [
        { id: 'hot', title: t('group.hot'), mark: '🔥', items: sources.filter(source => source.tier === 'hot') },
        { id: 'pick', title: t('group.pick'), mark: t('group.pickMark'), items: sources.filter(source => source.tier === 'pick') },
        {
          id: 'more',
          title: t('group.more'),
          mark: '',
          items: sources.filter(source => source.tier !== 'hot' && source.tier !== 'pick' && source.tier !== 'feed'),
        },
        { id: 'feed', title: t('group.feedList'), mark: '', items: sources.filter(source => source.tier === 'feed') },
      ].filter(group => group.items.length)

      return h(
        'div',
        null,
        h(RadarPanel, { t, radar, onRefresh: refreshEggs, refreshing }),
        groups.map(group =>
          h(
            'section',
            { className: 'ce-section', key: group.id },
            h(
              'div',
              { className: 'ce-section-head' },
              h('h2', { className: 'ce-section-title' }, group.title),
              group.mark === '🔥'
                ? h('span', { className: 'ce-mark fire' }, '🔥')
                : group.mark
                  ? h('span', { className: 'ce-mark pick' }, group.mark)
                  : null,
              h('span', { className: 'ce-hint' }, String(group.items.length)),
            ),
            h('div', { className: 'ce-grid' }, group.items.map(renderCard)),
          ),
        ),
        h(FeedsPanel, { t, feeds, onFeed }),
      )
    }

    /* -------------------------------------------------------------- relays */

    const EMPTY_FORM = {
      id: '',
      name: '',
      baseURL: '',
      token: '',
      userId: '',
      protocol: 'newapi',
      method: 'POST',
      requestPath: '/api/user/checkin',
      headers: '',
      body: '',
      successKeyword: '',
    }

    function RelayTab(props) {
      const { t, relays, protocols, refresh, toast, claims, onGoto } = props
      const [open, setOpen] = useState(relays.length === 0)
      const [form, setForm] = useState(EMPTY_FORM)
      const [showAdvanced, setShowAdvanced] = useState(false)
      const [busy, setBusy] = useState('')
      const [message, setMessage] = useState(null)
      const [pendingDelete, setPendingDelete] = useState('')
      const formRef = useRef(null)

      useEffect(() => {
        if (relays.length === 0) setOpen(true)
      }, [relays.length])

      const setField = (name, value) => setForm(current => ({ ...current, [name]: value }))

      const startEdit = relay => {
        setForm({
          id: relay.id,
          name: relay.name,
          baseURL: relay.baseURL,
          token: '',
          userId: relay.userId || '',
          protocol: relay.protocol || 'newapi',
          method: relay.method || 'POST',
          requestPath: relay.requestPath || '',
          headers: relay.headers || '',
          body: relay.body || '',
          successKeyword: relay.successKeyword || '',
        })
        setShowAdvanced(relay.protocol === 'custom')
        setOpen(true)
        setMessage(null)
        setTimeout(() => formRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30)
      }

      const save = async () => {
        setBusy('save')
        setMessage(null)
        try {
          await api('/relay/save', form)
          toast(form.id ? t('relay.updated') : t('relay.added'))
          setForm(EMPTY_FORM)
          setOpen(false)
          await refresh()
        } catch (error) {
          setMessage({ kind: 'bad', text: String(error?.message || t('unknownError')) })
        } finally {
          setBusy('')
        }
      }

      const test = async () => {
        setBusy('test')
        setMessage(null)
        try {
          const result = await api(
            '/relay/test',
            { id: form.id, baseURL: form.baseURL, token: form.token, userId: form.userId },
            { allowFail: true },
          )
          if (result.ok) {
            const who = result.username ? `（${result.username}）` : ''
            setMessage({ kind: 'ok', text: `${t('relay.ok')}${who}${result.quota ? ` · 额度 ${result.quota}` : ''}` })
          } else {
            setMessage({ kind: 'bad', text: `${t('relay.failed')}：${result.message || ''}` })
          }
        } catch (error) {
          setMessage({ kind: 'bad', text: String(error?.message || t('unknownError')) })
        } finally {
          setBusy('')
        }
      }

      const claim = async relay => {
        setBusy(`claim:${relay.id}`)
        try {
          const result = await api('/claim', { id: relay.id }, { allowFail: true })
          const item = result.result || {}
          toast(
            `${relay.name}：${item.ok ? t('claimOk') : t('claimFail', { msg: item.message || '' })}`,
            item.ok ? 'ok' : 'bad',
          )
          await refresh()
        } catch (error) {
          toast(String(error?.message || t('unknownError')), 'bad')
        } finally {
          setBusy('')
        }
      }

      const toggle = async relay => {
        setBusy(`toggle:${relay.id}`)
        try {
          await api('/relay/save', {
            id: relay.id,
            name: relay.name,
            baseURL: relay.baseURL,
            enabled: !relay.enabled,
            userId: relay.userId,
            protocol: relay.protocol,
          })
          await refresh()
        } catch (error) {
          toast(String(error?.message || t('unknownError')), 'bad')
        } finally {
          setBusy('')
        }
      }

      const remove = async relay => {
        if (pendingDelete !== relay.id) {
          setPendingDelete(relay.id)
          return
        }
        setBusy(`delete:${relay.id}`)
        try {
          await api('/relay/delete', { id: relay.id })
          setPendingDelete('')
          await refresh()
        } catch (error) {
          toast(String(error?.message || t('unknownError')), 'bad')
        } finally {
          setBusy('')
        }
      }

      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ce-row', style: { justifyContent: 'space-between', marginBottom: 12 } },
          h(
            'div',
            { className: 'ce-row' },
            h(
              'span',
              { className: claims && claims.enabled ? 'ce-pill ok' : 'ce-pill idle' },
              claims && claims.enabled
                ? t('autoStatusOn', { time: `${String(claims.hour).padStart(2, '0')}:${String(claims.minute).padStart(2, '0')}` })
                : t('autoStatusOff'),
            ),
            h('button', { type: 'button', className: 'ce-btn ghost', onClick: () => onGoto && onGoto('auto') }, t('gotoSettings')),
          ),
          h(
            'div',
            { className: 'ce-row' },
            h(
              'button',
              {
                type: 'button',
                className: 'ce-btn',
                disabled: relays.length === 0 || busy !== '',
                onClick: async () => {
                  setBusy('all')
                  try {
                    const result = await api('/claim', {})
                    const list = Array.isArray(result.results) ? result.results : []
                    const okCount = list.filter(item => item.ok).length
                    toast(t('claimedCount', { a: okCount, b: list.length }), okCount === list.length ? 'ok' : 'bad')
                    await refresh()
                  } catch (error) {
                    toast(String(error?.message || t('unknownError')), 'bad')
                  } finally {
                    setBusy('')
                  }
                },
              },
              busy === 'all' ? h(Spinner) : null,
              t('history.claimAll'),
            ),
            h(
              'button',
              { type: 'button', className: 'ce-btn primary', 'aria-expanded': open ? 'true' : 'false', onClick: () => setOpen(value => !value) },
              open ? t('relay.cancel') : t('relay.add'),
            ),
          ),
        ),
        relays.length === 0 ? h('div', { className: 'ce-empty', style: { marginBottom: 12 } }, t('relay.empty')) : null,
        open
          ? h(
              'div',
              { className: 'ce-panel', ref: formRef, style: { marginBottom: 12 } },
              h('div', { className: 'ce-panel-title' }, form.id ? t('editRelay') : t('relay.add')),
              h(
                'div',
                { className: 'ce-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' } },
                h(Field, { label: t('relay.name') }, h('input', {
                  className: 'ce-input', value: form.name, placeholder: t('relayNamePlaceholder'),
                  onChange: event => setField('name', event.target.value),
                })),
                h(Field, { label: t('relay.baseURL') }, h('input', {
                  className: 'ce-input', value: form.baseURL, placeholder: 'https://relay.example.com',
                  onChange: event => setField('baseURL', event.target.value),
                })),
                h(Field, { label: t('relay.token') }, h('input', {
                  className: 'ce-input', type: 'password', autoComplete: 'off',
                  value: form.token, placeholder: form.id ? t('relay.tokenKeep') : 'sk-...',
                  onChange: event => setField('token', event.target.value),
                })),
                h(Field, { label: t('relay.userId') }, h('input', {
                  className: 'ce-input', value: form.userId, placeholder: t('optional'),
                  onChange: event => setField('userId', event.target.value),
                })),
              ),
              h(
                'div',
                { className: 'ce-row', style: { marginTop: 10 } },
                h(
                  Field,
                  { label: t('relay.protocol') },
                  h(
                    'select',
                    {
                      className: 'ce-input',
                      value: form.protocol,
                      onChange: event => {
                        setField('protocol', event.target.value)
                        if (event.target.value === 'custom') setShowAdvanced(true)
                      },
                    },
                    protocols.map(protocol => h('option', { key: protocol.id, value: protocol.id }, protocol.name)),
                  ),
                ),
              ),
              h('div', { className: 'ce-hint', style: { marginTop: 6 } },
                (protocols.find(protocol => protocol.id === form.protocol) || {}).blurb || ''),
              showAdvanced
                ? h(
                    'div',
                    { className: 'ce-grid', style: { marginTop: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' } },
                    h(Field, { label: t('relay.method') }, h('input', {
                      className: 'ce-input', value: form.method,
                      onChange: event => setField('method', event.target.value.toUpperCase()),
                    })),
                    h(Field, { label: t('relay.path') }, h('input', {
                      className: 'ce-input', value: form.requestPath, placeholder: '/api/user/checkin',
                      onChange: event => setField('requestPath', event.target.value),
                    })),
                    h(Field, { label: t('relay.keyword') }, h('input', {
                      className: 'ce-input', value: form.successKeyword, placeholder: t('relay.keywordPlaceholder'),
                      onChange: event => setField('successKeyword', event.target.value),
                    })),
                    h(Field, { label: t('relay.body') }, h('textarea', {
                      className: 'ce-area', value: form.body, placeholder: '{"turnstile_token":""}',
                      onChange: event => setField('body', event.target.value),
                    })),
                    h(Field, { label: t('relay.headers') }, h('textarea', {
                      className: 'ce-area', value: form.headers, placeholder: 'X-Example: value',
                      onChange: event => setField('headers', event.target.value),
                    })),
                  )
                : h(
                    'button',
                    { type: 'button', className: 'ce-btn ghost', style: { marginTop: 8 }, onClick: () => setShowAdvanced(true) },
                    '高级选项',
                  ),
              message ? h('div', { className: message.kind === 'ok' ? 'ce-ok' : 'ce-error', role: 'alert', style: { marginTop: 8 } }, message.text) : null,
              h(
                'div',
                { className: 'ce-row', style: { marginTop: 12 } },
                h(
                  'button',
                  { type: 'button', className: 'ce-btn primary', disabled: busy !== '', onClick: save },
                  busy === 'save' ? h(Spinner) : null,
                  t('relay.save'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ce-btn',
                    disabled: busy !== '' || !form.baseURL || (!form.token && !form.id),
                    title: !form.token && form.id ? t('relay.testKeepToken') : undefined,
                    onClick: test,
                  },
                  busy === 'test' ? h(Spinner) : null,
                  busy === 'test' ? t('relay.testing') : t('relay.test'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ce-btn ghost',
                    onClick: () => {
                      setForm(EMPTY_FORM)
                      setOpen(false)
                      setMessage(null)
                    },
                  },
                  t('relay.cancel'),
                ),
              ),
            )
          : null,
        relays.length
          ? h(
              'div',
              { className: 'ce-list' },
              relays.map(relay =>
                h(
                  'div',
                  { className: 'ce-item', key: relay.id },
                  h(
                    'div',
                    { className: 'ce-item-main' },
                    h(
                      'div',
                      { className: 'ce-item-title' },
                      h('span', { className: 'ce-name', style: { fontSize: 13 } }, relay.name),
                      relay.enabled
                        ? h('span', { className: relay.checkedToday ? 'ce-pill ok' : 'ce-pill idle' },
                            relay.checkedToday ? t('relay.claimed') : t('relay.pending'))
                        : h('span', { className: 'ce-pill' }, t('relay.paused')),
                      relay.hasToken ? null : h('span', { className: 'ce-pill bad' }, t('keyMissing')),
                    ),
                    h('div', { className: 'ce-item-url' }, relay.baseURL),
                    relay.last
                      ? h('div', { className: relay.last.ok ? 'ce-ok' : 'ce-error' },
                          `${new Date(relay.last.at).toLocaleString()} · ${relay.last.ok ? t('ok') : t('fail')} · ${relay.last.message}`)
                      : null,
                  ),
                  h(
                    'div',
                    { className: 'ce-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'ce-btn',
                        disabled: busy !== '' || !relay.enabled,
                        title: relay.enabled ? undefined : t('relay.paused'),
                        onClick: () => claim(relay),
                      },
                      busy === `claim:${relay.id}` ? h(Spinner) : null,
                      t('relay.claim'),
                    ),
                    h('button', { type: 'button', className: 'ce-btn ghost', disabled: busy !== '', onClick: () => toggle(relay) },
                      relay.enabled ? t('relay.disable') : t('relay.enable')),
                    h('button', { type: 'button', className: 'ce-btn ghost', disabled: busy !== '', onClick: () => startEdit(relay) }, t('relay.edit')),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'ce-btn danger',
                        disabled: busy !== '',
                        onClick: () => remove(relay),
                      },
                      pendingDelete === relay.id ? t('relay.confirmDelete') : t('relay.delete'),
                    ),
                  ),
                ),
              ),
            )
          : null,
      )
    }

    /* ---------------------------------------------------------------- auto */

    function AutoTab(props) {
      const { t, claims, history, refresh, toast, onReset } = props
      const [enabled, setEnabled] = useState(claims.enabled)
      const [time, setTime] = useState(`${String(claims.hour).padStart(2, '0')}:${String(claims.minute).padStart(2, '0')}`)
      const [catchUp, setCatchUp] = useState(claims.catchUp !== false)
      const [saving, setSaving] = useState(false)
      const [error, setError] = useState('')

      useEffect(() => {
        setEnabled(claims.enabled)
        setTime(`${String(claims.hour).padStart(2, '0')}:${String(claims.minute).padStart(2, '0')}`)
        setCatchUp(claims.catchUp !== false)
      }, [claims.enabled, claims.hour, claims.minute, claims.catchUp])

      const save = async () => {
        const [hour, minute] = time.split(':').map(Number)
        setSaving(true)
        setError('')
        try {
          await api('/claims', { enabled, hour, minute, catchUp })
          toast(t('auto.saved'), 'ok')
          await refresh()
        } catch (caught) {
          setError(String(caught?.message || t('unknownError')))
        } finally {
          setSaving(false)
        }
      }

      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ce-panel' },
          h(
            'div',
            { className: 'ce-row', style: { justifyContent: 'space-between' } },
            h('div', { className: 'ce-panel-title', style: { margin: 0 } }, t('auto.enable')),
            h(Switch, { checked: enabled, label: t('auto.enable'), onChange: setEnabled }),
          ),
          h(
            'div',
            { className: 'ce-inline', style: { marginTop: 14 } },
            h('span', { className: 'ce-label' }, t('auto.time')),
            h('input', {
              type: 'time',
              className: 'ce-input',
              style: { width: 130 },
              value: time,
              onChange: event => setTime(event.target.value || '09:00'),
            }),
          ),
          h(
            'div',
            { className: 'ce-inline', style: { marginTop: 14 } },
            h(Switch, { checked: catchUp, label: t('auto.catchUp'), onChange: setCatchUp }),
            h('span', { className: 'ce-label' }, t('auto.catchUp')),
          ),
          h(
            'div',
            { className: 'ce-row', style: { marginTop: 16 } },
            h('button', { type: 'button', className: 'ce-btn primary', disabled: saving, onClick: save }, saving ? h(Spinner) : null, t('auto.save')),
          ),
          error ? h('div', { className: 'ce-error', role: 'alert', style: { marginTop: 8 } }, error) : null,
          h('div', { className: 'ce-hint', style: { marginTop: 12 } }, t('auto.note')),
        ),
        h(
          'div',
          { className: 'ce-panel' },
          h(
            'div',
            { className: 'ce-row', style: { justifyContent: 'space-between', marginBottom: 10 } },
            h('div', { className: 'ce-panel-title', style: { margin: 0 } }, t('history.title')),
            history.length
              ? h(
                  'button',
                  { type: 'button', className: 'ce-btn ghost', onClick: () => onReset && onReset('history') },
                  t('history.clear'),
                )
              : null,
          ),
          history.length
            ? h(
                'div',
                { className: 'ce-history' },
                history.map((row, index) =>
                  h(
                    'div',
                    { className: 'ce-history-row', key: `${row.at}-${index}` },
                    h('span', null, new Date(row.at).toLocaleString()),
                    h('b', null, row.name),
                    h('span', { style: { color: row.ok ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-error-primary)' } },
                      row.ok ? t('ok') : t('fail')),
                    h('span', null, row.message || ''),
                  ),
                ),
              )
            : h('div', { className: 'ce-empty' }, t('history.empty')),
        ),
      )
    }

    /* --------------------------------------------------------------- panel */

    function Panel(props) {
      const { ctx } = props
      const t = useT(ctx)
      const [tab, setTab] = useState('market')
      const [data, setData] = useState(null)
      const [loading, setLoading] = useState(true)
      const [refreshing, setRefreshing] = useState(false)
      const [kiloBusy, setKiloBusy] = useState(false)
      const [kiloTesting, setKiloTesting] = useState(false)
      const [healthBusy, setHealthBusy] = useState(false)
      const [updateInfo, setUpdateInfo] = useState(null)
      const [updateBusy, setUpdateBusy] = useState('')
      const [error, setError] = useState('')
      const [toastState, setToastState] = useState(null)
      const toastTimer = useRef(null)

      const toast = useCallback((text, kind) => {
        setToastState({ text, kind: kind || 'ok' })
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToastState(null), 5200)
      }, [])

      const refresh = useCallback(async () => {
        setLoading(true)
        try {
          const next = await api('/state')
          setData(next)
          setError('')
        } catch (caught) {
          setError(String(caught?.message || t('unknownError')))
        } finally {
          setLoading(false)
        }
      }, [t])

      useEffect(() => {
        refresh()
        return () => {
          if (toastTimer.current) clearTimeout(toastTimer.current)
        }
      }, [])

      const checkUpdate = useCallback(
        async manual => {
          setUpdateBusy('check')
          try {
            const result = await api('/update/check', {}, { allowFail: true })
            setUpdateInfo(result)
            if (manual) {
              if (!result.ok) toast(result.signedRequired ? t('update.badSignature') : `${t('update.failed')}：${result.error || ''}`, 'bad')
              else if (result.newer) toast(t('update.available', { v: result.latest }), 'ok')
              else toast(t('update.latest', { v: result.current || result.latest }), 'ok')
            }
          } catch (caught) {
            if (manual) toast(`${t('update.failed')}：${String(caught?.message || t('unknownError'))}`, 'bad')
          } finally {
            setUpdateBusy('')
          }
        },
        [t],
      )

      useEffect(() => {
        checkUpdate(false)
      }, [])

      // The host can only rewrite the provider route outside its apply transaction,
      // so nudge it as soon as the panel is up.
      useEffect(() => {
        let cancelled = false
        api('/kilo/heal', {}, { allowFail: true })
          .then(result => {
            if (!cancelled && result && result.state) setData(result.state)
          })
          .catch(() => {})
        return () => {
          cancelled = true
        }
      }, [])

      const applyUpdate = useCallback(async () => {
        setUpdateBusy('install')
        try {
          const result = await api('/update/install', {}, { allowFail: true })
          if (!result.ok) {
            toast(`${t('update.failed')}：${result.diagnostic || result.error || ''}`, 'bad')
          } else if (result.upToDate) {
            toast(t('update.latest', { v: result.latest || result.from }), 'ok')
          } else if (result.application === 'restart-required') {
            toast(t('update.restart', { v: result.to }), 'ok')
          } else {
            toast(t('update.done', { v: result.to }), 'ok')
          }
          if (result.ok && !result.upToDate) {
            try {
              const health = await api('/anon/health', { prune: true }, { allowFail: true })
              if (health.state) setData(health.state)
              if (health.checked) toast(t('update.health', { kept: health.kept.length, removed: health.removed }), 'ok')
            } catch {
              /* keep the update result even if the health pass fails */
            }
          }
          setUpdateInfo(null)
        } catch (caught) {
          const message = String(caught?.message || t('unknownError'))
          toast(/签名/.test(message) ? t('update.badSignature') : `${t('update.failed')}：${message}`, 'bad')
        } finally {
          setUpdateBusy('')
        }
      }, [t])

      const kiloEnsured = useRef(false)
      useEffect(() => {
        if (!data || kiloEnsured.current) return
        kiloEnsured.current = true
        if (((data.kilo && data.kilo.items) || []).length === 0) {
          api('/kilo/models', { force: false })
            .then(result => {
              if (result.state) setData(result.state)
            })
            .catch(() => {})
        }
        if (((data.pollinations && data.pollinations.items) || []).length === 0) {
          api('/pollinations/models', { force: true })
            .then(result => {
              if (result.state) setData(result.state)
            })
            .catch(() => {})
        }
      }, [data])

      const refreshEggs = useCallback(async () => {
        setRefreshing(true)
        try {
          const result = await api('/refresh', {})
          if (result.state) setData(result.state)
          const radar = result.state?.radar
          if (radar?.error) toast(`${t('radar.failed')}：${radar.error}`, 'bad')
          else if (radar?.warning) toast(t('radar.fallback', { msg: radar.warning }), 'ok')
          else toast(t('radarUpdated', { n: radar?.freeCount ?? 0 }), 'ok')
        } catch (caught) {
          toast(String(caught?.message || t('unknownError')), 'bad')
        } finally {
          setRefreshing(false)
        }
      }, [t])

      const kiloInstall = useCallback(
        async payload => {
          setKiloBusy(true)
          try {
            const result = await api('/kilo/install', payload)
            if (result.state) setData(result.state)
            const count = Array.isArray(result.installed) ? result.installed.length : 0
            toast(t('anon.enabled', { n: count }), 'ok')
          } catch (caught) {
            toast(`${t('anon.fail')}：${String(caught?.message || t('unknownError'))}`, 'bad')
          } finally {
            setKiloBusy(false)
          }
        },
        [t],
      )

      const kiloTest = useCallback(async () => {
        setKiloTesting(true)
        try {
          const result = await api('/kilo/test', {}, { allowFail: true })
          if (result.ok) toast(t('anon.testOk', { text: result.text || 'ok' }), 'ok')
          else toast(`${t('anon.fail')}：${result.error || ''}`, 'bad')
        } catch (caught) {
          toast(String(caught?.message || t('unknownError')), 'bad')
        } finally {
          setKiloTesting(false)
        }
      }, [t])

      const kiloDisable = useCallback(async () => {
        setKiloBusy(true)
        try {
          const result = await api('/kilo/uninstall', {})
          if (result.state) setData(result.state)
          toast(t('anon.disabled'), 'ok')
        } catch (caught) {
          toast(String(caught?.message || t('unknownError')), 'bad')
        } finally {
          setKiloBusy(false)
        }
      }, [t])

      const pollinationsInstall = useCallback(
        async payload => {
          setKiloBusy(true)
          try {
            const result = await api('/pollinations/install', payload)
            if (result.state) setData(result.state)
            const count = Array.isArray(result.installed) ? result.installed.length : 0
            toast(t('anon.enabled', { n: count }), 'ok')
          } catch (caught) {
            toast(`${t('anon.fail')}：${String(caught?.message || t('unknownError'))}`, 'bad')
          } finally {
            setKiloBusy(false)
          }
        },
        [t],
      )

      const pollinationsDisable = useCallback(async () => {
        setKiloBusy(true)
        try {
          const result = await api('/pollinations/uninstall', {})
          if (result.state) setData(result.state)
          toast(t('anon.disabled'), 'ok')
        } catch (caught) {
          toast(String(caught?.message || t('unknownError')), 'bad')
        } finally {
          setKiloBusy(false)
        }
      }, [t])

      const anonHealth = useCallback(async () => {
        setHealthBusy(true)
        try {
          const result = await api('/anon/health', { prune: true }, { allowFail: true })
          if (result.state) setData(result.state)
          const kept = (result.kept || []).length
          const limited = (result.rateLimited || []).length
          if (!result.checked) toast(t('anon.healthEmpty'), 'ok')
          else if (result.removed) toast(t('anon.healthDone', { kept, removed: result.removed }), 'ok')
          else if (limited) toast(t('anon.healthRate', { kept, limited }), 'ok')
          else toast(t('anon.healthClean', { kept }), 'ok')
          return result
        } catch (caught) {
          toast(`${t('anon.fail')}：${String(caught?.message || t('unknownError'))}`, 'bad')
          return null
        } finally {
          setHealthBusy(false)
        }
      }, [t])

      const anonUnblock = useCallback(async () => {
        try {
          const result = await api('/anon/unblock', {})
          if (result.state) setData(result.state)
          for (const path of ['/kilo/models', '/pollinations/models']) {
            try {
              const list = await api(path, { force: true })
              if (list.state) setData(list.state)
            } catch {
              /* the pool list will refresh on its own */
            }
          }
          toast(t('anon.unblock', { n: result.unblocked || 0 }), 'ok')
        } catch (caught) {
          toast(String(caught?.message || t('unknownError')), 'bad')
        }
      }, [t])

      const resetScope = useCallback(
        async scope => {
          try {
            const result = await api('/reset', { scope })
            if (result.state) setData(result.state)
            toast(t('history.cleared'), 'ok')
          } catch (caught) {
            toast(String(caught?.message || t('unknownError')), 'bad')
          }
        },
        [t],
      )

      const onFeed = useCallback(
        async (action, url) => {
          try {
            const result = await api('/feeds', { action, url })
            if (result.state) setData(result.state)
            toast(action === 'add' ? t('feedAdded') : t('feedRemoved'), 'ok')
            return true
          } catch (caught) {
            toast(String(caught?.message || t('unknownError')), 'bad')
            return false
          }
        },
        [t],
      )

      const claims = data?.claims || { enabled: false, hour: 9, minute: 0, catchUp: true }
      const relays = data?.relays || []
      const sources = data?.sources || []
      const claimedToday = relays.filter(relay => relay.checkedToday).length
      const installedCount = sources.filter(source => source.installed).length

      return h(
        'div',
        { className: 'ce-root' },
        h('style', null, CSS + '@keyframes ce-spin { to { transform: rotate(360deg) } }'),
        h(
          'div',
          { className: 'ce-scroll' },
          h(
            'div',
            { className: 'ce-wrap' },
            h(
              'div',
              { className: 'ce-head' },
              h(
                'div',
                { className: 'ce-head-main' },
                h('div', { className: 'ce-title' }, h(EggIcon, { size: 22, active: true }), t('title')),
                h('div', { className: 'ce-sub' }, t('subtitle')),
                h('div', { className: 'ce-stats' },
                  t('summary', { a: installedCount, b: claimedToday, c: relays.length }),
                  h('span', { style: { marginLeft: 8, opacity: 0.8 } }, t('version', { v: (data && data.build) || '…' }))),
              ),
              h(
                'div',
                { className: 'ce-row', style: { gap: 6 } },
                h(
                  'button',
                  {
                    type: 'button',
                    className: updateInfo && updateInfo.ok && updateInfo.newer ? 'ce-btn primary' : 'ce-btn',
                    disabled: updateBusy !== '' || loading,
                    title: updateInfo && !updateInfo.ok ? updateInfo.error || '' : undefined,
                    onClick: () => {
                      if (updateInfo && updateInfo.ok && updateInfo.newer) applyUpdate()
                      else checkUpdate(true)
                    },
                  },
                  updateBusy !== '' ? h(Spinner) : null,
                  updateBusy === 'check'
                    ? t('update.checking')
                    : updateBusy === 'install'
                      ? t('update.installing')
                      : updateInfo && updateInfo.ok && updateInfo.newer
                        ? t('update.available', { v: updateInfo.latest })
                        : updateInfo && updateInfo.ok
                          ? t('update.latest', { v: updateInfo.current || updateInfo.latest })
                          : t('update.check'),
                ),
                h(
                  'button',
                  { type: 'button', className: 'ce-btn primary', onClick: refreshEggs, disabled: loading || refreshing },
                  refreshing ? h(Spinner) : null,
                  refreshing ? t('refreshing') : t('refreshEggs'),
                ),
              ),
            ),
            h(
              'div',
              { className: 'ce-tabs', role: 'tablist' },
              [
                ['market', t('tab.market')],
                ['anon', t('tab.anon')],
                ['relay', t('tab.relay')],
                ['auto', t('tab.auto')],
              ].map(([id, label]) =>
                h(
                  'button',
                  {
                    key: id,
                    type: 'button',
                    role: 'tab',
                    className: 'ce-tab',
                    'aria-selected': tab === id ? 'true' : 'false',
                    onClick: () => setTab(id),
                  },
                  label,
                ),
              ),
            ),
            error
              ? h(
                  'div',
                  { className: 'ce-panel', style: { marginBottom: 12 } },
                  h('div', { className: 'ce-error', role: 'alert' }, `${t('loadFailed')}：${error}`),
                  !data ? h('button', { type: 'button', className: 'ce-btn', style: { marginTop: 10 }, onClick: refresh }, t('retry')) : null,
                )
              : null,
            loading && !data ? h('div', { className: 'ce-empty' }, t('loading')) : null,
            data
              ? h(
                  'div',
                  null,
                  h('div', { style: { display: tab === 'market' ? 'block' : 'none' } },
                    h(MarketTab, {
                      t,
                      sources,
                      accessLabels: data?.accessLabels || {},
                      radar: data?.radar || null,
                      feeds: data?.feeds || [],
                      refresh,
                      refreshEggs,
                      refreshing,
                      toast,
                      onFeed,
                    })),
                  h('div', { style: { display: tab === 'anon' ? 'block' : 'none' } },
                    h(AnonTab, {
                      t,
                      kilo: data?.kilo || null,
                      pollinations: data?.pollinations || null,
                      anon: data?.anon || null,
                      proxyPort: data?.proxy?.port || null,
                      busy: kiloBusy,
                      testing: kiloTesting,
                      healthBusy,
                      onUnblock: anonUnblock,
                      kiloActions: {
                        onInstall: kiloInstall,
                        onTest: kiloTest,
                        onDisable: kiloDisable,
                        onPrune: () => kiloInstall({ all: true, prune: true }),
                        onHealth: anonHealth,
                      },
                      pollinationsActions: {
                        onInstall: pollinationsInstall,
                        onDisable: pollinationsDisable,
                        onPrune: () => pollinationsInstall({ all: true, prune: true }),
                        onHealth: anonHealth,
                      },
                    })),
                  h('div', { style: { display: tab === 'relay' ? 'block' : 'none' } },
                    h(RelayTab, { t, relays, protocols: data?.protocols || [], refresh, toast, claims, onGoto: setTab })),
                  h('div', { style: { display: tab === 'auto' ? 'block' : 'none' } },
                    h(AutoTab, { t, claims, history: data?.history || [], refresh, toast, onReset: resetScope })),
                )
              : null,
          ),
        ),
        toastState ? h('div', { className: toastState.kind === 'bad' ? 'ce-toast bad' : 'ce-toast', role: 'status' }, toastState.text) : null,
      )
    }

    /* --------------------------------------------------------------- apply */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        try {
          ctx.locale.register('cyber-egg', { zh: DICT.zh, en: DICT.en })
        } catch (error) {
          console.warn('[cyber-egg] locale registration failed', error)
        }

        const label = () => (activeLocale(ctx) === 'en' ? DICT.en['entry.label'] : DICT.zh['entry.label'])

        const IconEntry = props => h(EggIcon, { size: props?.size, active: props?.active })
        const PanelEntry = () => h(Panel, { ctx })

        const disposers = []
        disposers.push(
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register({ name: 'sidebar.panellist', id: 'cyber-egg', order: 30, label }, IconEntry),
          ),
        )
        disposers.push(
          ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'cyber-egg' }, PanelEntry)),
        )

        ctx.effect(() => () => {
          for (const dispose of disposers) {
            try {
              dispose?.()
            } catch {
              /* ignore */
            }
          }
        })
      },
    }
  },
})
