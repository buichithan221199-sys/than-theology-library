// Production security hardening: attach admin PIN to protected endpoints, keep private data out of reader mode, and load a full admin snapshot only after verification.
(function(){
  const protectedSlugs=[
    '/functions/v1/theology-admin','/functions/v1/theology-process','/functions/v1/theology-process-standard',
    '/functions/v1/theology-scripture-lesson','/functions/v1/theology-devotional','/functions/v1/theology-image',
    '/functions/v1/theology-ai-cost','/functions/v1/theology-deepen-existing'
  ];
  const previousFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    try{
      const url=typeof input==='string'?input:(input?.url||'');
      if(protectedSlugs.some(s=>url.includes(s))&&typeof S!=='undefined'&&S.pin){
        const headers=new Headers(init?.headers||((typeof Request!=='undefined'&&input instanceof Request)?input.headers:undefined));
        if(!headers.has('x-admin-pin'))headers.set('x-admin-pin',S.pin);
        init={...init,headers};
      }
    }catch(e){console.warn('Security header attachment skipped',e)}
    return previousFetch(input,init);
  };

  const publicLoad=load;
  load=async function(){
    if(!S.pin)return publicLoad();
    const j=await adm('load_admin_snapshot');
    S.folders=Array.isArray(j.folders)?j.folders:[];
    S.lessons=Array.isArray(j.lessons)?j.lessons:[];
    S.questions=Array.isArray(j.questions)?j.questions:[];
    render();
  };

  const priorUnlock=unlock;
  unlock=function(afterUnlock){
    return priorUnlock(async()=>{
      try{await load()}catch(e){S.pin='';S.revealed={};await publicLoad();alert('Không tải được dữ liệu quản trị: '+(e?.message||String(e)));return}
      if(typeof afterUnlock==='function')afterUnlock();
    });
  };

  window.lockAdmin=async function(){
    S.pin='';S.revealed={};S.aiUsage=null;
    if(S.tab==='ai-cost')S.tab='home';
    try{await publicLoad()}catch(e){console.error(e);render()}
  };

  // When a protected creation action is clicked while locked, resume it automatically after unlock.
  if(typeof openImport==='function'){
    const priorOpenImport=openImport;
    openImport=function(){if(!S.pin){unlock(()=>priorOpenImport());return}return priorOpenImport()};
  }
  if(typeof window.openDevotionalComposer==='function'){
    const priorDevotionalComposer=window.openDevotionalComposer;
    window.openDevotionalComposer=function(kind){if(!S.pin){unlock(()=>priorDevotionalComposer(kind));return}return priorDevotionalComposer(kind)};
  }

  // Reader mode must never reveal or hint at the management PIN.
  if(typeof questionHtml==='function'){
    const priorQuestionHtml=questionHtml;
    questionHtml=function(q,i){
      let h=priorQuestionHtml(q,i);
      if(!S.pin)h=h.replace(/<button class="btn white" onclick="reveal\('[^']+'\)">Hiển thị đáp án đúng<\/button>/g,'<div class="muted" style="margin-top:9px">Đáp án chỉ hiển thị trong chế độ quản trị.</div>');
      return h;
    };
  }
  reveal=async function(id){
    if(!S.pin){unlock(()=>reveal(id));return}
    try{const r=await adm('reveal_answer',{question_id:id});S.revealed[id]=r.answer;render()}catch(e){alert(e?.message||String(e))}
  };
})();
