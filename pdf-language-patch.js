// Bilingual PDF export for all theology-library export types.
(function(){
  const TRANSLATE=SB+'/functions/v1/theology-translate-export';
  function waitBox(text){
    try{return overlay(`<div class="modal" style="max-width:440px;text-align:center"><h2>${pdfEsc(text)}</h2><p class="muted">Vui lòng giữ trang này mở trong lúc chuẩn bị PDF.</p></div>`)}catch{return null}
  }
  function choosePdfLanguage(run){
    try{
      const d=overlay(`<div class="modal" style="max-width:480px"><button class="x">×</button><h2>Ngôn ngữ PDF</h2><p class="muted">Chọn ngôn ngữ cho file PDF này.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px"><button class="btn gold" id="pdfVi" style="padding:18px">🇻🇳 Tiếng Việt</button><button class="btn white" id="pdfEn" style="padding:18px">🇺🇸 English</button></div></div>`);
      d.querySelector('#pdfVi').onclick=()=>{d.remove();run('vi')};
      d.querySelector('#pdfEn').onclick=()=>{d.remove();run('en')};
    }catch{const en=confirm('OK = English\nCancel = Tiếng Việt');run(en?'en':'vi')}
  }
  async function translatePayload(payload,kind){
    const r=await fetch(TRANSLATE,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target_language:'en',kind,payload})});
    const j=await r.json();if(!r.ok)throw Error(j.error||'Không dịch được nội dung PDF.');return j.translated;
  }
  function opts(o){return normalizeOpts(o)}
  function qKeys(o){return optionKeysPdf(o)}
  function renderLesson(l,lang){
    const en=lang==='en', pts=Array.isArray(l.main_content)?l.main_content:[], rqs=Array.isArray(l.reflection_questions)?l.reflection_questions:[], romans=['I','II','III','IV','V','VI','VII','VIII'];
    const tx=en?{section:'Scripture',teacher:'Teacher / Speaker',date:'Lesson date',verse:'Key verse',intro:'Introduction',bg:'Background',transition:'Transition',main:'Main points',bible:'Scripture',explain:'Biblical explanation',practical:'Practical explanation',example:'Life example',apply:'Reflection & application',reflect:'Reflection questions',summary:'Summary of key points',takeaway:'Lesson takeaway',prayer:'Prayer',footer:'Theology Library · Faith Journey'}:{section:'Phân đoạn',teacher:'Giáo viên / Diễn giả',date:'Ngày học',verse:'Câu gốc · Bản 1925',intro:'Giới thiệu',bg:'Bối cảnh',transition:'Chuyển ý',main:'Các ý chính',bible:'Kinh Thánh',explain:'Giải thích Kinh Thánh',practical:'Giải thích thực tế',example:'Ví dụ đời sống',apply:'Tự xét & áp dụng',reflect:'Câu hỏi suy ngẫm',summary:'Tóm tắt các ý chính',takeaway:'Bài học rút ra',prayer:'Lời cầu nguyện',footer:'Thư Viện Thần Học · Hành trình đức tin'};
    const cover=l.cover_image_url?`<img src="${pdfEsc(l.cover_image_url)}" style="width:100%;height:245px;object-fit:cover;border-radius:12px;margin-bottom:18px">`:'';
    return `${cover}<h1>${pdfEsc(l.title||'')}</h1>${l.scripture_reference?`<div class="meta">${tx.section}: ${pdfEsc(l.scripture_reference)}</div>`:''}${l.teacher?`<div><b>${tx.teacher}:</b> ${pdfEsc(l.teacher)}</div>`:''}${l.lesson_date?`<div><b>${tx.date}:</b> ${pdfEsc(l.lesson_date)}</div>`:''}${l.key_verse_1925?`<div class="verse"><b>${pdfEsc(l.key_verse_reference||tx.verse)}</b><br>${pdfEsc(l.key_verse_1925)}</div>`:''}${l.introduction?`<h2>${tx.intro}</h2><p>${pdfEsc(l.introduction)}</p>`:''}${l.background?`<h2>${tx.bg}</h2><p>${pdfEsc(l.background)}</p>`:''}${l.transition_text?`<h2>${tx.transition}</h2><p>${pdfEsc(l.transition_text)}</p>`:''}${pts.length?`<h2>${tx.main}</h2>${pts.map((p,i)=>`<div class="mainpoint"><h3>${romans[i]||i+1}. ${pdfEsc(p?.title||'')}</h3>${p?.scripture_reference?`<div class="ref">${tx.bible}: ${pdfEsc(p.scripture_reference)}</div>`:''}${p?.explanation||p?.content?`<p>${pdfEsc(p.explanation||p.content||'')}</p>`:''}${Array.isArray(p?.subpoints)&&p.subpoints.length?p.subpoints.map((s,j)=>`<div class="subpoint"><h4>${j+1}. ${pdfEsc(s?.title||'')}</h4>${s?.scripture_reference?`<div class="ref">${tx.bible}: ${pdfEsc(s.scripture_reference)}</div>`:''}${s?.explanation?`<div class="label">${tx.explain}</div><p>${pdfEsc(s.explanation)}</p>`:''}${s?.practical_explanation?`<div class="label">${tx.practical}</div><p>${pdfEsc(s.practical_explanation)}</p>`:''}${s?.example?`<div class="label">${tx.example}</div><p>${pdfEsc(s.example)}</p>`:''}${s?.application?`<div class="label">${tx.apply}</div><p>${pdfEsc(s.application)}</p>`:''}</div>`).join(''):''}</div>`).join('')}`:''}${rqs.length?`<h2>${tx.reflect}</h2><ol>${rqs.map(x=>`<li>${pdfEsc(typeof x==='string'?x:(x?.question||x?.text||''))}</li>`).join('')}</ol>`:''}${l.summary?`<h2>${tx.summary}</h2><p>${pdfEsc(l.summary)}</p>`:''}${l.application?`<h2>${tx.takeaway}</h2><p>${pdfEsc(l.application)}</p>`:''}${l.prayer?`<h2>${tx.prayer}</h2><p>${pdfEsc(l.prayer)}</p>`:''}<div class="footer-note">${tx.footer}</div>`;
  }
  function renderQuiz(l,qs,lang,answers=false){
    const en=lang==='en';
    const tx=en?{title:answers?'Quiz · Answer key':'Quiz',section:'Scripture',name:'Name',date:'Date',q:'Question',correct:'Correct answer',explain:'Explanation',footer:answers?'Theology Library · Admin answer key':'Theology Library · Quiz'}:{title:answers?'Bài trắc nghiệm · Kèm đáp án':'Bài trắc nghiệm',section:'Phân đoạn',name:'Họ và tên',date:'Ngày',q:'Câu',correct:'Đáp án đúng',explain:'Giải thích',footer:answers?'Thư Viện Thần Học · Bản quản trị có đáp án':'Thư Viện Thần Học · Phiếu trắc nghiệm'};
    return `<h1>${tx.title}</h1><div class="meta">${pdfEsc(l.title||'')}</div>${l.scripture_reference?`<div style="margin-bottom:16px"><b>${tx.section}:</b> ${pdfEsc(l.scripture_reference)}</div>`:''}${!answers?`<div style="margin:12px 0 24px"><b>${tx.name}:</b> ________________________________ &nbsp;&nbsp; <b>${tx.date}:</b> ____________</div>`:''}${qs.map((q,i)=>{const o=opts(q.options),keys=qKeys(o),a=q.answer||null;return `<div class="question"><b>${tx.q} ${q.sort_order||i+1}. ${pdfEsc(q.question_text||'')}</b>${keys.map(k=>`<div class="option">${k}. ${pdfEsc(o[k])}</div>`).join('')}${answers?`<div class="correct">${tx.correct}: ${pdfEsc(String(a?.correct_option||''))}</div>${a?.explanation?`<div class="explanation"><b>${tx.explain}:</b> ${pdfEsc(a.explanation)}</div>`:''}`:''}</div>`}).join('')}<div class="footer-note">${tx.footer}</div>`;
  }
  async function lessonExport(lang){
    const l=S?.selected;if(!l){alert('Chưa chọn bài học.');return}
    let data=l,box=null;try{if(lang==='en'){box=waitBox('Đang dịch sang English…');data=await translatePayload(l,'lesson')}box?.remove();openPrintablePdf((data.title||l.title||'Lesson')+(lang==='en'?' - Lesson':' - Bài học'),renderLesson(data,lang))}catch(e){box?.remove();alert(e.message||String(e))}
  }
  async function quizExport(lang){
    const l=S?.selected;if(!l){alert('Chưa chọn bài học.');return}const qs=(S.questions||[]).filter(q=>q?.lesson_id===l.id);if(!qs.length){alert('Bài học này chưa có câu hỏi trắc nghiệm.');return}
    let payload={lesson:{title:l.title,scripture_reference:l.scripture_reference},questions:qs},box=null;try{if(lang==='en'){box=waitBox('Đang dịch trắc nghiệm sang English…');payload=await translatePayload(payload,'quiz')}box?.remove();openPrintablePdf((payload.lesson?.title||l.title||'Quiz')+(lang==='en'?' - Quiz':' - Trắc nghiệm'),renderQuiz(payload.lesson,payload.questions,lang,false))}catch(e){box?.remove();alert(e.message||String(e))}
  }
  async function quizAnswerExport(lang){
    if(!S?.pin){unlock(()=>quizAnswerExport(lang));return}const l=S?.selected;if(!l)return;const qs=(S.questions||[]).filter(q=>q?.lesson_id===l.id);if(!qs.length){alert('Bài học này chưa có câu hỏi trắc nghiệm.');return}
    let answerMap={};try{const r=await adm('reveal_answers',{lesson_id:l.id});answerMap=r?.answers||{};S.revealed={...(S.revealed||{}),...answerMap}}catch(e){alert(e?.message||'Không tải được đáp án.');return}
    const rows=qs.map(q=>({...q,answer:answerMap[q.id]||S.revealed?.[q.id]||{correct_option:'',explanation:''}}));
    let payload={lesson:{title:l.title,scripture_reference:l.scripture_reference},questions:rows},box=null;try{if(lang==='en'){box=waitBox('Đang dịch bản đáp án sang English…');payload=await translatePayload(payload,'quiz_answers')}box?.remove();openPrintablePdf((payload.lesson?.title||l.title||'Quiz')+(lang==='en'?' - Quiz Answer Key':' - Trắc nghiệm có đáp án'),renderQuiz(payload.lesson,payload.questions,lang,true))}catch(e){box?.remove();alert(e.message||String(e))}
  }

  // Use unique global handlers so inline onclick always resolves to the bilingual exporter,
  // regardless of older global function declarations loaded before this patch.
  window.exportLessonPdfBilingual=function(){choosePdfLanguage(lessonExport)};
  window.exportQuizPdfBilingual=function(){choosePdfLanguage(quizExport)};
  window.exportQuizAnswerPdfBilingual=function(){choosePdfLanguage(quizAnswerExport)};

  window.exportDevotionalPdfBilingual=function(kind){
    choosePdfLanguage(async lang=>{
      const l=S?.selected;if(!l)return;let data=l,box=null;try{if(lang==='en'){box=waitBox('Đang dịch sang English…');data=await translatePayload(l,kind||l.source_kind||'devotional')}
        box?.remove();const en=lang==='en',isStory=kind==='faith_story';const image=data.cover_image_url?`<img src="${pdfEsc(data.cover_image_url)}" style="width:100%;height:260px;object-fit:cover;border-radius:12px;margin-bottom:18px">`:'';
        const body=`${image}<h1>${pdfEsc(data.title||'')}</h1>${data.scripture_reference?`<div class="meta">${en?'Scripture':'Kinh Thánh'}: ${pdfEsc(data.scripture_reference)}</div>`:''}${data.key_verse_1925?`<div class="verse"><b>${pdfEsc(data.key_verse_reference||(en?'Key verse':'Câu gốc · Bản 1925'))}</b><br>${pdfEsc(data.key_verse_1925)}</div>`:''}${isStory?`<h2>${en?'Faith story':'Câu chuyện đức tin'}</h2><p>${pdfEsc(data.summary||'')}</p>${data.application?`<h2>${en?'Lesson & application':'Bài học & áp dụng'}</h2><p>${pdfEsc(data.application)}</p>`:''}`:`${data.summary?`<h2>${en?'Reflection':'Suy ngẫm'}</h2><p>${pdfEsc(data.summary)}</p>`:''}`}<h2>${en?'Prayer':'Lời cầu nguyện'}</h2><p>${pdfEsc(data.prayer||'')}</p><div class="footer-note">${en?'Theology Library · Faith Journey':'Thư Viện Thần Học · Hành trình đức tin'}</div>`;
        openPrintablePdf((data.title||'')+(en?' - English':' - Tiếng Việt'),body);
      }catch(e){box?.remove();alert(e.message||String(e))}
    });
  };

  // Rewrite the actual rendered buttons so they call the unique bilingual handlers.
  const oldDetailLang=detail;
  detail=function(){
    let h=oldDetailLang();
    h=h.replaceAll('onclick="exportLessonPdf()"','onclick="exportLessonPdfBilingual()"');
    h=h.replaceAll('onclick="exportQuizPdf()"','onclick="exportQuizPdfBilingual()"');
    h=h.replaceAll('onclick="exportQuizAnswerPdf()"','onclick="exportQuizAnswerPdfBilingual()"');
    return h;
  };

  const oldViewLang=view;
  view=function(){
    let h=oldViewLang();
    if(typeof h==='string'){
      h=h.replace(/onclick="exportDevotionalPdf\('faith_story'\)"/g,'onclick="exportDevotionalPdfBilingual(\'faith_story\')"');
      h=h.replace(/onclick="exportDevotionalPdf\('short_prayer'\)"/g,'onclick="exportDevotionalPdfBilingual(\'short_prayer\')"');
    }
    return h;
  };
})();
