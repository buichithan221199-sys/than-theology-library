// Readable hierarchy for fidelity imports (PDF / audio / images / pasted text).
(function(){
  const style=document.createElement('style');
  style.id='fidelity-layout-style';
  style.textContent=`
    .fidelity-note{margin:10px 0 20px;padding:12px 14px;border-radius:12px;background:#f7f3e8;border:1px solid #e7dcc4;color:#5f6875;font-size:13px;line-height:1.55}
    .fid-section{margin:28px 0 0;padding:0 0 4px}
    .fid-section+.fid-section{padding-top:24px;border-top:1px solid #ece3d6}
    .fid-h1{font:700 27px Georgia,serif;color:#12375f;margin:0 0 14px;line-height:1.28}
    .fid-h2{font:700 21px Georgia,serif;color:#204a78;margin:22px 0 9px;line-height:1.35}
    .fid-h3{font-weight:900;color:#2c4867;font-size:17px;margin:17px 0 7px;line-height:1.4}
    .fid-h4{font-weight:850;color:#53657a;font-size:15px;margin:13px 0 6px;line-height:1.4}
    .fid-time{display:inline-block;vertical-align:middle;margin-left:7px;padding:3px 7px;border-radius:999px;background:#f0eadc;color:#8c6726;font:700 11px/1 system-ui}
    .fid-body{white-space:pre-wrap;line-height:1.78;color:#26384d;margin:8px 0 0}
    .fid-sub{margin:8px 0 0 14px;padding:2px 0 4px 16px;border-left:3px solid #d8b65f}
    .fid-item{margin:9px 0 0 12px;padding:2px 0 2px 14px;border-left:2px solid #e6d7b0}
    .fid-subitem{margin:8px 0 0 12px;padding-left:13px;border-left:2px dotted #c6bda9}
    .fid-preview{max-height:56vh;overflow:auto;padding:4px 12px 12px 0}
    @media(max-width:650px){.fid-h1{font-size:23px}.fid-h2{font-size:19px}.fid-sub{margin-left:4px;padding-left:12px}.fid-item{margin-left:4px;padding-left:11px}}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);

  const romans=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
  const roman=i=>romans[i]||String(i+1);
  const alpha=i=>String.fromCharCode(65+(i%26));
  const lower=i=>String.fromCharCode(97+(i%26));
  const txt=v=>String(v??'');
  const timeBadge=v=>v?`<span class="fid-time">${esc(v)}</span>`:'';
  const body=v=>txt(v).trim()?`<div class="fid-body">${esc(txt(v))}</div>`:'';

  function fidelityContent(source){
    let pts=Array.isArray(source?.main_content)?source.main_content:[];
    if(String(source?.source_notes||'')==='fidelity_import_v1'&&typeof window.parseExplicitFidelityHierarchy==='function'){
      const exact=pts.map(x=>txt(x?.explanation||x?.content||'')).join('');
      const parsed=window.parseExplicitFidelityHierarchy(exact);
      if(Array.isArray(parsed)&&parsed.length)pts=parsed;
    }
    return pts.map((p,i)=>{
      const sectionLabel=p?.unnumbered?'':(txt(p?.explicit_label)||roman(i));
      const sectionTitle=`${sectionLabel?esc(sectionLabel)+'. ':''}${esc(p?.title||`Phần ${i+1}`)}${timeBadge(p?.time_label)}`;
      const directItems=Array.isArray(p?.items)?p.items:[];
      const subs=Array.isArray(p?.subpoints)?p.subpoints:[];
      const directHtml=directItems.map((it,k)=>itemHtml(it,k)).join('');
      const subHtml=subs.map((s,j)=>subHtmlOne(s,j)).join('');
      return `<section class="fid-section"><h3 class="fid-h1">${sectionTitle}</h3>${body(p?.explanation||p?.content||'')}${directHtml}${subHtml}</section>`;
    }).join('');
  }

  function itemHtml(it,k){
    const label=txt(it?.explicit_label)||String(k+1),subs=Array.isArray(it?.subitems)?it.subitems:[];
    return `<div class="fid-item"><div class="fid-h3">${esc(label)}. ${esc(it?.title||'')}${timeBadge(it?.time_label)}</div>${body(it?.explanation||it?.content||'')}${subs.map((x,n)=>`<div class="fid-subitem"><div class="fid-h4">${esc(txt(x?.explicit_label)||lower(n))}. ${esc(x?.title||'')}${timeBadge(x?.time_label)}</div>${body(x?.explanation||x?.content||'')}</div>`).join('')}</div>`;
  }

  function subHtmlOne(s,j){
    const label=txt(s?.explicit_label)||alpha(j),items=Array.isArray(s?.items)?s.items:[];
    return `<div class="fid-sub"><div class="fid-h2">${esc(label)}. ${esc(s?.title||'')}${timeBadge(s?.time_label)}</div>${body(s?.explanation||s?.content||'')}${items.map((it,k)=>itemHtml(it,k)).join('')}</div>`;
  }

  function isFidelity(v){return /^fidelity_import_v\d+$/i.test(String(v?.source_notes||''));}
  function mergeVal(oldv,newv){return newv!==undefined&&newv!==null&&newv!==''?newv:oldv;}

  const previousPreview=previewResult;
  previewResult=function(v,ctx){
    if(!v||String(v.source_notes||'')!=='fidelity_import_v2')return previousPreview(v,ctx);
    const old=ctx?.lessonId?S.lessons.find(x=>x.id===ctx.lessonId):null;
    const d=overlay(`<div class="modal" style="width:min(1040px,97vw)"><button class="x">×</button><h2>Xem trước bài học đã chia đúng phần</h2><div class="fidelity-note"><b>Giữ nguyên nội dung nguồn.</b> App chỉ sắp xếp lại theo cấp phần → mục → ý nhỏ để dễ đọc. PDF/MP3 không bị gom thành một khối chữ.</div><div class="field"><label>Tựa đề</label><input id="fidTitle" value="${esc(old?.title||v?.title||'Bài học thần học')}"></div><div class="fid-preview">${fidelityContent(v)}</div><div class="field"><label>Tóm tắt các ý chính · cuối bài</label><textarea id="fidSummary" rows="6">${esc(v?.summary||old?.summary||'')}</textarea></div><div class="field"><label>Bài học rút ra · cuối bài</label><textarea id="fidApplication" rows="6">${esc(v?.application||old?.application||'')}</textarea></div><div id="fidErr"></div><div class="modalActions"><button class="btn gold" id="fidSave">${old?'Cập nhật bài học':'Lưu bài học'}</button></div></div>`);
    d.querySelector('#fidSave').onclick=async()=>{
      const b=d.querySelector('#fidSave');b.disabled=true;b.textContent='Đang lưu…';
      try{
        const lesson={
          ...(old?.id?{id:old.id}:{}),
          ...(old?.folder_id?{folder_id:old.folder_id}:{folder_slug:ctx?.folder||'class-lessons'}),
          title:d.querySelector('#fidTitle').value.trim()||old?.title||v?.title||'Bài học thần học',
          subtitle:mergeVal(old?.subtitle,v?.subtitle||''),
          scripture_reference:mergeVal(old?.scripture_reference,v?.scripture_reference||''),
          key_verse_reference:mergeVal(old?.key_verse_reference,v?.key_verse_reference||''),
          key_verse_1925:mergeVal(old?.key_verse_1925,v?.key_verse_1925||''),
          teacher:mergeVal(old?.teacher,v?.teacher||''),
          lesson_date:old?.lesson_date||null,
          summary:d.querySelector('#fidSummary').value.trim(),
          introduction:'',background:'',transition_text:'',
          main_content:Array.isArray(v?.main_content)?v.main_content:[],
          application:d.querySelector('#fidApplication').value.trim(),
          reflection_questions:[],prayer:'',
          tags:Array.isArray(old?.tags)&&old.tags.length?old.tags:(Array.isArray(v?.tags)?v.tags:[]),
          source_kind:old?.source_kind||v?.source_kind||ctx?.mode||'text',
          source_notes:'fidelity_import_v2',
          is_published:old?old.is_published!==false:true
        };
        const saved=await adm('save_lesson',{lesson});
        if(ctx?.mode==='pdf'&&Array.isArray(ctx?.files)&&ctx.files.length&&typeof saveOriginalAttachments==='function'){
          await saveOriginalAttachments(saved?.lesson?.id||old?.id,ctx.files,'lesson_source');
        }
        d.remove();await load();
        const id=saved?.lesson?.id||old?.id;S.selected=S.lessons.find(x=>x.id===id)||null;S.tab=S.selected?'detail':'lessons';render();
      }catch(e){b.disabled=false;b.textContent=old?'Cập nhật bài học':'Lưu bài học';d.querySelector('#fidErr').innerHTML='<div class="error">'+esc(e?.message||String(e))+'</div>';}
    };
  };

  const previousDetail=detail;
  detail=function(){
    const l=S.selected;
    if(!l||!isFidelity(l))return previousDetail();
    const qs=S.questions.filter(q=>q.lesson_id===l.id);
    const ending=`<section class="lesson-ending"><div class="ending-kicker">Cuối bài</div>${l.summary?`<h3>Tóm tắt các ý chính</h3><div class="lesson-summary-box">${esc(l.summary)}</div>`:''}${l.application?`<h3>Bài học rút ra</h3><div class="lesson-takeaway-box">${esc(l.application)}</div>`:''}</section>`;
    return `<article class="panel lesson"><small>${esc(l.scripture_reference||'')}</small><h2>${esc(l.title)}</h2>${l.key_verse_1925?`<blockquote><b>${esc(l.key_verse_reference||'Câu gốc · Bản 1925')}</b><br>${esc(l.key_verse_1925)}</blockquote>`:''}<div class="fidelity-note">Nội dung nguồn được giữ nguyên và trình bày theo đúng cấp phần để dễ đọc.</div>${fidelityContent(l)}${ending}<h3>Câu hỏi trắc nghiệm</h3>${qs.length?qs.map((q,i)=>questionHtml(q,i)).join(''):'<p class="muted">Chưa có câu hỏi trắc nghiệm cho bài này.</p>'}</article>`;
  };

  window.renderFidelityContent=fidelityContent;
})();
