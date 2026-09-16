// Admin tools for manual quiz answer editing and reviewing all correct answers.
(function(){
  function selectedLetters(v){return [...new Set(String(v||'').toUpperCase().match(/[A-Z]/g)||[])].sort()}
  function answerText(v){const a=selectedLetters(v);return a.length?a.join(', '):'Chưa có đáp án'}
  function choiceKeys(q){
    const o=q?.options||{};
    const existing=Object.keys(o).filter(k=>/^[A-Z]$/i.test(k)).map(k=>k.toUpperCase());
    const standard=['A','B','C','D','E','F','G','H'];
    return [...new Set([...standard,...existing])].sort();
  }

  async function getAnswerSafe(questionId){
    if(S.revealed?.[questionId])return S.revealed[questionId];
    try{const r=await adm('reveal_answer',{question_id:questionId});if(r?.answer){S.revealed[questionId]=r.answer;return r.answer}}catch{}
    return null;
  }

  window.editQuizAnswer=async function(questionId){
    if(!S.pin){unlock();return}
    const q=S.questions.find(x=>x.id===questionId);if(!q)return;
    const current=await getAnswerSafe(questionId);const checked=new Set(selectedLetters(current?.correct_option));const o=q.options||{};const keys=choiceKeys(q);
    const d=overlay(`<div class="modal" style="width:min(820px,96vw)"><button class="x">×</button><h2>Chỉnh sửa đáp án</h2><p style="font-weight:800;line-height:1.55">${esc(q.question_text||'')}</p><p class="muted">Có thể chọn một hoặc nhiều đáp án đúng. Hỗ trợ A–H và các ký tự lựa chọn khác nếu câu hỏi có.</p><div class="opts">${keys.map(k=>`<label class="opt" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;${o[k]?'':'opacity:.72'}"><input type="checkbox" data-answer="${k}" ${checked.has(k)?'checked':''} style="width:auto;margin-top:4px"><span><b>${k}.</b> ${o[k]?esc(o[k]):'<span class="muted">Không có nội dung lựa chọn trong dữ liệu</span>'}</span></label>`).join('')}</div><div class="field"><label>Lời giải / ghi chú</label><textarea id="manualExplanation" rows="5" placeholder="Có thể để trống nếu chưa cần lời giải.">${esc(current?.explanation||'')}</textarea></div><div id="manualErr"></div><div class="modalActions"><button class="btn gold" id="manualSave">Lưu đáp án</button></div></div>`);
    d.querySelector('#manualSave').onclick=async()=>{const picks=[...d.querySelectorAll('[data-answer]:checked')].map(x=>x.dataset.answer);if(!picks.length){d.querySelector('#manualErr').innerHTML='<div class="error">Hãy chọn ít nhất một đáp án đúng.</div>';return}const b=d.querySelector('#manualSave');b.disabled=true;b.textContent='Đang lưu…';try{const answer={correct_option:picks.join(', '),explanation:d.querySelector('#manualExplanation').value.trim(),scripture_reference:q.scripture_reference||''};await adm('save_answer',{question_id:q.id,answer});S.revealed[q.id]=answer;d.remove();render()}catch(e){b.disabled=false;b.textContent='Lưu đáp án';d.querySelector('#manualErr').innerHTML='<div class="error">'+esc(e?.message||String(e))+'</div>'}};
  };

  window.showAllQuizAnswers=async function(){
    if(!S.pin){unlock();return}
    const d=overlay(`<div class="modal" style="width:min(1050px,97vw)"><button class="x">×</button><h2>Toàn bộ đáp án đúng</h2><p class="muted">Đang tải đáp án…</p><div id="allAnswersBody"></div></div>`);const body=d.querySelector('#allAnswersBody');
    const rows=await Promise.all(S.questions.map(async q=>({q,a:await getAnswerSafe(q.id)})));
    const missing=rows.filter(x=>!selectedLetters(x.a?.correct_option).length).length;d.querySelector('.muted').textContent=`${rows.length} câu · ${missing} câu chưa có đáp án. Một câu có thể có nhiều đáp án đúng, kể cả E/F/G/H nếu đề có.`;
    body.innerHTML=rows.map(({q,a},i)=>{const lesson=S.lessons.find(l=>l.id===q.lesson_id);const has=selectedLetters(a?.correct_option).length>0;return `<div class="question" style="${has?'':'border-color:#d49b63;background:#fffaf4'}"><div class="muted">${esc(lesson?.title||'Không rõ bài học')}</div><b>Câu ${esc(q.sort_order||i+1)}. ${esc(q.question_text||'')}</b><div style="margin-top:8px"><b>${has?'Đáp án: '+esc(answerText(a.correct_option)):'Chưa có đáp án'}</b></div>${a?.explanation?`<div class="muted" style="margin-top:5px">${esc(a.explanation)}</div>`:''}<div style="margin-top:10px"><button class="btn white" onclick="document.querySelector('.overlay')?.remove();editQuizAnswer('${q.id}')">Sửa đáp án</button></div></div>`}).join('');
  };

  const baseQuestionHtml=questionHtml;
  questionHtml=function(q,i){
    const html=baseQuestionHtml(q,i);if(!S.pin)return html;
    const marker='</div>';const admin=`<div style="margin-top:9px"><button class="btn white" onclick="editQuizAnswer('${q.id}')">✎ Sửa đáp án</button></div>`;
    const p=html.lastIndexOf(marker);return p>=0?html.slice(0,p)+admin+html.slice(p):html+admin;
  };

  const baseQuizList=quizList;
  quizList=function(){
    const html=baseQuizList();if(!S.pin)return html;
    const toolbar=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn gold" onclick="showAllQuizAnswers()">Hiển thị toàn bộ đáp án đúng</button></div>`;
    return html.replace('<h2 class="title" style="margin-top:0">Câu hỏi & Đáp án</h2>','<h2 class="title" style="margin-top:0">Câu hỏi & Đáp án</h2>'+toolbar);
  };
})();