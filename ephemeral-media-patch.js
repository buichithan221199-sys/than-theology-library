// Ephemeral media policy: audio and uploaded images are used only for AI processing and are not retained in Storage.
(function(){
  const AUDIO_ENDPOINT=SB+'/functions/v1/theology-audio';
  const MAX_AUDIO_BYTES=128*1024*1024;
  const AUDIO_CHUNK_BYTES=4*1024*1024;
  const MP3_SEGMENT_BYTES=16*1024*1024;
  const MP3_SCAN_BYTES=512*1024;
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
  function mp3FrameLength(a,i){
    if(i+4>a.length||a[i]!==0xff||(a[i+1]&0xe0)!==0xe0)return 0;
    const version=(a[i+1]>>3)&3,layer=(a[i+1]>>1)&3,bitrateIndex=(a[i+2]>>4)&15,sampleIndex=(a[i+2]>>2)&3,padding=(a[i+2]>>1)&1;
    if(version===1||layer===0||bitrateIndex===0||bitrateIndex===15||sampleIndex===3)return 0;
    const mpeg1=version===3;
    const rates=mpeg1
      ?(layer===3?[32,64,96,128,160,192,224,256,288,320,352,384,416,448]:layer===2?[32,48,56,64,80,96,112,128,160,192,224,256,320,384]:[32,40,48,56,64,80,96,112,128,160,192,224,256,320])
      :(layer===3?[32,48,56,64,80,96,112,128,144,160,176,192,224,256]:[8,16,24,32,40,48,56,64,80,96,112,128,144,160]);
    const br=rates[bitrateIndex-1]*1000;
    let sr=[44100,48000,32000][sampleIndex];
    if(version===2)sr/=2;else if(version===0)sr/=4;
    if(layer===3)return Math.floor((12*br/sr)+padding)*4;
    if(layer===1&&!mpeg1)return Math.floor((72*br/sr)+padding);
    return Math.floor((144*br/sr)+padding);
  }
  async function findMp3Frame(file,start,scanBytes=MP3_SCAN_BYTES){
    const end=Math.min(file.size,start+scanBytes),a=new Uint8Array(await file.slice(start,end).arrayBuffer());
    for(let i=0;i+4<a.length;i++){
      const len=mp3FrameLength(a,i);if(!len)continue;
      const n=i+len;
      if(n+4<=a.length){if(mp3FrameLength(a,n))return start+i}
      else if(start+i+len>=file.size-4)return start+i;
    }
    return -1;
  }
  async function firstMp3Frame(file){
    let start=0;
    const h=new Uint8Array(await file.slice(0,10).arrayBuffer());
    if(h.length===10&&h[0]===0x49&&h[1]===0x44&&h[2]===0x33){
      const size=((h[6]&0x7f)<<21)|((h[7]&0x7f)<<14)|((h[8]&0x7f)<<7)|(h[9]&0x7f);
      start=10+size+((h[5]&0x10)?10:0);
    }
    let f=await findMp3Frame(file,start,Math.min(2*1024*1024,Math.max(0,file.size-start)));
    if(f<0&&start>0)f=await findMp3Frame(file,0,Math.min(2*1024*1024,file.size));
    if(f<0)throw new Error('Không nhận diện được cấu trúc MP3. Hãy xuất lại file dưới dạng MP3 chuẩn rồi thử lại.');
    const probe=new Uint8Array(await file.slice(f,Math.min(file.size,f+2048)).arrayBuffer());
    const len=mp3FrameLength(probe,0);
    if(len>0){
      const text=new TextDecoder('latin1').decode(probe.slice(0,Math.min(len,probe.length)));
      if(text.includes('Xing')||text.includes('Info')||text.includes('VBRI')){
        const next=f+len;
        const nf=await findMp3Frame(file,next,Math.min(64*1024,Math.max(0,file.size-next)));
        if(nf>=0)f=nf;
      }
    }
    return f;
  }
  async function buildMp3Segments(file){
    const parts=[],first=await firstMp3Frame(file);let start=first;
    while(start<file.size){
      const remaining=file.size-start;
      if(remaining<=MP3_SEGMENT_BYTES+MP3_SCAN_BYTES){parts.push({start,end:file.size});break}
      const approx=start+MP3_SEGMENT_BYTES;
      const end=await findMp3Frame(file,approx,MP3_SCAN_BYTES);
      if(end<0||end<=start)throw new Error('Không thể chia MP3 tại ranh giới audio an toàn. Hãy xuất lại MP3 và thử lại.');
      parts.push({start,end});start=end;
      if(parts.length>16)throw new Error('MP3 có quá nhiều đoạn xử lý.');
    }
    return parts;
  }
  async function transcribeMp3Segmented(file,pin){
    const segments=await buildMp3Segments(file),texts=new Array(segments.length),meta=new Array(segments.length);
    let cursor=0,done=0,failed=null;
    window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'segment',done:0,total:segments.length}}));
    async function worker(){
      while(true){
        if(failed)return;
        const i=cursor++;if(i>=segments.length)return;
        const seg=segments[i],blob=file.slice(seg.start,seg.end,'audio/mpeg');
        let path='';
        try{
          const up=await adm('create_upload_url',{file_name:`tmp_audio_mp3_${Date.now()}_${String(i+1).padStart(2,'0')}.mp3`});
          path=up.path;
          const put=await fetchBeforeEphemeral(up.signed_url,{method:'PUT',headers:{'content-type':'audio/mpeg'},body:blob});
          if(!put.ok)throw new Error(`Không tải được đoạn MP3 ${i+1}/${segments.length}.`);
          const tr=await fetchBeforeEphemeral(AUDIO_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':pin},body:JSON.stringify({action:'transcribe_segment',path,file_name:`segment-${i+1}.mp3`,original_name:file.name,mime_type:'audio/mpeg',segment_bytes:blob.size,index:i,total:segments.length})});
          const tj=await tr.json().catch(()=>({}));
          if(!tr.ok)throw new Error(tj?.error||`Không phiên âm được đoạn ${i+1}/${segments.length}.`);
          texts[i]=String(tj?.transcript||'').trim();meta[i]=tj?.audio_processing||{};
          if(!texts[i])throw new Error(`Bản phiên âm đoạn ${i+1} bị rỗng.`);
          path='';
          done++;
          window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'transcribe_segment',done,total:segments.length}}));
        }catch(e){
          failed=e;
          if(path)await cleanupTempAudio([path],pin);
          throw e;
        }
      }
    }
    const workerCount=Math.min(2,segments.length);
    await Promise.all(Array.from({length:workerCount},()=>worker()));
    const transcript=texts.filter(Boolean).join('\n\n').trim();
    if(!transcript)throw new Error('Bản phiên âm rỗng.');
    const seconds=meta.reduce((s,x)=>s+(Number(x?.duration_seconds)||0),0);
    const estimated=meta.reduce((s,x)=>s+(Number(x?.estimated_cost_usd)||0),0);
    return {transcript,audio_processing:{model:'gpt-transcribe',duration_seconds:seconds||null,estimated_cost_usd:Number(estimated.toFixed(6)),retained:false,segmented:true,segments:segments.length}};
  }

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
        const isMp3=/\.mp3$/i.test(file.name)||/audio\/(mpeg|mp3)/i.test(file.type||'');
        let transcript='',tj={};
        if(isMp3){
          const segmented=await transcribeMp3Segmented(file,pin);
          transcript=segmented.transcript;tj={audio_processing:segmented.audio_processing};
        }else{
          window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'upload',done:0,total:Math.ceil(file.size/AUDIO_CHUNK_BYTES)}}));
          paths=await uploadAudioChunks(file,pin);
          window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'transcribe'}}));
          const tr=await fetchBeforeEphemeral(AUDIO_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':pin},body:JSON.stringify({action:'transcribe_chunks',paths,file_name:file.name,mime_type:file.type||'audio/mp4',total_bytes:file.size})});
          tj=await tr.json().catch(()=>({}));
          paths=[];
          if(!tr.ok)throw new Error(tj?.error||'Không phiên âm được file ghi âm.');
          transcript=String(tj?.transcript||'').trim();
          if(!transcript)throw new Error('Bản phiên âm rỗng.');
        }

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
            ?'<b>Audio dài:</b> hỗ trợ bài học khoảng 1,5–2 giờ, tối đa 128 MB. <b>Khuyến nghị MP3</b>: MP3 dài được chia tại ranh giới audio an toàn và phiên âm theo từng đoạn; file chỉ lưu tạm và tự xóa sau xử lý.'
            :'<b>Ảnh tạm thời:</b> ảnh chỉ được dùng để AI đọc nội dung và sẽ không được lưu vào thư viện sau khi xử lý.';
          drop.insertAdjacentElement('afterend',note);
        }
        if(mode==='audio'){
          const btn=d?.querySelector('#process');
          const onProgress=e=>{if(!document.body.contains(d)){window.removeEventListener('theology-audio-progress',onProgress);return}const x=e.detail||{};if(x.phase==='upload')btn.textContent=x.total?`Đang tải audio… ${x.done||0}/${x.total}`:'Đang tải audio…';else if(x.phase==='segment')btn.textContent=x.total?`Đang chia MP3… ${x.total} đoạn`:'Đang chia MP3…';else if(x.phase==='transcribe_segment')btn.textContent=`Đang phiên âm… ${x.done||0}/${x.total||0}`;else if(x.phase==='transcribe')btn.textContent='Đang phiên âm…';else if(x.phase==='summarize')btn.textContent='Đang tổng hợp bài học…';else if(x.phase==='done')btn.textContent='Hoàn tất…'};
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
