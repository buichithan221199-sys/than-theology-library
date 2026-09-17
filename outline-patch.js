// Hierarchical Bible lesson outline: Roman numeral main points + numbered subpoints.
function cleanOutlineTitle(v){
  return String(v||'')
    .replace(/^\s*(?:[IVXLCDM]+|\d+)\s*[.)-]\s*/i,'')
    .replace(/^\s*\d+\s*[.)-]\s*/,'')
    .trim();
}
const _admOutline=adm;
adm=async function(action,payload={},pin=S.pin){
  if(action==='save_lesson'&&payload?.lesson){
    const blocks=[...document.querySelectorAll('[data-point]')];
    if(blocks.length){
      payload.lesson.main_content=blocks.map((el,i)=>({
        title:cleanOutlineTitle(el.querySelector('.pt')?.value.trim()||''),
        scripture_reference:el.querySelector('.psr')?.value.trim()||'',
        explanation:el.querySelector('.pc')?.value.trim()||'',
        subpoints:[...el.querySelectorAll('[data-subpoint]')].map((sp,j)=>({
          title:cleanOutlineTitle(sp.querySelector('.spt')?.value.trim()||''),
          scripture_reference:sp.querySelector('.spr')?.value.trim()||'',
          explanation:sp.querySelector('.se')?.value.trim()||'',
          practical_explanation:sp.querySelector('.spe')?.value.trim()||'',
          example:sp.querySelector('.sex')?.value.trim()||'',
          application:sp.querySelector('.sa')?.value.trim()||''
        })).filter(x=>x.title||x.scripture_reference||x.explanation||x.practical_explanation||x.example||x.application)
      })).filter(x=>x.title||x.scripture_reference||x.explanation||x.subpoints.length);
    }
  }
  return _admOutline(action,payload,pin);
};

const _previewOutline=previewResult;
previewResult=function(v,ctx){
  _previewOutline(v,ctx);
  if(ctx?.targetType==='questions')return;
  setTimeout(()=>{
    const pts=Array.isArray(v?.main_content)?v.main_content:[];
    const romans=['I','II','III','IV','V'];
    document.querySelectorAll('[data-point]').forEach((el,i)=>{
      const p=pts[i]||{};
      const titleField=el.querySelector('.pt')?.closest('.field');
      if(titleField){const lab=titleField.querySelector('label');if(lab)lab.textContent=`${romans[i]||i+1}. Ý chính`;const inp=titleField.querySelector('.pt');if(inp)inp.value=cleanOutlineTitle(inp.value)}
      const contentField=el.querySelector('.pc')?.closest('.field');
      if(contentField){const lab=contentField.querySelector('label');if(lab)lab.textContent='Giải thích ý chính theo phân đoạn Kinh Thánh'}
      if(!el.querySelector('.psr')){
        const f=document.createElement('div');f.className='field';f.innerHTML=`<label>Phân đoạn Kinh Thánh của ý chính</label><input class="psr" value="${esc(p.scripture_reference||'')}" placeholder="Ví dụ: Giê-rê-mi 14:1–6">`;
        titleField?.insertAdjacentElement('afterend',f);
      }
      if(!el.querySelector('.subpoints-wrap')){
        const wrap=document.createElement('div');wrap.className='subpoints-wrap';
        const subs=Array.isArray(p.subpoints)?p.subpoints:[];
        wrap.innerHTML=`<h4 style="margin:18px 0 8px;color:#17375f">Các ý phụ</h4>`+subs.map((s,j)=>`<div data-subpoint="${j}" style="border-left:3px solid #d7ad4f;padding:12px 14px;margin:12px 0;background:#fbfaf7;border-radius:10px"><div class="field"><label>${j+1}. Ý phụ</label><input class="spt" value="${esc(cleanOutlineTitle(s.title||''))}"></div><div class="field"><label>Phân đoạn Kinh Thánh của ý phụ</label><input class="spr" value="${esc(s.scripture_reference||'')}"></div><div class="field"><label>Giải thích Kinh Thánh</label><textarea class="se" rows="4">${esc(s.explanation||'')}</textarea></div><div class="field"><label>Giải thích thực tế</label><textarea class="spe" rows="4">${esc(s.practical_explanation||'')}</textarea></div><div class="field"><label>Ví dụ đời sống</label><textarea class="sex" rows="3">${esc(s.example||'')}</textarea></div><div class="field"><label>Tự xét & áp dụng</label><textarea class="sa" rows="3">${esc(s.application||'')}</textarea></div></div>`).join('');
        el.appendChild(wrap);
      }
    });
  },0);
};

