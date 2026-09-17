// Production security hardening: attach admin PIN to protected AI endpoints and never expose a PIN hint in reader UI.
(function(){
  const protectedSlugs=[
    '/functions/v1/theology-admin',
    '/functions/v1/theology-process',
    '/functions/v1/theology-process-standard',
    '/functions/v1/theology-scripture-lesson',
    '/functions/v1/theology-devotional',
    '/functions/v1/theology-image',
    '/functions/v1/theology-ai-cost',
    '/functions/v1/theology-deepen-existing'
  ];
  const previousFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    try{
      const url=typeof input==='string'?input:(input?.url||'');
      if(protectedSlugs.some(s=>url.includes(s)) && typeof S!=='undefined' && S.pin){
        const headers=new Headers(init?.headers||((typeof Request!=='undefined'&&input instanceof Request)?input.headers:undefined));
        if(!headers.has('x-admin-pin'))headers.set('x-admin-pin',S.pin);
        init={...init,headers};
      }
    }catch(e){console.warn('Security header attachment skipped',e)}
    return previousFetch(input,init);
  };

  // Reader mode must never reveal or hint at the management PIN.
  if(typeof questionHtml==='function'){
    const priorQuestionHtml=questionHtml;
    questionHtml=function(q,i){
      let h=priorQuestionHtml(q,i);
      if(!S.pin){
        h=h.replace(/<button class="btn white" onclick="reveal\('[^']+'\)">Hiển thị đáp án đúng<\/button>/g,'<div class="muted" style="margin-top:9px">Đáp án chỉ hiển thị trong chế độ quản trị.</div>');
      }
      return h;
    };
  }

  reveal=async function(id){
    if(!S.pin){unlock();return}
    try{
      const r=await adm('reveal_answer',{question_id:id});
      S.revealed[id]=r.answer;
      render();
    }catch(e){alert(e?.message||String(e))}
  };
})();
