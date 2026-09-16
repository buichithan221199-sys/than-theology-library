// Quiz workflow: exact question extraction, unlimited question count, and separate answer-key upload/matching.
(function(){
  const baseUploadRoutingModal=uploadRoutingModal;
  uploadRoutingModal=function(mode){
    baseUploadRoutingModal(mode);
    const ov=[...document.querySelectorAll('.overlay')].at(-1);if(!ov)return;
    const kind=ov.querySelector('#contentKind'),hint=ov.querySelector('#targetHint');
    if(kind && (mode==='images'||mode==='pdf')){
      const opt=document.createElement('option');opt.value='answer_key';opt.textContent='Đáp án trắc nghiệm';kind.appendChild(opt);
      kind.addEventListener('change',()=>{if(kind.value==='answer_key'&&hint)hint.textContent='Chọn bài học/bộ câu hỏi mà file đáp án này thuộc về. App sẽ đối chiếu theo số câu và nội dung trước khi cập nhật đáp án.'});
    }
  };

  // Add the existing quiz to AI requests so an answer key can be matched safely.
  const prevFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const isAi=url===AI && init?.body instanceof FormData;
    let answerKey=false, lessonId='';
    if(isAi){
      const fd=init.body,kind=String(fd.get('content_kind')||'');lessonId=String(fd.get('target_lesson_id')||'');answerKey=kind==='answer_key';
      if((kind==='answer_key'||kind==='questions')&&lessonId&&!fd.get('existing_questions_json')){
        const existing=S.questions.filter(q=>q.lesson_id===lessonId).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(q=>({id:q.id,sort_order:q.sort_order,question_text:q.question_text,options:q.options||{},scripture_reference:q.scripture_reference||''}));
        fd.append('existing_questions_json',JSON.stringify(existing));
      }
    }
    const r=await prevFetch(input,init);
    if(answerKey&&r.ok){
      try{const j=await r.clone().json();if(j?.lesson){j.lesson.__content_kind='answer_key';j.lesson.__target_lesson_id=lessonId;}return new Response(JSON.stringify(j),{status:r.status,statusText:r.statusText,headers:new Headers(r.headers)})}catch{}
    }
    return r;
  };

  function quizOptions(o){return ['A','B','C','D'].map(k=>`<div class="opt"><b>${k}.</b> ${esc(o?.[k]||'')}</div>`).join('')}

  mediaQuestionsPreview=function(v,ctx){
    const qs=Array.isArray(v?.questions)?v.questions:[],lesson=S.lessons.find(x=>x.id===ctx.lessonId),transcript=v?.source_transcript||'';
    const d=overlay(`<div class="modal" style="width:min(980px,96vw)"><button class="x">×</button><h2>Xem trước đề trắc nghiệm</h2><p class="muted">Đã nhận diện <b>${qs.length}</b> câu cho <b>${esc(lesson?.title||'')}</b>. Câu hỏi và A/B/C/D được giữ theo file nguồn; file gốc sẽ được lưu để đối chiếu.</p>${qs.map((q,i)=>`<div class="question"><b>Câu ${esc(q.sort_order||i+1)}. ${esc(q.question_text||'')}</b><div class="opts">${quizOptions(q.options||{})}</div>${q.correct_option?`<div class="muted">Đáp án có trong nguồn: ${esc(q.correct_option)}${q.explanation?' · '+esc(q.explanation):''}</div>`:'<div class="muted">Chưa có đáp án — có thể tải file “Đáp án trắc nghiệm” sau.</div>'}</div>`).join('')||'<div class="error">Không nhận diện được câu hỏi nào.</div>'}<div class="modalActions"><button class="btn gold" id="save" ${qs.length?'':'disabled'}>Lưu đủ ${qs.length} câu + file gốc</button></div></div>`);
    d.querySelector('#save')?.addEventListener('click',async()=>{const b=d.querySelector('#save');b.disabled=true;b.textContent='Đang lưu…';try{for(let i=0;i<qs.length;i++){const z=qs[i],o=Array.isArray(z.options)?Object.fromEntries(['A','B','C','D'].map((k,j)=>[k,z.options[j]||''])):(z.options||{});const payload={question:{lesson_id:ctx.lessonId,question_text:z.question_text||'',options:o,sort_order:Number(z.sort_order||i+1),scripture_reference:z.scripture_reference||''}};if(z.correct_option)payload.answer={correct_option:z.correct_option,explanation:z.explanation||'',scripture_reference:z.scripture_reference||''};await adm('save_question',payload)}await saveOriginalAttachments(ctx.lessonId,ctx.files,'question_source');await saveTranscriptAttachment(ctx.lessonId,transcript,'nguon-de-trac-nghiem','question_source');d.remove();await load();go('quiz')}catch(e){b.disabled=false;b.textContent=`Lưu đủ ${qs.length} câu + file gốc`;alert(e.message)}});
  };

  function mediaAnswerKeyPreview(v,ctx){
    const answers=Array.isArray(v?.questions)?v.questions:[],existing=S.questions.filter(q=>q.lesson_id===ctx.lessonId).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)),lesson=S.lessons.find(x=>x.id===ctx.lessonId);
    const matched=answers.map(a=>({a,q:existing.find(q=>Number(q.sort_order)===Number(a.sort_order))})).filter(x=>x.q&&x.a.correct_option);
    const d=overlay(`<div class="modal" style="width:min(980px,96vw)"><button class="x">×</button><h2>Xem trước đáp án trắc nghiệm</h2><p class="muted">Bài: <b>${esc(lesson?.title||'')}</b> · File có ${answers.length} mục đáp án · Ghép chắc chắn được <b>${matched.length}</b> câu.</p>${matched.map(({a,q})=>`<div class="question"><b>Câu ${esc(q.sort_order)}. ${esc(q.question_text||'')}</b><div style="margin-top:8px"><b>Đáp án: ${esc(a.correct_option)}</b>${a.explanation?`<div class="muted" style="margin-top:5px">${esc(a.explanation)}</div>`:''}</div></div>`).join('')||'<div class="error">Chưa ghép chắc chắn được đáp án nào. Hãy kiểm tra file đáp án và đúng bài học đã chọn.</div>'}<div class="modalActions"><button class="btn gold" id="save" ${matched.length?'':'disabled'}>Cập nhật ${matched.length} đáp án + lưu file gốc</button></div></div>`);
    d.querySelector('#save')?.addEventListener('click',async()=>{const b=d.querySelector('#save');b.disabled=true;b.textContent='Đang cập nhật…';try{for(const {a,q} of matched)await adm('save_answer',{question_id:q.id,answer:{correct_option:a.correct_option,explanation:a.explanation||'',scripture_reference:a.scripture_reference||q.scripture_reference||''}});await saveOriginalAttachments(ctx.lessonId,ctx.files,'answer_key_source');await saveTranscriptAttachment(ctx.lessonId,v?.source_transcript||'','nguon-dap-an-trac-nghiem','answer_key_source');d.remove();await load();alert(`Đã cập nhật ${matched.length} đáp án.`);go('quiz')}catch(e){b.disabled=false;b.textContent=`Cập nhật ${matched.length} đáp án + lưu file gốc`;alert(e.message)}});
  }

  const prevPreview=previewResult;
  previewResult=function(v,ctx){
    if(v?.__content_kind==='answer_key')return mediaAnswerKeyPreview(v,{...ctx,lessonId:v.__target_lesson_id||ctx.lessonId});
    return prevPreview(v,ctx);
  };
})();