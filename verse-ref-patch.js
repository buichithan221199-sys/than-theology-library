// Add a Scripture reference to every main teaching point.
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

const _detailVerseRef=detail;
detail=function(){
  let h=_detailVerseRef();
  const pts=Array.isArray(S.selected?.main_content)?S.selected.main_content:[];
  for(const p of pts){
    if(!p?.scripture_reference)continue;
    const needle=`<div class="question"><b>${esc(p.title||'')}</b><p style="white-space:pre-line">`;
    const repl=`<div class="question"><b>${esc(p.title||'')}</b><div style="margin-top:6px;color:#a57620;font-weight:800;font-size:13px">📖 ${esc(p.scripture_reference)}</div><p style="white-space:pre-line">`;
    h=h.replace(needle,repl);
  }
  return h;
};
