// Quiz workflow: preserve all questions and match answer keys by content, not question number.
(function(){
  const baseUploadRoutingModal=uploadRoutingModal;
  uploadRoutingModal=function(mode){
    baseUploadRoutingModal(mode);
    const ov=[...document.querySelectorAll('.overlay')].at(-1);if(!ov)return;
    const kind=ov.querySelector('#contentKind'),hint=ov.querySelector('#targetHint');
    if(kind && (mode==='images'||mode==='pdf')){
      if(![...kind.options].some(o=>o.value==='answer_key')){
        const opt=document.createElement('option');opt.value='answer_key';opt.textContent='Đáp án trắc nghiệm';kind.appendChild(opt);
      }
      kind.addEventListener('change',()=>{
        if(kind.value==='answer_key'&&hint)hint.textContent='Chọn bài học/bộ câu hỏi mà file đáp án này thuộc về. App sẽ đối chiếu theo nội dung câu hỏi và A/B/C/D, không dựa vào số thứ tự.';
      });
    }
  };

  const prevFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const isAi=url===AI && init?.body instanceof FormData;
    let answerKey=false,lessonId='';
    if(isAi){
      const fd=init.body,kind=String(fd.get('content_kind')||'');lessonId=String(fd.get('target_lesson_id')||'');answerKey=kind==='answer_key';
      if((kind==='answer_key'||kind==='questions')&&lessonId&&!fd.get('existing_questions_json')){
        const existing=S.questions.filter(q=>q.lesson_id===lessonId).map(q=>({id:q.id,sort_order:q.sort_order,question_text:q.question_text,options:q.options||{},scripture_reference:q.scripture_reference||''}));
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
  function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
  function sim(a,b){
    a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;
    const A=new Set(a.split(' ')),B=new Set(b.split(' '));let common=0;for(const x of A)if(B.has(x))common++;
    return common/Math.max(A.size,B.size,1);
  }
  function optionsScore(a,b){let hit=0,total=0;for(const k of ['A','B','C','D']){const x=a?.[k],y=b?.[k];if(x||y){total++;if(sim(x,y)>=0.72)hit++}}return total?hit/total:0}

  mediaQuestionsPreview=function(v,ctx){
    const qs=Array.isArray(v?.questions)?v.questions:[],lesson=S.lessons.find(x=>x.id===ctx.lessonId),transcript=v?.source_transcript||'';
    const d=overlay(`<div class="modal" style="width:min(980px,96vw)"><button class="x">×</button><h2>Xem trước đề trắc nghiệm</h2><p class="muted">Đã nhận diện <b>${qs.length}</b> câu cho <b>${esc(lesson?.title||'')}</b>. Câu hỏi và A/B/C/D được giữ theo file nguồn; file gốc sẽ được lưu để đối chiếu.</p>${qs.map((q,i)=>`<div class="question"><b>Câu ${esc(q.sort_order||i+1)}. ${esc(q.question_text||'')}</b><div class="opts">${quizOptions(q.options||{})}</div>${q.correct_option?`<div class="muted">Đáp án có trong nguồn: ${esc(q.correct_option)}${q.explanation?' · '+esc(q.explanation):''}</div>`:'<div class="muted">Chưa có đáp án — có thể tải file “Đáp án trắc nghiệm” sau.</div>'}</div>`).join('')||'<div class="error">Không nhận diện được câu hỏi nào.</div>'}<div class="modalActions"><button class="btn gold" id="save" ${qs.length?'':'disabled'}>Lưu đủ ${qs.length} câu + file gốc</button></div></div>`);
    d.querySelector('#save')?.addEventListener('click',async()=>{const b=d.querySelector('#save');b.disabled=true;b.textContent='Đang lưu…';try{for(let i=0;i<qs.length;i++){const z=qs[i],o=Array.isArray(z.options)?Object.fromEntries(['A','B','C','D'].map((k,j)=>[k,z.options[j]||''])):(z.options||{});const payload={question:{lesson_id:ctx.lessonId,question_text:z.question_text||'',options:o,sort_order:Number(z.sort_order||i+1),scripture_reference:z.scripture_reference||''}};if(z.correct_option)payload.answer={correct_option:z.correct_option,explanation:z.explanation||'',scripture_reference:z.scripture_reference||''};await adm('save_question',payload)}await saveOriginalAttachments(ctx.lessonId,ctx.files,'question_source');await saveTranscriptAttachment(ctx.lessonId,transcript,'nguon-de-trac-nghiem','question_source');d.remove();await load();go('quiz')}catch(e){b.disabled=false;b.textContent=`Lưu đủ ${qs.length} câu + file gốc`;alert(e?.message||String(e))}});
  };

  function mediaAnswerKeyPreview(v,ctx){
    const answers=Array.isArray(v?.questions)?v.questions:[],existing=S.questions.filter(q=>q.lesson_id===ctx.lessonId),lesson=S.lessons.find(x=>x.id===ctx.lessonId);
    const used=new Set();const matched=[];const uncertain=[];
    for(const a of answers){
      let best=null,bestScore=0;
      for(const q of existing){if(used.has(q.id))continue;const qScore=sim(a.question_text,q.question_text),oScore=optionsScore(a.options||{},q.options||{});const score=qScore*0.82+oScore*0.18;if(score>bestScore){bestScore=score;best=q}}
      if(best&&bestScore>=0.78&&a.correct_option){used.add(best.id);matched.push({a,q:best,score:bestScore})}
      else if(a.correct_option)uncertain.push(a);
    }
    const d=overlay(`<div class="modal" style="width:min(980px,96vw)"><button class="x">×</button><h2>Xem trước đáp án trắc nghiệm</h2><p class="muted">Bài: <b>${esc(lesson?.title||'')}</b> · Đã ghép chắc chắn <b>${matched.length}</b> đáp án theo nội dung câu hỏi${uncertain.length?` · <b>${uncertain.length}</b> mục cần kiểm tra`:''}. Số thứ tự không được dùng để quyết định ghép.</p>${matched.map(({a,q,score})=>`<div class="question"><b>${esc(q.question_text||'')}</b><div style="margin-top:8px"><b>Đáp án: ${esc(a.correct_option)}</b>${a.explanation?`<div class="muted" style="margin-top:5px">${esc(a.explanation)}</div>`:''}<div class="muted" style="margin-top:4px">Độ khớp nội dung: ${Math.round(score*100)}%</div></div></div>`).join('')||'<div class="error">Chưa ghép chắc chắn được đáp án nào. Hãy kiểm tra file đáp án và đúng bài học đã chọn.</div>'}<div class="modalActions"><button class="btn gold" id="save" ${matched.length?'':'disabled'}>Cập nhật ${matched.length} đáp án + lưu file gốc</button></div></div>`);
    d.querySelector('#save')?.addEventListener('click',async()=>{const b=d.querySelector('#save');b.disabled=true;b.textContent='Đang cập nhật…';try{for(const {a,q} of matched)await adm('save_answer',{question_id:q.id,answer:{correct_option:a.correct_option,explanation:a.explanation||'',scripture_reference:a.scripture_reference||q.scripture_reference||''}});await saveOriginalAttachments(ctx.lessonId,ctx.files,'answer_key_source');await saveTranscriptAttachment(ctx.lessonId,v?.source_transcript||'','nguon-dap-an-trac-nghiem','answer_key_source');d.remove();await load();alert(`Đã cập nhật ${matched.length} đáp án.`);go('quiz')}catch(e){b.disabled=false;b.textContent=`Cập nhật ${matched.length} đáp án + lưu file gốc`;alert(e?.message||String(e))}});
  }

  const prevPreview=previewResult;
  previewResult=function(v,ctx){
    if(v?.__content_kind==='answer_key')return mediaAnswerKeyPreview(v,{...ctx,lessonId:v.__target_lesson_id||ctx.lessonId});
    return prevPreview(v,ctx);
  };
})();