// Safe printable PDF export for each lesson. Uses a hidden iframe instead of popup/window injection.
function pdfEsc(v){
  const s=v==null?'':String(v);
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function pdfHtmlShell(title,body){return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${pdfEsc(title)}</title><style>
@page{size:Letter;margin:0.65in}*{box-sizing:border-box}body{font-family:Arial,"Segoe UI",sans-serif;color:#1c2b3d;font-size:11.5pt;line-height:1.55;margin:0}h1,h2,h3,h4{font-family:Georgia,"Times New Roman",serif;color:#15365f;page-break-after:avoid}h1{font-size:23pt;line-height:1.2;margin:0 0 8px}h2{font-size:17pt;margin:24px 0 8px;border-bottom:1px solid #d8cfbf;padding-bottom:5px}h3{font-size:14pt;margin:18px 0 6px}h4{font-size:12.5pt;margin:14px 0 5px}.meta{color:#7a5b19;font-weight:700;margin-bottom:14px}.verse{border-left:4px solid #c99a36;background:#fff9e9;padding:12px 15px;margin:14px 0;font-family:Georgia,"Times New Roman",serif}.mainpoint{margin:20px 0;break-inside:avoid}.subpoint{margin:12px 0 18px 20px;padding-left:14px;border-left:3px solid #d7ad4f;break-inside:avoid}.label{font-weight:700;color:#17375f;margin-top:8px}.ref{font-size:10.5pt;color:#a57620;font-weight:700;margin:4px 0 8px}.question{margin:0 0 18px;break-inside:avoid}.option{margin:4px 0 4px 18px}.correct{margin:8px 0 0 18px;padding:7px 10px;border-left:3px solid #409762;background:#edf8f0;font-weight:700}.explanation{margin:4px 0 0 18px;color:#4f5f70;font-size:10.5pt}.footer-note{margin-top:28px;padding-top:10px;border-top:1px solid #ddd;color:#777;font-size:9pt;text-align:center}ol{padding-left:24px}p{margin:6px 0 10px;white-space:pre-line}
</style></head><body>${body}</body></html>`}
function openPrintablePdf(title,body){
  try{
    const old=document.getElementById('theologyPrintFrame');if(old)old.remove();
    const frame=document.createElement('iframe');frame.id='theologyPrintFrame';frame.style.position='fixed';frame.style.right='0';frame.style.bottom='0';frame.style.width='1px';frame.style.height='1px';frame.style.border='0';frame.style.opacity='0';frame.setAttribute('aria-hidden','true');document.body.appendChild(frame);
    const doc=frame.contentWindow.document;doc.open();doc.write(pdfHtmlShell(title,body));doc.close();
    setTimeout(()=>{try{frame.contentWindow.focus();frame.contentWindow.print()}catch(e){console.error(e);alert('Không mở được cửa sổ in. Hãy thử lại trên Chrome/Edge.')}},350);
  }catch(e){console.error('PDF export error',e);alert('Không thể tạo bản in PDF. Vui lòng tải lại trang rồi thử lại.');}
}
function optionLabelPdf(index){
  let n=Number(index)+1,s='';
  while(n>0){n--;s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)}
  return s||'A';
}
function optionEntriesPdf(options){
  if(Array.isArray(options))return options.map((v,i)=>[optionLabelPdf(i),v]).filter(([,v])=>String(v??'').trim());
  if(!options||typeof options!=='object')return [];
  const entries=Object.entries(options).filter(([,v])=>String(v??'').trim());
  const alphaRank=k=>{
    const s=String(k||'').trim().toUpperCase();
    if(!/^[A-Z]+$/.test(s))return Number.MAX_SAFE_INTEGER;
    let n=0;for(const ch of s)n=n*26+(ch.charCodeAt(0)-64);return n;
  };
  return entries.sort((a,b)=>{
    const ra=alphaRank(a[0]),rb=alphaRank(b[0]);
    if(ra!==rb)return ra-rb;
    return String(a[0]).localeCompare(String(b[0]),undefined,{numeric:true,sensitivity:'base'});
  }).map(([k,v],i)=>[String(k||optionLabelPdf(i)).trim().toUpperCase()||optionLabelPdf(i),v]);
}
function exportLessonPdf(){
 try{
  const l=S&&S.selected;if(!l){alert('Chưa chọn bài học.');return}
  const pts=Array.isArray(l.main_content)?l.main_content:[],rqs=Array.isArray(l.reflection_questions)?l.reflection_questions:[],romans=['I','II','III','IV','V','VI'];
  const body=`<h1>${pdfEsc(l.title||'Bài học')}</h1>${l.scripture_reference?`<div class="meta">Phân đoạn: ${pdfEsc(l.scripture_reference)}</div>`:''}${l.teacher?`<div><b>Giáo viên/Diễn giả:</b> ${pdfEsc(l.teacher)}</div>`:''}${l.lesson_date?`<div><b>Ngày học:</b> ${pdfEsc(l.lesson_date)}</div>`:''}${l.key_verse_1925?`<div class="verse"><b>${pdfEsc(l.key_verse_reference||'Câu gốc · Bản 1925')}</b><br>${pdfEsc(l.key_verse_1925)}</div>`:''}${l.summary?`<h2>Tóm tắt</h2><p>${pdfEsc(l.summary)}</p>`:''}${l.introduction?`<h2>Giới thiệu</h2><p>${pdfEsc(l.introduction)}</p>`:''}${l.background?`<h2>Bối cảnh</h2><p>${pdfEsc(l.background)}</p>`:''}${l.transition_text?`<h2>Chuyển ý</h2><p>${pdfEsc(l.transition_text)}</p>`:''}${pts.length?`<h2>Các ý chính</h2>${pts.map((p,i)=>`<div class="mainpoint"><h3>${romans[i]||i+1}. ${pdfEsc(p?.title||'')}</h3>${p?.scripture_reference?`<div class="ref">Kinh Thánh: ${pdfEsc(p.scripture_reference)}</div>`:''}${p?.explanation||p?.content?`<p>${pdfEsc(p.explanation||p.content||'')}</p>`:''}${Array.isArray(p?.subpoints)?p.subpoints.map((s,j)=>`<div class="subpoint"><h4>${j+1}. ${pdfEsc(s?.title||'')}</h4>${s?.scripture_reference?`<div class="ref">Kinh Thánh: ${pdfEsc(s.scripture_reference)}</div>`:''}${s?.explanation?`<div class="label">Giải thích Kinh Thánh</div><p>${pdfEsc(s.explanation)}</p>`:''}${s?.practical_explanation?`<div class="label">Giải thích thực tế</div><p>${pdfEsc(s.practical_explanation)}</p>`:''}${s?.example?`<div class="label">Ví dụ đời sống</div><p>${pdfEsc(s.example)}</p>`:''}${s?.application?`<div class="label">Tự xét & áp dụng</div><p>${pdfEsc(s.application)}</p>`:''}</div>`).join(''):''}</div>`).join('')}`:''}${l.application?`<h2>Áp dụng chung</h2><p>${pdfEsc(l.application)}</p>`:''}${rqs.length?`<h2>Câu hỏi suy ngẫm</h2><ol>${rqs.map(x=>`<li>${pdfEsc(typeof x==='string'?x:(x?.question||x?.text||''))}</li>`).join('')}</ol>`:''}${l.prayer?`<h2>Lời cầu nguyện</h2><p>${pdfEsc(l.prayer)}</p>`:''}<div class="footer-note">Thư Viện Thần Học · Hành trình đức tin</div>`;
  openPrintablePdf((l.title||'Bài học')+' - Bài học',body);
 }catch(e){console.error(e);alert('Không thể xuất PDF bài học.');}
}
function exportQuizPdf(){
 try{
  const l=S&&S.selected;if(!l){alert('Chưa chọn bài học.');return}
  const all=Array.isArray(S.questions)?S.questions:[];const qs=all.filter(q=>q&&q.lesson_id===l.id);
  if(!qs.length){alert('Bài học này chưa có câu hỏi trắc nghiệm.');return}
  const body=`<h1>Bài trắc nghiệm</h1><div class="meta">${pdfEsc(l.title||'')}</div>${l.scripture_reference?`<div style="margin-bottom:16px"><b>Phân đoạn:</b> ${pdfEsc(l.scripture_reference)}</div>`:''}<div style="margin:12px 0 24px"><b>Họ và tên:</b> ________________________________ &nbsp;&nbsp; <b>Ngày:</b> ____________</div>${qs.map((q,i)=>{const entries=optionEntriesPdf(q.options);return `<div class="question"><b>Câu ${q.sort_order||i+1}. ${pdfEsc(q.question_text||'')}</b>${entries.map(([k,v])=>`<div class="option">${pdfEsc(k)}. ${pdfEsc(v)}</div>`).join('')}</div>`}).join('')}<div class="footer-note">Thư Viện Thần Học · Phiếu trắc nghiệm</div>`;
  openPrintablePdf((l.title||'Bài học')+' - Trắc nghiệm',body);
 }catch(e){console.error(e);alert('Không thể xuất PDF trắc nghiệm.');}
}
async function exportQuizAnswerPdf(){
 try{
  if(!S?.pin){alert('Hãy mở Quản trị trước để xuất PDF có đáp án.');return}
  const l=S?.selected;if(!l){alert('Chưa chọn bài học.');return}
  const qs=(Array.isArray(S.questions)?S.questions:[]).filter(q=>q&&q.lesson_id===l.id);
  if(!qs.length){alert('Bài học này chưa có câu hỏi trắc nghiệm.');return}
  let answerMap={};
  try{const r=await adm('reveal_answers',{lesson_id:l.id});answerMap=r?.answers||{};S.revealed={...(S.revealed||{}),...answerMap}}catch(e){console.warn('Không tải được bộ đáp án',e)}
  const rows=qs.map(q=>({q,a:answerMap[q.id]||S.revealed?.[q.id]||null}));
  const body=`<h1>Bài trắc nghiệm · Kèm đáp án</h1><div class="meta">${pdfEsc(l.title||'')}</div>${l.scripture_reference?`<div style="margin-bottom:16px"><b>Phân đoạn:</b> ${pdfEsc(l.scripture_reference)}</div>`:''}${rows.map(({q,a},i)=>{const entries=optionEntriesPdf(q.options);const ans=String(a?.correct_option||'').trim()||'Chưa có đáp án';return `<div class="question"><b>Câu ${q.sort_order||i+1}. ${pdfEsc(q.question_text||'')}</b>${entries.map(([k,v])=>`<div class="option">${pdfEsc(k)}. ${pdfEsc(v)}</div>`).join('')}<div class="correct">Đáp án đúng: ${pdfEsc(ans)}</div>${a?.explanation?`<div class="explanation"><b>Giải thích:</b> ${pdfEsc(a.explanation)}</div>`:''}</div>`}).join('')}<div class="footer-note">Thư Viện Thần Học · Bản quản trị có đáp án</div>`;
  openPrintablePdf((l.title||'Bài học')+' - Trắc nghiệm có đáp án',body);
 }catch(e){console.error(e);alert('Không thể xuất PDF trắc nghiệm có đáp án.');}
}
const _detailPdfExport=detail;
detail=function(){
 try{
  let h=_detailPdfExport();if(!S||!S.selected)return h;
  const answerBtn=`<button class="btn white answer-action" onclick="exportQuizAnswerPdf()">✅ Xuất PDF trắc nghiệm + đáp án</button>`;
  const bar=`<div class="pdf-action-toolbar" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px"><button class="btn gold" onclick="exportLessonPdf()">📘 Xuất PDF bài học</button><button class="btn white" onclick="exportQuizPdf()">📝 Xuất PDF trắc nghiệm</button>${answerBtn}</div>`;
  return h.includes('<article class="panel lesson">')?h.replace('<article class="panel lesson">','<article class="panel lesson">'+bar):bar+h;
 }catch(e){console.error('detail export patch error',e);return _detailPdfExport();}
};
