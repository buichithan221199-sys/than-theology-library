// Ephemeral media policy: audio and uploaded images are used only for AI processing and are not retained in Storage.
(function(){
  const AUDIO_ENDPOINT=SB+'/functions/v1/theology-audio';
  const MAX_AUDIO_BYTES=128*1024*1024;
  const AUDIO_CHUNK_BYTES=4*1024*1024;
  const isEphemeralMode=mode=>mode==='audio'||mode==='images';

  function getHeader(init,name){try{return new Headers(init?.headers||{}).get(name)||''}catch{return ''}}
  async function cleanupTempAudio(paths,pin){
    if(!paths?.length)return;
    try{await fetchBeforeEphemeral(AUDIO_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':pin||S.pin||''},body:JSON.stringify({action:'cleanup',paths})})}catch(e){console.warn('Không cleanup được audio tạm',e)}
  }
  async function uploadAudioChunks(file,pin){
    const total=Math.ceil(file.size/AUDIO_CHUNK_BYTES),paths=[];
    try{
      for(let base=0;base<total;base+=3){
        const indexes=[];for(let i=base;i<Math.min(total,base+3);i++)indexes.push(i);
        const batch=await Promise.all(indexes.map(async i=>{
          const start=i*AUDIO_CHUNK_BYTES,end=Math.min(file.size,start+AUDIO_CHUNK_BYTES);
          const label=`tmp_audio_${Date.now()}_${String(i+1).padStart(3,'0')}.part`;
          const up=await adm('create_upload_url',{file_name:label});
          const put=await fetchBeforeEphemeral(up.signed_url,{method:'PUT',headers:{'content-type':file.type||'audio/mp4'},body:file.slice(start,end,file.type||'audio/mp4')});
          if(!put.ok)throw new Error(`Không tải được mảnh audio ${i+1}/${total}.`);
          return {i,path:up.path};
        }));
        batch.sort((a,b)=>a.i-b.i).forEach(x=>paths[x.i]=x.path);
        window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'upload',done:Math.min(total,base+3),total}}));
      }
      return paths;
    }catch(e){await cleanupTempAudio(paths.filter(Boolean),pin);throw e}
  }

  // Long audio path: split locally, upload temporary private chunks, stream-transcribe them server-side,
  // delete chunks immediately, then send only the transcript to the normal lesson generator.
  const fetchBeforeEphemeral=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||'');
    if(url===AI&&init?.body instanceof FormData&&init.body.get('mode')==='audio'){
      const old=init.body,file=(old.get('file')||old.getAll('files')[0]);
      if(!(file instanceof File))return new Response(JSON.stringify({error:'Chưa chọn file ghi âm.'}),{status:400,headers:{'Content-Type':'application/json; charset=utf-8'}});
      if(file.size>MAX_AUDIO_BYTES)return new Response(JSON.stringify({error:'File ghi âm lớn hơn 128 MB. Với bài 1,5–2 giờ, hãy dùng M4A hoặc MP3 để giữ file dưới 128 MB.'}),{status:413,headers:{'Content-Type':'application/json; charset=utf-8'}});
      const pin=getHeader(init,'x-admin-pin')||S.pin||'';
      let paths=[];
      try{
        window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'upload',done:0,total:Math.ceil(file.size/AUDIO_CHUNK_BYTES)}}));
        paths=await uploadAudioChunks(file,pin);
        window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'transcribe'}}));
        const tr=await fetchBeforeEphemeral(AUDIO_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':pin},body:JSON.stringify({action:'transcribe_chunks',paths,file_name:file.name,mime_type:file.type||'audio/mp4',total_bytes:file.size})});
        const tj=await tr.json().catch(()=>({}));
        paths=[]; // the server removes all temporary chunks in finally, on success or failure.
        if(!tr.ok)throw new Error(tj?.error||'Không phiên âm được file ghi âm.');
        const transcript=String(tj?.transcript||'').trim();
        if(!transcript)throw new Error('Bản phiên âm rỗng.');

        window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'summarize'}}));
        const fd=new FormData();
        for(const [k,v] of old.entries())if(k!=='file'&&k!=='files'&&k!=='mode'&&k!=='text')fd.append(k,v);
        fd.set('mode','text');fd.set('text',transcript);
        const sr=await fetchBeforeEphemeral(AI,{method:'POST',headers:{'x-admin-pin':pin},body:fd});
        const sj=await sr.json().catch(()=>({}));
        if(sj?.lesson){sj.lesson.source_kind='audio';sj.lesson.source_transcript=''}
        sj.audio_processing=tj.audio_processing||{retained:false};
        window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'done'}}));
        return new Response(JSON.stringify(sj),{status:sr.status,headers:{'Content-Type':'application/json; charset=utf-8'}});
      }catch(e){
        if(paths.length)await cleanupTempAudio(paths.filter(Boolean),pin);
        return new Response(JSON.stringify({error:e?.message||String(e)}),{status:500,headers:{'Content-Type':'application/json; charset=utf-8'}});
      }
    }
    return fetchBeforeEphemeral(input,init);
  };

  // Clarify retention policy and show simple progress for long audio.
  if(typeof uploadRoutingModal==='function'){
    const uploadRoutingBeforeEphemeral=uploadRoutingModal;
    uploadRoutingModal=function(mode){
      const r=uploadRoutingBeforeEphemeral(mode);
      if(isEphemeralMode(mode)){
        const overlays=[...document.querySelectorAll('.overlay')],d=overlays[overlays.length-1],drop=d?.querySelector('#drop');
        if(drop){
          const note=document.createElement('div');note.className='muted';note.style.cssText='margin-top:10px;line-height:1.5';
          note.innerHTML=mode==='audio'
            ?'<b>Audio dài:</b> hỗ trợ bài học khoảng 1,5–2 giờ. Nên dùng M4A/MP3, tối đa 128 MB. Audio được chia nhỏ và chỉ lưu tạm trong lúc phiên âm; xử lý xong sẽ tự xóa.'
            :'<b>Ảnh tạm thời:</b> ảnh chỉ được dùng để AI đọc nội dung và sẽ không được lưu vào thư viện sau khi xử lý.';
          drop.insertAdjacentElement('afterend',note);
        }
        if(mode==='audio'){
          const btn=d?.querySelector('#process');
          const onProgress=e=>{if(!document.body.contains(d)){window.removeEventListener('theology-audio-progress',onProgress);return}const x=e.detail||{};if(x.phase==='upload')btn.textContent=x.total?`Đang tải audio… ${x.done||0}/${x.total}`:'Đang tải audio…';else if(x.phase==='transcribe')btn.textContent='Đang phiên âm…';else if(x.phase==='summarize')btn.textContent='Đang tổng hợp bài học…';else if(x.phase==='done')btn.textContent='Hoàn tất…'};
          window.addEventListener('theology-audio-progress',onProgress);
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
        const lesson={id:old.id,folder_id:old.folder_id,title:d.querySelector('#epTitle').value.trim()||old.title,subtitle:valueOr(old.subtitle,v?.subtitle||''),scripture_reference:valueOr(old.scripture_reference,v?.scripture_reference||''),key_verse_reference:valueOr(old.key_verse_reference,v?.key_verse_reference||''),key_verse_1925:valueOr(old.key_verse_1925,v?.key_verse_1925||''),teacher:valueOr(old.teacher,v?.teacher||''),lesson_date:old.lesson_date||null,summary:d.querySelector('#epSummary').value.trim(),introduction:valueOr(old.introduction,v?.introduction||''),background:valueOr(old.background,v?.background||''),transition_text:valueOr(old.transition_text,v?.transition_text||''),main_content:arrayOr(old.main_content,v?.main_content),application:valueOr(old.application,v?.application||''),reflection_questions:arrayOr(old.reflection_questions,v?.reflection_questions),prayer:valueOr(old.prayer,v?.prayer||''),tags:arrayOr(old.tags,v?.tags),source_kind:old.source_kind||ctx.mode,is_published:old.is_published!==false};
        await adm('save_lesson',{lesson});d.remove();await load();S.selected=S.lessons.find(x=>x.id===old.id)||null;S.tab=S.selected?'detail':'lessons';render();
      }catch(e){b.disabled=false;b.textContent='Cập nhật bài học';d.querySelector('#epErr').innerHTML='<div class="error">'+esc(e?.message||String(e))+'</div>'}
    };
  }

  // Strip binary files and transcript text before any save path can persist them.
  if(typeof previewResult==='function'){
    const previewBeforeEphemeral=previewResult;
    previewResult=function(v,ctx){
      if(!ctx||!isEphemeralMode(ctx.mode))return previewBeforeEphemeral(v,ctx);
      const cleanV={...(v||{}),source_transcript:''},cleanCtx={...ctx,files:[]};
      if(cleanCtx.targetType==='lesson'&&cleanCtx.lessonId)return previewEphemeralExistingLesson(cleanV,cleanCtx);
      return previewBeforeEphemeral(cleanV,cleanCtx);
    };
  }

  // Scripture-source uploads from audio/images also stay ephemeral.
  if(typeof previewScriptureSource==='function'){
    previewScriptureSource=function(v,ctx){
      const lesson=S.lessons.find(x=>x.id===ctx.lessonId);if(!lesson)return;
      const d=overlay(`<div class="modal"><button class="x">×</button><h2>Xem trước nguồn Kinh Thánh</h2><p class="muted">File nguồn sẽ không được lưu. Chỉ tham chiếu Kinh Thánh được cập nhật vào bài học.</p><div class="field"><label>Phân đoạn nhận diện</label><input id="epSr" value="${esc(v?.scripture_reference||lesson.scripture_reference||'')}"></div><div class="modalActions"><button class="btn gold" id="epSrSave">Lưu tham chiếu</button></div></div>`);
      d.querySelector('#epSrSave').onclick=async()=>{try{await adm('save_lesson',{lesson:{id:lesson.id,scripture_reference:d.querySelector('#epSr').value.trim()||lesson.scripture_reference}});d.remove();await load();S.selected=S.lessons.find(x=>x.id===lesson.id)||null;S.tab='detail';render()}catch(e){alert(e?.message||String(e))}};
    };
  }
})();
