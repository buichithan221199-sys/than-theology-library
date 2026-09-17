// Ephemeral media policy: audio and uploaded images are used only for AI processing and are not retained in Storage.
(function(){
  const AUDIO_ENDPOINT=SB+'/functions/v1/theology-audio';
  const MAX_AUDIO_BYTES=128*1024*1024;
  const isEphemeralMode=mode=>mode==='audio'||mode==='images';

  // Route long audio to the dedicated transcription pipeline and reject oversized uploads before sending.
  const fetchBeforeEphemeral=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    try{
      const url=typeof input==='string'?input:(input?.url||'');
      if(url===AI && init?.body instanceof FormData && init.body.get('mode')==='audio'){
        const file=(init.body.get('file')||init.body.getAll('files')[0]);
        if(file instanceof File && file.size>MAX_AUDIO_BYTES){
          return new Response(JSON.stringify({error:'File ghi âm lớn hơn 128 MB. Bài học 1,5–2 giờ nên dùng M4A hoặc MP3 để giữ file dưới 128 MB.'}),{status:413,headers:{'Content-Type':'application/json; charset=utf-8'}});
        }
        input=AUDIO_ENDPOINT;
      }
    }catch(e){console.warn('Audio routing check skipped',e)}
    return fetchBeforeEphemeral(input,init);
  };

  // Clarify retention policy in the upload UI.
  if(typeof uploadRoutingModal==='function'){
    const uploadRoutingBeforeEphemeral=uploadRoutingModal;
    uploadRoutingModal=function(mode){
      const r=uploadRoutingBeforeEphemeral(mode);
      if(isEphemeralMode(mode)){
        const overlays=[...document.querySelectorAll('.overlay')],d=overlays[overlays.length-1];
        const drop=d?.querySelector('#drop');
        if(drop){
          const note=document.createElement('div');
          note.className='muted';
          note.style.cssText='margin-top:10px;line-height:1.5';
          note.innerHTML=mode==='audio'
            ?'<b>Audio dài:</b> hỗ trợ bài học khoảng 1,5–2 giờ. Nên dùng M4A/MP3, tối đa 128 MB. File chỉ dùng để phiên âm và sẽ không được lưu vào thư viện.'
            :'<b>Ảnh tạm thời:</b> ảnh chỉ được dùng để AI đọc nội dung và sẽ không được lưu vào thư viện sau khi xử lý.';
          drop.insertAdjacentElement('afterend',note);
        }
      }
      return r;
    };
  }

  function valueOr(existing,next){return next!==undefined&&next!==null&&next!==''?next:existing}
  function arrayOr(existing,next){return Array.isArray(next)&&next.length?next:(Array.isArray(existing)?existing:[])}

  function previewEphemeralExistingLesson(v,ctx){
    const old=S.lessons.find(x=>x.id===ctx.lessonId);if(!old)return;
    const d=overlay(`<div class="modal" style="width:min(920px,96vw)"><button class="x">×</button><h2>Xem trước nội dung tổng hợp</h2><p class="muted">File ${ctx.mode==='audio'?'audio':'hình ảnh'} sẽ <b>không được lưu</b>. Chỉ nội dung tổng hợp bên dưới được cập nhật vào bài học hiện tại.</p><div class="field"><label>Tựa đề</label><input id="epTitle" value="${esc(valueOr(old.title,v?.title||''))}"></div><div class="field"><label>Tóm tắt</label><textarea id="epSummary" rows="7">${esc(valueOr(old.summary,v?.summary||''))}</textarea></div><div id="epErr"></div><div class="modalActions"><button class="btn gold" id="epSave">Cập nhật bài học</button></div></div>`);
    d.querySelector('#epSave').onclick=async()=>{
      const b=d.querySelector('#epSave');b.disabled=true;b.textContent='Đang lưu…';
      try{
        const lesson={
          id:old.id,
          folder_id:old.folder_id,
          title:d.querySelector('#epTitle').value.trim()||old.title,
          subtitle:valueOr(old.subtitle,v?.subtitle||''),
          scripture_reference:valueOr(old.scripture_reference,v?.scripture_reference||''),
          key_verse_reference:valueOr(old.key_verse_reference,v?.key_verse_reference||''),
          key_verse_1925:valueOr(old.key_verse_1925,v?.key_verse_1925||''),
          teacher:valueOr(old.teacher,v?.teacher||''),
          lesson_date:old.lesson_date||null,
          summary:d.querySelector('#epSummary').value.trim(),
          introduction:valueOr(old.introduction,v?.introduction||''),
          background:valueOr(old.background,v?.background||''),
          transition_text:valueOr(old.transition_text,v?.transition_text||''),
          main_content:arrayOr(old.main_content,v?.main_content),
          application:valueOr(old.application,v?.application||''),
          reflection_questions:arrayOr(old.reflection_questions,v?.reflection_questions),
          prayer:valueOr(old.prayer,v?.prayer||''),
          tags:arrayOr(old.tags,v?.tags),
          source_kind:old.source_kind||ctx.mode,
          is_published:old.is_published!==false
        };
        await adm('save_lesson',{lesson});
        d.remove();await load();S.selected=S.lessons.find(x=>x.id===old.id)||null;S.tab=S.selected?'detail':'lessons';render();
      }catch(e){b.disabled=false;b.textContent='Cập nhật bài học';d.querySelector('#epErr').innerHTML='<div class="error">'+esc(e?.message||String(e))+'</div>'}
    };
  }

  // Strip binary files and transcript text before any save path can persist them.
  if(typeof previewResult==='function'){
    const previewBeforeEphemeral=previewResult;
    previewResult=function(v,ctx){
      if(!ctx||!isEphemeralMode(ctx.mode))return previewBeforeEphemeral(v,ctx);
      const cleanV={...(v||{}),source_transcript:''};
      const cleanCtx={...ctx,files:[]};
      if(cleanCtx.targetType==='lesson'&&cleanCtx.lessonId)return previewEphemeralExistingLesson(cleanV,cleanCtx);
      return previewBeforeEphemeral(cleanV,cleanCtx);
    };
  }

  // Scripture-source uploads from audio/images also stay ephemeral: save only the recognized reference, never the binary or transcript attachment.
  if(typeof previewScriptureSource==='function'){
    previewScriptureSource=function(v,ctx){
      const lesson=S.lessons.find(x=>x.id===ctx.lessonId);if(!lesson)return;
      const d=overlay(`<div class="modal"><button class="x">×</button><h2>Xem trước nguồn Kinh Thánh</h2><p class="muted">File nguồn sẽ không được lưu. Chỉ tham chiếu Kinh Thánh được cập nhật vào bài học.</p><div class="field"><label>Phân đoạn nhận diện</label><input id="epSr" value="${esc(v?.scripture_reference||lesson.scripture_reference||'')}"></div><div class="modalActions"><button class="btn gold" id="epSrSave">Lưu tham chiếu</button></div></div>`);
      d.querySelector('#epSrSave').onclick=async()=>{try{await adm('save_lesson',{lesson:{id:lesson.id,scripture_reference:d.querySelector('#epSr').value.trim()||lesson.scripture_reference}});d.remove();await load();S.selected=S.lessons.find(x=>x.id===lesson.id)||null;S.tab='detail';render()}catch(e){alert(e?.message||String(e))}};
    };
  }
})();