function outlineSection(label,text){return text?`<div style="margin-top:12px"><b style="display:block;color:#17375f;margin-bottom:4px">${label}</b><div style="white-space:pre-line;line-height:1.7">${esc(text)}</div></div>`:''}

detail=function(){
  const l=S.selected;if(!l)return lessonList();
  const qs=S.questions.filter(q=>q.lesson_id===l.id),pts=Array.isArray(l.main_content)?l.main_content:[],rqs=Array.isArray(l.reflection_questions)?l.reflection_questions:[],romans=['I','II','III','IV','V'];
  const main=pts.length?`<h3>Các ý chính</h3>${pts.map((p,i)=>`<section class="question" style="padding:22px"><h3 style="margin:0;color:#15365f">${romans[i]||i+1}. ${esc(cleanOutlineTitle(p.title||''))}</h3>${p.scripture_reference?`<div style="margin:6px 0 12px;color:#a57620;font-weight:800">📖 ${esc(p.scripture_reference)}</div>`:''}${p.explanation||p.content?`<div style="line-height:1.75;margin-bottom:16px">${esc(p.explanation||p.content||'')}</div>`:''}${Array.isArray(p.subpoints)&&p.subpoints.length?p.subpoints.map((s,j)=>`<div style="margin:16px 0 0;padding:16px 18px;border-left:4px solid #d7ad4f;background:#fbfaf7;border-radius:10px"><h4 style="margin:0;color:#17375f;font-size:18px">${j+1}. ${esc(cleanOutlineTitle(s.title||''))}</h4>${s.scripture_reference?`<div style="margin:5px 0 10px;color:#a57620;font-weight:800;font-size:13px">📖 ${esc(s.scripture_reference)}</div>`:''}${outlineSection('Giải thích Kinh Thánh',s.explanation)}${outlineSection('Giải thích thực tế',s.practical_explanation)}${outlineSection('Ví dụ đời sống',s.example)}${outlineSection('Tự xét & áp dụng',s.application)}</div>`).join(''):''}</section>`).join('')}`:'';
  return `<article class="panel lesson"><small>${esc(l.scripture_reference||'')}</small><h2>${esc(l.title)}</h2>${l.key_verse_1925?`<blockquote><b>${esc(l.key_verse_reference||'Câu gốc · Bản 1925')}</b><br>${esc(l.key_verse_1925)}</blockquote>`:''}${l.summary?`<h3>Tóm tắt</h3><p>${esc(l.summary)}</p>`:''}${l.introduction?`<h3>Giới thiệu</h3><p>${esc(l.introduction)}</p>`:''}${l.background?`<h3>Bối cảnh</h3><p>${esc(l.background)}</p>`:''}${l.transition_text?`<h3>Chuyển ý</h3><p>${esc(l.transition_text)}</p>`:''}${main}${l.application?`<h3>Áp dụng chung</h3><p>${esc(l.application)}</p>`:''}${rqs.length?`<h3>Câu hỏi suy ngẫm</h3><ol>${rqs.map(x=>`<li>${esc(typeof x==='string'?x:(x.question||x.text||''))}</li>`).join('')}</ol>`:''}${l.prayer?`<h3>Lời cầu nguyện</h3><p>${esc(l.prayer)}</p>`:''}<h3>Câu hỏi trắc nghiệm</h3>${qs.length?qs.map((q,i)=>questionHtml(q,i)).join(''):'<p class="muted">Chưa có câu hỏi trắc nghiệm cho bài này.</p>'}</article>`;
};
