'use strict';
const games = {miracle:['国服','台服'],shining:['国服','台服'],infinity:['国服','国际服']};
const tabs = [...document.querySelectorAll('[data-game]')];
const panel = document.getElementById('game-panel');
const servers = document.getElementById('servers');
let currentGame = 'miracle';
let requestId = 0;
let toastTimer;
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function isCurrent(value, now = new Date()) {
  const expiry = text(value);
  if (!expiry) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return expiry >= today && !Number.isNaN(Date.parse(expiry));
  }
  const date = Date.parse(expiry);
  return Number.isFinite(date) && date >= now.getTime();
}
function normalizeServer(value, game) {
  const server = text(value);
  if (['国服','國服','大陆服','陸服'].includes(server)) return '国服';
  if (game === 'infinity' && ['国际服','國際服','全球服'].includes(server)) return '国际服';
  if (game !== 'infinity' && ['台服','臺服','港澳台服','台港澳服','繁中服'].includes(server)) return '台服';
  return server;
}
function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function notify(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message; toast.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}
async function copyCode(code, button) {
  try {
    await navigator.clipboard.writeText(code);
    button.textContent = '已复制 ✓'; notify('兑换码已复制，去游戏里领取吧');
    setTimeout(() => {button.textContent = '复制';}, 2000);
  } catch { notify('未能访问剪贴板，请选中兑换码后手动复制'); }
}
function render(game, data = [], state = '') {
  servers.replaceChildren();
  for (const serverName of games[game]) {
    const codes = data.filter(item => item && text(item.code) && normalizeServer(item.server,game) === serverName && isCurrent(item.expireDate));
    const section = element('section','server');
    const header = element('div','server-header');
    header.append(element('span','server-dot'),element('h3','',serverName),element('span','count',state ? '—' : `${codes.length} 个兑换码`));
    section.append(header);
    if (!codes.length || state) {
      const empty = element('div',`empty ${state === 'error' ? 'error' : ''}`);
      empty.append(element('span','empty-symbol',state === 'error' ? '!' : '✧'),element('p','',state === 'loading' ? '正在整理礼物…' : state === 'error' ? '兑换码暂时加载失败' : '暂时没有可用兑换码'),element('small','',state === 'error' ? '请检查网络后重试' : state === 'loading' ? '请稍等片刻' : '新的惊喜，值得再等等'));
      if (state === 'error') {const retry = element('button','copy retry','重新加载');retry.addEventListener('click',()=>loadGame(game));empty.append(retry);}
      section.append(empty);
    } else {
      const list = element('div','code-list');
      for (const item of codes) {
        const code = text(item.code);
        const card = element('article','code-card');
        const top = element('div','code-top');
        const copy = element('button','copy','复制');
        copy.setAttribute('aria-label',`复制兑换码 ${code}`);
        copy.addEventListener('click',()=>copyCode(code,copy));
        top.append(element('strong','code-value',code),copy);
        card.append(top,element('p','reward',text(item.reward) || '奖励以游戏内显示为准'),element('div','expiry',text(item.expireDate) ? `有效期至 ${text(item.expireDate)}` : '未标注到期日'));
        list.append(card);
      }
      section.append(list);
    }
    servers.append(section);
  }
}
async function loadGame(game) {
  if (!games[game]) return;
  currentGame = game;
  const id = ++requestId;
  tabs.forEach(tab => {const active=tab.dataset.game===game;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  panel.setAttribute('aria-labelledby',`tab-${game}`);panel.setAttribute('aria-busy','true');
  render(game,[],'loading');
  try {
    const response = await fetch(`${game}.json`,{cache:'no-cache'});
    if (!response.ok) throw new Error('Load failed');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid data');
    if (id === requestId) render(game,data);
  } catch {if (id === requestId) render(game,[],'error');}
  finally {if (id === requestId) panel.setAttribute('aria-busy','false');}
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>loadGame(tab.dataset.game));
  tab.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowRight') next=(index+1)%tabs.length;
    if(event.key==='ArrowLeft') next=(index+tabs.length-1)%tabs.length;
    if(event.key==='Home') next=0;
    if(event.key==='End') next=tabs.length-1;
    if(next!==undefined){event.preventDefault();tabs[next].focus();loadGame(tabs[next].dataset.game);}
  });
});
loadGame(currentGame);
