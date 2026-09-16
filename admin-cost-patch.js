// Private AI cost dashboard: only rendered after admin PIN is verified.
S.aiUsage=null;

async function privateRpc(name,payload={}){
  const r=await fetch(REST+'/rpc/'+name,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  let j={};try{j=await r.json()}catch{}
  if(!r.ok)throw Error(j.message||j.error||'Không tải được dữ liệu chi phí AI');
  return j;
}

function money(v,d=4){const n=Number(v||0);return '$'+n.toFixed(d)}
function aiDate(v){try{return new Date(v).toLocaleString('vi-VN',{month:'2-digit',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return ''}}

const _navBeforeAiCost=nav;
nav=function(){
  let h=_navBeforeAiCost();
  if(S.pin){
    h=h.replace('</div><button class="admin" onclick="unlock()">🔐 <span>Quản trị</span></button></aside>',`<button class="${S.tab==='ai-cost'?'on':''}" onclick="openAiCost()">💳 <span>Chi phí AI</span></button></div><button class="admin" onclick="openAiCost()">🔓 <span>Đã mở quản trị</span></button></aside>`);
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

unlock=function(){
  const d=overlay(`<div class="modal"><button class="x">×</button><h2>Mở quản trị</h2><p class="muted">Mục chi phí AI chỉ quản trị viên mới xem được.</p><div class="field"><label>Mã quản trị</label><input id="pin" type="password" inputmode="numeric"></div><div id="err"></div><div class="modalActions"><button class="btn gold" id="ok">Mở quản trị</button></div></div>`);
  d.querySelector('#ok').onclick=async()=>{try{const p=d.querySelector('#pin').value;await adm('verify_pin',{},p);S.pin=p;d.remove();await openAiCost()}catch(e){d.querySelector('#err').innerHTML='<div class="error">'+esc(e.message)+'</div>'}};
};

async function openAiCost(){
  if(!S.pin){unlock();return}
  S.tab='ai-cost';S.selected=null;S.aiUsage=null;render();
  try{S.aiUsage=await privateRpc('get_ai_usage_private',{admin_pin:S.pin});render()}catch(e){S.aiUsage={error:e.message};render()}
}

async function setAiFunded(){
  const current=Number(S.aiUsage?.summary?.funded_usd||0);
  const raw=prompt('Nhập TỔNG số tiền API bạn đã nạp để app tính số dư còn lại (USD):',current?String(current):'5.00');
  if(raw===null)return;
  const v=Number(raw);if(!Number.isFinite(v)||v<0){alert('Số tiền không hợp lệ.');return}
  try{await privateRpc('set_ai_budget_private',{admin_pin:S.pin,new_funded_usd:v});await openAiCost()}catch(e){alert(e.message)}
}

function aiCostView(){
  if(!S.pin)return '<div class="panel empty">Mục này chỉ dành cho quản trị.</div>';
  if(!S.aiUsage)return '<div class="panel empty">Đang tải dữ liệu chi phí AI…</div>';
  if(S.aiUsage.error)return `<div class="panel"><div class="error">${esc(S.aiUsage.error)}</div></div>`;
  const s=S.aiUsage.summary||{},rows=Array.isArray(S.aiUsage.rows)?S.aiUsage.rows:[];
  const remaining=Number(s.remaining_usd||0),funded=Number(s.funded_usd||0);
  return `<div class="panel" style="margin-bottom:16px"><div style="display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap"><div><h2 class="title" style="margin:0 0 4px">Theo dõi chi phí AI</h2><p class="muted" style="margin:0">Riêng tư · chỉ hiện sau khi mở quản trị. Chi phí được tính từ token thực tế mà OpenAI trả về.</p></div><button class="btn white" onclick="setAiFunded()">Cập nhật số tiền đã nạp</button></div></div>
  <div class="stats">
    <div class="stat"><b>${funded?money(funded,2):'—'}</b><span>Tổng tiền đã nạp để theo dõi</span></div>
    <div class="stat"><b>${money(s.spent_usd,4)}</b><span>Đã dùng trong app</span></div>
    <div class="stat"><b style="${remaining<0?'color:#a33':''}">${funded?money(remaining,4):'—'}</b><span>Số dư theo dõi</span></div>
    <div class="stat"><b>${Number(s.generation_count||0)}</b><span>Tổng số lần AI tạo</span></div>
  </div>
  <div class="stats" style="grid-template-columns:repeat(2,1fr)"><div class="stat"><b>${Number(s.month_count||0)}</b><span>Số lần tạo tháng này</span></div><div class="stat"><b>${money(s.month_spent_usd,4)}</b><span>Chi phí tháng này</span></div></div>
  ${!funded?'<div class="panel" style="margin:16px 0;background:#fff8e3"><b>Chưa nhập số tiền đã nạp.</b><p class="muted">Bấm “Cập nhật số tiền đã nạp” và nhập tổng số USD bạn đã nạp vào OpenAI API. App sẽ trừ dần chi phí để hiển thị số dư theo dõi.</p></div>':''}
  <div class="panel" style="overflow:auto"><h3 class="title" style="margin-top:0">Lịch sử từng lần tạo</h3>${rows.length?`<table style="width:100%;border-collapse:collapse;min-width:760px"><thead><tr style="text-align:left;border-bottom:1px solid #e5ddd1"><th style="padding:10px">Thời gian</th><th style="padding:10px">Bài học</th><th style="padding:10px">Model</th><th style="padding:10px">Input</th><th style="padding:10px">Output</th><th style="padding:10px">Tổng token</th><th style="padding:10px;text-align:right">Chi phí</th></tr></thead><tbody>${rows.map(r=>`<tr style="border-bottom:1px solid #eee8de"><td style="padding:10px;white-space:nowrap">${esc(aiDate(r.created_at))}</td><td style="padding:10px">${esc(r.request_title||'Tạo bài học')}</td><td style="padding:10px;white-space:nowrap">${esc(r.model||'')}</td><td style="padding:10px">${Number(r.input_tokens||0).toLocaleString()}</td><td style="padding:10px">${Number(r.output_tokens||0).toLocaleString()}</td><td style="padding:10px">${Number(r.total_tokens||0).toLocaleString()}</td><td style="padding:10px;text-align:right;font-weight:800">${money(r.estimated_cost_usd,6)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Chưa có lần tạo AI nào được ghi nhận kể từ khi bật theo dõi.</div>'}</div>
  <p class="muted" style="margin-top:12px">Số dư ở đây là số dư theo dõi của riêng app: số tiền bạn nhập − chi phí các lần tạo được app ghi nhận. Nếu API key còn được dùng ở nơi khác, số dư thực tế trên OpenAI có thể khác.</p>`;
}
