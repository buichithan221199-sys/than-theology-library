// Private AI cost dashboard: only rendered after admin PIN is verified.
S.aiUsage=null;
const AI_COST_ADMIN=SB+'/functions/v1/theology-ai-cost';

async function costAdmin(action,payload={}){
  const r=await fetch(AI_COST_ADMIN,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':S.pin},body:JSON.stringify({action,...payload})});
  let j={};try{j=await r.json()}catch{}
  if(!r.ok)throw Error(j.error||'Không tải được dữ liệu chi phí AI');
  return j;
}
function money(v,d=4){const n=Number(v||0);return '$'+n.toFixed(d)}
function aiDate(v){try{return new Date(v).toLocaleString('vi-VN',{month:'2-digit',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return ''}}

window.lockAdmin=function(){
  S.pin='';S.revealed={};S.aiUsage=null;
  if(S.tab==='ai-cost')S.tab='home';
  render();
};

const _navBeforeAiCost=nav;
nav=function(){
  let h=_navBeforeAiCost();
  if(S.pin){
    h=h.replace(/<button class="admin" onclick="unlock\(\)">[\s\S]*?<\/button>/,
      `<button class="admin ${S.tab==='ai-cost'?'on':''}" onclick="openAiCost()">💳 <span>Chi phí AI</span></button>`);
  }
  return h;
};

const _viewBeforeAiCost=view;
view=function(){if(S.tab==='ai-cost')return aiCostView();return _viewBeforeAiCost()};
const _renderBeforeAiCost=render;
render=function(){
  if(S.tab!=='ai-cost')return _renderBeforeAiCost();
  document.querySelector('#root').innerHTML=`<div class="app">${nav()}<main class="main"><header class="top"><h1>Chi phí AI · Quản trị</h1><button class="btn gold" onclick="openAiCost()">↻ Làm mới</button></header><section class="content">${aiCostView()}</section></main></div>`;
};

unlock=function(afterUnlock){
  const d=overlay(`<div class="modal"><button class="x">×</button><h2>Mở quản trị</h2><p class="muted">Nhập mã quản trị để sử dụng các chức năng chỉnh sửa và AI.</p><div class="field"><label>Mã quản trị</label><input id="pin" type="password" inputmode="numeric" autocomplete="off"></div><div id="err"></div><div class="modalActions"><button class="btn gold" id="ok">Mở quản trị</button></div></div>`);
  const submit=async()=>{try{const p=d.querySelector('#pin').value;await adm('verify_pin',{},p);S.pin=p;d.remove();render();if(typeof afterUnlock==='function')afterUnlock()}catch(e){d.querySelector('#err').innerHTML='<div class="error">'+esc(e.message)+'</div>'}};
  d.querySelector('#ok').onclick=submit;
  d.querySelector('#pin').addEventListener('keydown',e=>{if(e.key==='Enter')submit()});
  setTimeout(()=>d.querySelector('#pin')?.focus(),0);
};

async function openAiCost(){
  if(!S.pin){unlock(()=>openAiCost());return}
  S.tab='ai-cost';S.selected=null;S.aiUsage=null;render();
  try{S.aiUsage=await costAdmin('summary');render()}catch(e){S.aiUsage={error:e.message};render()}
}
window.openAiCost=openAiCost;
async function setAiFunded(){
  const current=Number(S.aiUsage?.summary?.funded_usd||0);
  const raw=prompt('Nhập TỔNG số tiền API bạn đã nạp để app tính số dư còn lại (USD):',current?String(current):'5.00');
  if(raw===null)return;
  const v=Number(raw);if(!Number.isFinite(v)||v<0){alert('Số tiền không hợp lệ.');return}
  try{await costAdmin('set_budget',{funded_usd:v});await openAiCost()}catch(e){alert(e.message)}
}
window.setAiFunded=setAiFunded;\nfunction aiCostView(){
  if(!S.pin)return '<div class="panel empty">Mục này chỉ dành cho quản trị.</div>';
  if(!S.aiUsage)return '<div class="panel empty">Đang tải dữ liệu chi phí AI…</div>';
  if(S.aiUsage.error)return `<div class="panel"><div class="error">${esc(S.aiUsage.error)}</div></div>`;
  const s=S.aiUsage.summary||{},rows=Array.isArray(S.aiUsage.rows)?S.aiUsage.rows:[];
  const remaining=Number(s.remaining_usd||0),funded=Number(s.funded_usd||0);
  return `<div class="panel" style="margin-bottom:16px"><div style="display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap"><div><h2 class="title" style="margin:0 0 4px">Theo dõi chi phí AI</h2><p class="muted" style="margin:0">Riêng tư · chỉ hiện sau khi mở quản trị.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn white" onclick="setAiFunded()">Cập nhật số tiền đã nạp</button><button class="btn white" onclick="lockAdmin()">🔒 Khóa quản trị</button></div></div></div>
  <div class="stats"><div class="stat"><b>${funded?money(funded,2):'—'}</b><span>Tổng tiền đã nạp để theo dõi</span></div><div class="stat"><b>${money(s.spent_usd,4)}</b><span>Chi phí AI được app ghi nhận</span></div><div class="stat"><b style="${remaining<0?'color:#a33':''}">${funded?money(remaining,4):'—'}</b><span>Số dư theo dõi</span></div><div class="stat"><b>${Number(s.generation_count||0)}</b><span>Tổng số lần AI được ghi nhận</span></div></div>
  <div class="stats" style="grid-template-columns:repeat(2,1fr)"><div class="stat"><b>${Number(s.month_count||0)}</b><span>Số lần tạo tháng này</span></div><div class="stat"><b>${money(s.month_spent_usd,4)}</b><span>Chi phí tháng này được ghi nhận</span></div></div>
  ${!funded?'<div class="panel" style="margin:16px 0;background:#fff8e3"><b>Chưa nhập số tiền đã nạp.</b><p class="muted">Bấm “Cập nhật số tiền đã nạp” và nhập tổng số USD bạn đã nạp vào OpenAI API.</p></div>':''}
  <div class="panel" style="overflow:auto"><h3 class="title" style="margin-top:0">200 lần AI gần nhất</h3>${rows.length?`<table style="width:100%;border-collapse:collapse;min-width:760px"><thead><tr style="text-align:left;border-bottom:1px solid #e5ddd1"><th style="padding:10px">Thời gian</th><th style="padding:10px">Bài học</th><th style="padding:10px">Model</th><th style="padding:10px">Input</th><th style="padding:10px">Output</th><th style="padding:10px">Tổng token</th><th style="padding:10px;text-align:right">Chi phí</th></tr></thead><tbody>${rows.map(r=>`<tr style="border-bottom:1px solid #eee8de"><td style="padding:10px;white-space:nowrap">${esc(aiDate(r.created_at))}</td><td style="padding:10px">${esc(r.request_title||r.operation||'Tạo nội dung')}</td><td style="padding:10px;white-space:nowrap">${esc(r.model||'')}</td><td style="padding:10px">${Number(r.input_tokens||0).toLocaleString()}</td><td style="padding:10px">${Number(r.output_tokens||0).toLocaleString()}</td><td style="padding:10px">${Number(r.total_tokens||0).toLocaleString()}</td><td style="padding:10px;text-align:right;font-weight:800">${money(r.estimated_cost_usd,6)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Chưa có lần tạo AI nào được ghi nhận.</div>'}</div>
  <p class="muted" style="margin-top:12px">Số dư ở đây là số dư theo dõi của riêng app: số tiền bạn nhập − chi phí mà app ghi nhận. Các chi phí API phát sinh ngoài app hoặc loại tác vụ chưa có dữ liệu usage có thể không xuất hiện ở đây.</p>`;
}

// Robust delegated navigation for dynamically re-rendered UI.
document.addEventListener('click',function(e){
  const b=e.target?.closest?.('#aiCostNavBtn');
  if(!b)return;
  e.preventDefault();
  window.openAiCost?.();
});

if(new URLSearchParams(location.search).get('smoke_ai_cost')==='1'){
  let tries=0;
  const timer=setInterval(()=>{
    const b=document.querySelector('#aiCostNavBtn');
    if(b){
      clearInterval(timer);
      b.click();
      setTimeout(()=>{
        const ok=[...document.querySelectorAll('.modal h2')].some(x=>x.textContent.includes('Mở quản trị'));
        document.documentElement.dataset.aiCostClickTest=ok?'pass':'fail';
      },100);
    }else if(++tries>40){
      clearInterval(timer);
      document.documentElement.dataset.aiCostClickTest='missing-button';
    }
  },100);
}
