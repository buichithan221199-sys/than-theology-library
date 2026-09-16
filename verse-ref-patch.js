// Add a Scripture reference to every main teaching point and format each point clearly.
const _admVerseRef=adm;
adm=async function(action,payload={},pin=S.pin){
  if(action==='save_lesson'&&payload?.lesson&&Array.isArray(payload.lesson.main_content)){
    const refs=[...document.querySelectorAll('[data-point] .psr')].map(x=>x.value.trim());
    if(refs.length)payload.lesson.main_content=payload.lesson.main_content.map((p,i)=>({...p,scripture_reference:refs[i]||p.scripture_reference||''}));
  }
  return _admVerseRef(action,payload,pin);
};

const _previewVerseRef=previewResult;
previewResult=function(v,ctx){
  _previewVerseRef(v,ctx);
  if(ctx?.targetType==='questions')return;
  setTimeout(()=>{
    const pts=Array.isArray(v?.main_content)?v.main_content:[];
    document.querySelectorAll('[data-point]').forEach((el,i)=>{
      if(el.querySelector('.psr'))return;
      const f=document.createElement('div');f.className='field';
      f.innerHTML=`<label>Câu Kinh Thánh cho ý này</label><input class="psr" placeholder="Ví dụ: Truyền đạo 1:12–14" value="${esc(pts[i]?.scripture_reference||'')}">`;
      const first=el.querySelector('.field');if(first)first.insertAdjacentElement('afterend',f);else el.prepend(f);
    });
  },0);
};

function formatPointContent(raw){
  const text=String(raw||'').trim();
  if(!text)return '';
  const labels=['Giải thích Kinh Thánh','Giải thích thực tế','Ví dụ đời sống','Tự xét & áp dụng'];
  const re=/(Giải thích Kinh Thánh|Giải thích thực tế|Ví dụ đời sống|Tự xét\s*&\s*áp dụng)\s*:/gi;
  const hits=[];let m;
  while((m=re.exec(text)))hits.push({label:m[1],start:m.index,bodyStart:re.lastIndex});
  if(!hits.length)return `<div style="margin-top:14px;line-height:1.75;white-space:pre-line">${esc(text)}</div>`;
  let html='';
  for(let i=0;i<hits.length;i++){
    const h=hits[i];
    const end=i+1<hits.length?hits[i+1].start:text.length;
    const body=text.slice(h.bodyStart,end).trim();
    const normalized=/^Tự xét/i.test(h.label)?'Tự xét & áp dụng':labels.find(x=>x.toLowerCase()===h.label.toLowerCase())||h.label;
    html+=`<div style="margin-top:${i?18:14}px;padding-top:${i?14:0}px;${i?'border-top:1px solid #eee6d8;':''}"><div style="font-weight:800;color:#17375f;margin-bottom:6px">${esc(normalized)}</div><div style="line-height:1.75;white-space:pre-line">${esc(body)}</div></div>`;
  }
  return html;
}

const _detailVerseRef=detail;
detail=function(){
  let h=_detailVerseRef();
  const pts=Array.isArray(S.selected?.main_content)?S.selected.main_content:[];
  for(const p of pts){
    const title=esc(p?.title||'');
    const content=esc(p?.content||p?.explanation||'');
    const ref=p?.scripture_reference?`<div style="margin-top:6px;color:#a57620;font-weight:800;font-size:13px">📖 ${esc(p.scripture_reference)}</div>`:'';
    const plain=`<div class="question"><b>${title}</b><p style="white-space:pre-line">${content}</p></div>`;
    const withRef=`<div class="question"><b>${title}</b>${ref}<p style="white-space:pre-line">${content}</p></div>`;
    const pretty=`<div class="question"><b style="font-size:18px">${title}</b>${ref}${formatPointContent(p?.content||p?.explanation||'')}</div>`;
    if(h.includes(withRef))h=h.replace(withRef,pretty);
    else if(h.includes(plain))h=h.replace(plain,pretty);
  }
  return h;
};
