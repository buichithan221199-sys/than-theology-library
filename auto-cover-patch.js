// Automatically create a subject-based cover image whenever a normal lesson is saved without one.
(function(){
  const IMAGE_ENDPOINT=SB+'/functions/v1/theology-image';
  const previousAdm=adm;
  adm=async function(action,payload={},pin=S.pin){
    const result=await previousAdm(action,payload,pin);
    try{
      if(action==='save_lesson'&&result?.lesson?.id&&!result.lesson.cover_image_url&&pin){
        const kind=payload?.lesson?.source_kind||result.lesson.source_kind||'lesson';
        if(kind!=='faith_story'&&kind!=='short_prayer'){
          const l={...payload?.lesson,...result.lesson};
          const r=await fetch(IMAGE_ENDPOINT,{method:'POST',headers:{'content-type':'application/json','x-admin-pin':pin},body:JSON.stringify({lesson_id:l.id,title:l.title||'',scripture_reference:l.scripture_reference||'',summary:l.summary||'',kind})});
          const j=await r.json();
          if(r.ok&&j.url)result.lesson.cover_image_url=j.url;
          else console.warn('Auto cover:',j?.error||'Không tạo được ảnh');
        }
      }
    }catch(e){console.warn('Auto cover generation skipped',e)}
    return result;
  };
})();
