// Admin tools for manual quiz answer editing and reviewing all correct answers.
(function(){
  function selectedLetters(v){return [...new Set(String(v||'').toUpperCase().match(/[A-Z]/g)||[])].sort()}
  function answerText(v){const a=selectedLetters(v);return a.length?a.join(', '):'Chưa có đáp án'}
  function optionKeys(o){return Object.keys(o||{}).filter(k=>/^[A-Z]$/.test(String(k).toUpperCase())).map(k=>String(k).toUpperCase()).sort()}
  function nextOptionKey(o){const keys=optionKeys(o);for(let i=65;i<=90;i++){const k=String.fromCharCode(i);if(!keys.includes(k))return k}return ''}

  async function getAnswerSafe(questionId){
    if(S.revealed?.[questionId])return S.revealed[questionId];
    try{const r=await adm('reveal_answer',{question_id:questionId});if(r?.answer){S.revealed[questionId]=r.answer;return r.answer}}catch{}
    return null;
  }

  function optionRow(k,text,checked=false){
    return `<div class="opt quiz-edit-option" data-option-row="${k}" style="display:grid;grid-template-columns:auto 52px 1fr auto;gap:9px;align-items:center">
      <input type="checkbox" data-answer="${k}" ${checked?'checked':''} style="width:auto">
      <b>${k}.</b>
      <input data-option-text="${k}" value="${esc(text||'')}" placeholder="Nội dung lựa chọn ${k}" style="margin:0">
      <button type="button" class="btn white" data-remove-option="${k}" title="Xóa lựa chọn">×</button>
    </div>`;
  }

  window.editQuizAnswer=async function(questionId){
    if(!S.pin){unlock();return}
    const q=S.questions.find(x=>x.id===questionId);if(!q)return;
    const current=await getAnswerSafe(questionId);const checked=new Set(selectedLetters(current?.correct_option));
    const options={...(q.options||{})};
    const keys=optionKeys(options);
    const d=overlay(`<div class="modal" style="width:min(820px,96vw)"><button class="x">×</button><h2>Chỉnh sửa lựa chọn & đáp án</h2><p style="font-weight:800;line-height:1.55">${esc(q.question_text||'')}</p>
      <div class="muted" style="margin-bottom:8px">Bạn có thể sửa nội dung lựa chọn, thêm E/F/G/H… và đánh dấu nhiều đáp án đúng.</div>
      <div class="opts" id="manualOptions">${keys.map(k=>optionRow(k,options[k],checked.has(k))).join('')}</div>
      <button type="button" class="btn white" id="addManualOption">+ Thêm lựa chọn</button>
      <div class="field"><label>Lời giải / ghi chú</label><textarea id="manualExplanation" rows="5" placeholder="Có thể để trống nếu chưa cần lời giải.">${esc(current?.explanation||'')}</textarea></div>
      <div id="manualErr"></div><div class="modalActions"><button class="btn gold" id="manualSave">Lưu thay đổi</button></div></div>`);

    const optionsBox=d.querySelector('#manualOptions');
    const bindRemove=()=>d.querySelectorAll('[data-remove-option]').forEach(btn=>btn.onclick=()=>{const k=btn.dataset.removeOption;const row=d.querySelector(`[data-option-row="${k}"]`);row?.remove()});
    bindRemove();
    d.querySelector('#addManualOption').onclick=()=>{
      const used={};d.querySelectorAll('[data-option-row]').forEach(r=>used[r.dataset.optionRow]='1');const k=nextOptionKey(used);
      if(!k){d.querySelector('#manualErr').innerHTML='<div class="error">Đã dùng hết ký tự A–Z.</div>';return}
      optionsBox.insertAdjacentHTML('beforeend',optionRow(k,'',false));bindRemove();
      d.querySelector(`[data-option-text="${k}"]`)?.focus();
    };

    d.querySelector('#manualSave').onclick=async()=>{
      const newOptions={};
      d.querySelectorAll('[data-option-row]').forEach(row=>{const k=row.dataset.optionRow;const val=d.querySelector(`[data-option-text="${k}"]`)?.value.trim()||'';if(val)newOptions[k]=val});
      const picks=[...d.querySelectorAll('[data-answer]:checked')].map(x=>x.dataset.answer).filter(k=>newOptions[k]);
      if(!Object.keys(newOptions).length){d.querySelector('#manualErr').innerHTML='<div class="error">Câu hỏi phải có ít nhất một lựa chọn.</div>';return}
      if(!picks.length){d.querySelector('#manualErr').innerHTML='<div class="error">Hãy chọn ít nhất một đáp án đúng.</div>';return}
      const b=d.querySelector('#manualSave');b.disabled=true;b.textContent='Đang lưu…';
      try{
        await adm('save_question',{question:{id:q.id,options:newOptions}});
        const answer={correct_option:picks.join(', '),explanation:d.querySelector('#manualExplanation').value.trim(),scripture_reference:q.scripture_reference||''};
        await adm('save_answer',{question_id:q.id,answer});
        S.revealed[q.id]=answer;d.remove();await load();S.revealed[q.id]=answer;render();
      }catch(e){b.disabled=false;b.textContent='Lưu thay đổi';d.querySelector('#manualErr').innerHTML='<div class="error">'+esc(e?.message||String(e))+'</div>'}
    };
  };

  window.showAllQuizAnswers=async function(){
    if(!S.pin){unlock();return}
    const d=overlay(`<div class="modal" style="width:min(1050px,97vw)"><button class="x">×</button><h2>Toàn bộ đáp án đúng</h2><p class="muted">Đang tải đáp án…</p><div id="allAnswersBody"></div></div>`);const body=d.querySelector('#allAnswersBody');
    const rows=await Promise.all(S.questions.map(async q=>({q,a:await getAnswerSafe(q.id)})));
    const missing=rows.filter(x=>!selectedLetters(x.a?.correct_option).length).length;d.querySelector('.muted').textContent=`${rows.length} câu · ${missing} câu chưa có đáp án. Một câu có thể có nhiều đáp án đúng và lựa chọn A–Z.`;
    body.innerHTML=rows.map(({q,a},i)=>{const lesson=S.lessons.find(l=>l.id===q.lesson_id);const has=selectedLetters(a?.correct_option).length>0;return `<div class="question" style="${has?'':'border-color:#d49b63;background:#fffaf4'}"><div class="muted">${esc(lesson?.title||'Không rõ bài học')}</div><b>Câu ${esc(q.sort_order||i+1)}. ${esc(q.question_text||'')}</b><div style="margin-top:8px"><b>${has?'Đáp án: '+esc(answerText(a.correct_option)):'Chưa có đáp án'}</b></div>${a?.explanation?`<div class="muted" style="margin-top:5px">${esc(a.explanation)}</div>`:''}<div style="margin-top:10px"><button class="btn white" onclick="document.querySelector('.overlay')?.remove();editQuizAnswer('${q.id}')">Sửa lựa chọn & đáp án</button></div></div>`}).join('');
  };

  const baseQuestionHtml=questionHtml;
  questionHtml=function(q,i){
    const html=baseQuestionHtml(q,i);if(!S.pin)return html;
    const marker='</div>';const admin=`<div style="margin-top:9px"><button class="btn white" onclick="editQuizAnswer('${q.id}')">✎ Sửa lựa chọn & đáp án</button></div>`;
    const p=html.lastIndexOf(marker);return p>=0?html.slice(0,p)+admin+html.slice(p):html+admin;
  };

  const baseQuizList=quizList;
  quizList=function(){
    const html=baseQuizList();if(!S.pin)return html;
    const toolbar=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn gold" onclick="showAllQuizAnswers()">Hiển thị toàn bộ đáp án đúng</button></div>`;
    return html.replace('<h2 class="title" style="margin-top:0">Câu hỏi & Đáp án</h2>','<h2 class="title" style="margin-top:0">Câu hỏi & Đáp án</h2>'+toolbar);
  };
})();