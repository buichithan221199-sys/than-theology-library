// Hierarchical PDF export for fidelity imports. Keeps the same I -> A -> 1 -> a structure as the lesson view.
(function(){
  const TRANSLATE_FID=SB+'/functions/v1/theology-translate-export';
  const oldExport=window.exportLessonPdfBilingual;
  const romans=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
  const alpha=i=>String.fromCharCode(65+(i%26));
  const lower=i=>String.fromCharCode(97+(i%26));
  const isFid=l=>/^fidelity_import_v\d+$/i.test(String(l?.source_notes||''));
  const txBody=v=>String(v??'').trim()?`<div style="white-space:pre-wrap;line-height:1.72;margin:7px 0 0">${pdfEsc(String(v??''))}</div>`:'';
  const time=v=>v?` <span style="font-size:10px;font-family:Arial,sans-serif;color:#8a6a2a;background:#f4eddc;padding:2px 6px;border-radius:999px">${pdfEsc(v)}</span>`:'';

  function structuredCloneForExport(l){
    const c=typeof structuredClone==='function'?structuredClone(l):JSON.parse(JSON.stringify(l));
    if(String(c?.source_notes||'')==='fidelity_import_v1'&&typeof window.parseExplicitFidelityHierarchy==='function'){
      const exact=(Array.isArray(c.main_content)?c.main_content:[]).map(x=>String(x?.explanation||x?.content||'')).join('');
      const parsed=window.parseExplicitFidelityHierarchy(exact);
      if(Array.isArray(parsed)&&parsed.length){c.main_content=parsed;c.source_notes='fidelity_import_v2';}
    }
    return c;
  }

  function itemHtml(it,k){
    const lab=String(it?.explicit_label||k+1),subs=Array.isArray(it?.subitems)?it.subitems:[];
    return `<div style="margin:11px 0 0 20px;padding-left:12px;border-left:2px solid #e5d6b0;break-inside:avoid"><h4 style="font-size:14px;margin:0 0 5px;color:#294866">${pdfEsc(lab)}. ${pdfEsc(it?.title||'')}${time(it?.time_label)}</h4>${txBody(it?.explanation||it?.content||'')}${subs.map((x,n)=>`<div style="margin:9px 0 0 16px;padding-left:10px;border-left:1px dotted #aaa"><div style="font-weight:700;font-size:12.5px;color:#566579">${pdfEsc(String(x?.explicit_label||lower(n)))}. ${pdfEsc(x?.title||'')}${time(x?.time_label)}</div>${txBody(x?.explanation||x?.content||'')}</div>`).join('')}</div>`;
  }
  function subHtml(s,j){
    const lab=String(s?.explicit_label||alpha(j)),items=Array.isArray(s?.items)?s.items:[];
    return `<div style="margin:15px 0 0 14px;padding-left:13px;border-left:3px solid #d7ad4f;break-inside:avoid-page"><h3 style="font-size:16px;margin:0 0 6px;color:#204a78">${pdfEsc(lab)}. ${pdfEsc(s?.title||'')}${time(s?.time_label)}</h3>${txBody(s?.explanation||s?.content||'')}${items.map((it,k)=>itemHtml(it,k)).join('')}</div>`;
  }
  function hierarchyHtml(l){
    const pts=Array.isArray(l?.main_content)?l.main_content:[];
    return pts.map((p,i)=>{
      const lab=p?.unnumbered?'':String(p?.explicit_label||romans[i]||i+1);
      const direct=Array.isArray(p?.items)?p.items:[],subs=Array.isArray(p?.subpoints)?p.subpoints:[];
      return `<section style="margin:24px 0 0;${i?'padding-top:18px;border-top:1px solid #e8e0d3;':''}"><h2 style="font-size:20px;color:#15365f;margin:0 0 10px">${lab?pdfEsc(lab)+'. ':''}${pdfEsc(p?.title||'')}${time(p?.time_label)}</h2>${txBody(p?.explanation||p?.content||'')}${direct.map((it,k)=>itemHtml(it,k)).join('')}${subs.map((s,j)=>subHtml(s,j)).join('')}</section>`;
    }).join('');
  }
  function renderFidelityPdf(l,lang){
    const en=lang==='en';
    const cover=l.cover_image_url?`<img src="${pdfEsc(l.cover_image_url)}" style="width:100%;height:245px;object-fit:cover;border-radius:12px;margin-bottom:18px">`:'';
    const summary=en?'Summary of key points':'Tóm tắt các ý chính',takeaway=en?'Lesson takeaway':'Bài học rút ra',footer=en?'Theology Library · Faith Journey':'Thư Viện Thần Học · Hành trình đức tin';
    return `${cover}<h1>${pdfEsc(l.title||'')}</h1>${l.scripture_reference?`<div class="meta">${en?'Scripture':'Phân đoạn'}: ${pdfEsc(l.scripture_reference)}</div>`:''}${l.teacher?`<div><b>${en?'Teacher / Speaker':'Giáo viên / Diễn giả'}:</b> ${pdfEsc(l.teacher)}</div>`:''}${l.lesson_date?`<div><b>${en?'Lesson date':'Ngày học'}:</b> ${pdfEsc(l.lesson_date)}</div>`:''}${l.key_verse_1925?`<div class="verse"><b>${pdfEsc(l.key_verse_reference||(en?'Key verse':'Câu gốc · Bản 1925'))}</b><br>${pdfEsc(l.key_verse_1925)}</div>`:''}${hierarchyHtml(l)}${l.summary?`<h2 style="margin-top:30px">${summary}</h2><div style="white-space:pre-wrap;line-height:1.72">${pdfEsc(l.summary)}</div>`:''}${l.application?`<h2>${takeaway}</h2><div style="white-space:pre-wrap;line-height:1.72">${pdfEsc(l.application)}</div>`:''}<div class="footer-note">${footer}</div>`;
  }
  function choose(run){
    const d=overlay(`<div class="modal" style="max-width:480px"><button class="x">×</button><h2>Ngôn ngữ PDF</h2><p class="muted">Bố cục I → A → 1 → a sẽ được giữ nguyên trong file PDF.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px"><button class="btn gold" id="fidPdfVi" style="padding:18px">🇻🇳 Tiếng Việt</button><button class="btn white" id="fidPdfEn" style="padding:18px">🇺🇸 English</button></div></div>`);
    d.querySelector('#fidPdfVi').onclick=()=>{d.remove();run('vi')};
    d.querySelector('#fidPdfEn').onclick=()=>{d.remove();run('en')};
  }
  async function translate(l){
    const r=await fetch(TRANSLATE_FID,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target_language:'en',kind:'lesson',payload:l})});
    const j=await r.json();if(!r.ok)throw Error(j.error||'Không dịch được nội dung PDF.');return j.translated;
  }
  window.exportLessonPdfBilingual=function(){
    const selected=S?.selected;
    if(!isFid(selected))return typeof oldExport==='function'?oldExport():undefined;
    choose(async lang=>{
      let data=structuredCloneForExport(selected),box=null;
      try{
        if(lang==='en'){
          box=overlay(`<div class="modal" style="max-width:440px;text-align:center"><h2>Đang dịch sang English…</h2><p class="muted">Giữ nguyên cấu trúc bài học trong lúc dịch.</p></div>`);
          data=await translate(data);
        }
        box?.remove();
        openPrintablePdf((data.title||selected.title||'Lesson')+(lang==='en'?' - Lesson':' - Bài học'),renderFidelityPdf(data,lang));
      }catch(e){box?.remove();alert(e?.message||String(e));}
    });
  };
})();
