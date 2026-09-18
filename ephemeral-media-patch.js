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
  }

  function mp3FrameInfo(a,i){
    if(i+4>a.length||a[i]!==0xff||(a[i+1]&0xe0)!==0xe0)return null;
    const version=(a[i+1]>>3)&3,layer=(a[i+1]>>1)&3,bitrateIndex=(a[i+2]>>4)&15,sampleIndex=(a[i+2]>>2)&3,padding=(a[i+2]>>1)&1;
    if(version===1||layer===0||bitrateIndex===0||bitrateIndex===15||sampleIndex===3)return null;
    const mpeg1=version===3;
    const rates=mpeg1
      ?(layer===3?[32,64,96,128,160,192,224,256,288,320,352,384,416,448]:layer===2?[32,48,56,64,80,96,112,128,160,192,224,256,320,384]:[32,40,48,56,64,80,96,112,128,160,192,224,256,320])
      :(layer===3?[32,48,56,64,80,96,112,128,144,160,176,192,224,256]:[8,16,24,32,40,48,56,64,80,96,112,128,144,160]);
    const bitrate=rates[bitrateIndex-1]*1000;
    let sampleRate=[44100,48000,32000][sampleIndex];
    if(version===2)sampleRate/=2;else if(version===0)sampleRate/=4;
    let frameLength=0;
    if(layer===3)frameLength=Math.floor((12*bitrate/sampleRate)+padding)*4;
    else if(layer===1&&!mpeg1)frameLength=Math.floor((72*bitrate/sampleRate)+padding);
    else frameLength=Math.floor((144*bitrate/sampleRate)+padding);
    return {frameLength,bitrate,sampleRate};
  }
  function mp3FrameLength(a,i){return mp3FrameInfo(a,i)?.frameLength||0}
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
  async function mp3InfoAt(file,offset){
    const a=new Uint8Array(await file.slice(offset,offset+4).arrayBuffer());
    return mp3FrameInfo(a,0);
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
    const probe=new Uint8Array(await file.slice(f,Math.min(file.size,f+4096)).arrayBuffer()),info=mp3FrameInfo(probe,0);
    if(info){
      const text=new TextDecoder('latin1').decode(probe.slice(0,Math.min(info.frameLength,probe.length)));
      if(text.includes('Xing')||text.includes('Info')||text.includes('VBRI')){
        const next=f+info.frameLength,nf=await findMp3Frame(file,next,Math.min(64*1024,Math.max(0,file.size-next)));
        if(nf>=0)f=nf;
      }
    }
    return f;
  }
  async function buildMp3Segments(file){
    const first=await firstMp3Frame(file);
    const targetBytes=2*1024*1024;
    const parts=[];let start=first;
    while(start<file.size){
      const remaining=file.size-start;
      if(remaining<=targetBytes+MP3_SCAN_BYTES){parts.push({start,end:file.size});break}
      const approx=start+targetBytes;
      const end=await findMp3Frame(file,approx,MP3_SCAN_BYTES);
      if(end<0||end<=start)throw new Error('Không thể tìm ranh giới MP3 an toàn. Hãy xuất lại file MP3 rồi thử lại.');
      parts.push({start,end});start=end;
      if(parts.length>70)throw new Error('File MP3 vượt giới hạn 128 MB hoặc có cấu trúc bất thường.');
    }
    return {parts,first};
  }
  function wavBlobFromBuffer(buffer,startSec,endSec){
    const rate=16000,start=Math.max(0,startSec),end=Math.min(buffer.duration,endSec);
    const count=Math.max(0,Math.floor((end-start)*rate));
    const ab=new ArrayBuffer(44+count*2),v=new DataView(ab),u=new Uint8Array(ab);
    const write=(o,s)=>{for(let i=0;i<s.length;i++)u[o+i]=s.charCodeAt(i)};
    write(0,'RIFF');v.setUint32(4,36+count*2,true);write(8,'WAVE');write(12,'fmt ');
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,count*2,true);
    const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)),ratio=buffer.sampleRate/rate;
    for(let i=0;i<count;i++){
      const src=Math.min(buffer.length-1,Math.floor((start*buffer.sampleRate)+i*ratio));
      let x=0;for(const ch of channels)x+=ch[src]||0;x/=Math.max(1,channels.length);
      x=Math.max(-1,Math.min(1,x));v.setInt16(44+i*2,x<0?Math.round(x*32768):Math.round(x*32767),true);
    }
    return new Blob([ab],{type:'audio/wav'});
  }
  async function decodeMp3Slice(file,start,end){
    const OfflineCtx=window.OfflineAudioContext||window.webkitOfflineAudioContext,AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!OfflineCtx&&!AudioCtx)throw new Error('Trình duyệt này không hỗ trợ giải mã MP3. Hãy thử Chrome/Edge/Safari mới nhất.');
    const ctx=OfflineCtx?new OfflineCtx(2,1,44100):new AudioCtx();
    try{
      const raw=await file.slice(start,end,'audio/mpeg').arrayBuffer();
      return await ctx.decodeAudioData(raw.slice(0));
    }catch(e){
      throw new Error('Không giải mã được một đoạn MP3 trong trình duyệt. File có thể dùng codec MP3 không chuẩn hoặc bị lỗi.');
    }finally{try{if(typeof ctx.close==='function')await ctx.close()}catch{}}
  }
  async function transcribeWavBlob(blob,pin,fileName,index,total,prompt){
    let path='';
    try{
      const up=await adm('create_upload_url',{file_name:fileName});
      path=up.path;
      const put=await fetchBeforeEphemeral(up.signed_url,{method:'PUT',headers:{'content-type':'audio/wav'},body:blob});
      if(!put.ok)throw new Error(`Không tải được đoạn WAV ${index+1}/${total}.`);
      const tr=await fetchBeforeEphemeral(AUDIO_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':pin},body:JSON.stringify({action:'transcribe_segment',path,file_name:fileName,mime_type:'audio/wav',segment_bytes:blob.size,index,total,prompt})});
      const tj=await tr.json().catch(()=>({}));
      if(!tr.ok)throw new Error(tj?.error||`Không phiên âm được đoạn ${index+1}/${total}.`);
      path='';
      const transcript=String(tj?.transcript||'').trim();
      if(!transcript)throw new Error(`Bản phiên âm đoạn ${index+1} bị rỗng.`);
      return {transcript,meta:tj?.audio_processing||{}};
    }catch(e){if(path)await cleanupTempAudio([path],pin);throw e}
  }
  async function transcribeMp3Segmented(file,pin){
    const {parts,first}=await buildMp3Segments(file),texts=[],meta=[];
    let prompt='',wavCounter=0;
    window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'segment',done:0,total:parts.length}}));
    for(let i=0;i<parts.length;i++){
      const seg=parts[i];
      window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'decode_mp3',done:i,total:parts.length}}));
      let decodeStart=i===0?first:Math.max(first,seg.start-256*1024);
      if(i>0){
        const found=await findMp3Frame(file,decodeStart,Math.min(256*1024,Math.max(0,seg.start-decodeStart+4096)));
        if(found>=0&&found<seg.start)decodeStart=found;
      }
      const buffer=await decodeMp3Slice(file,decodeStart,seg.end);
      const sliceBytes=Math.max(1,seg.end-decodeStart),overlapBytes=Math.max(0,seg.start-decodeStart);
      const skipSec=i===0?0:Math.max(0,Math.min(buffer.duration*0.25,buffer.duration*(overlapBytes/sliceBytes)));
      const maxWavSeconds=300,usableStart=Math.min(skipSec,Math.max(0,buffer.duration-0.25));
      const windows=[];
      for(let t=usableStart;t<buffer.duration-0.05;t+=maxWavSeconds)windows.push([t,Math.min(buffer.duration,t+maxWavSeconds)]);
      if(!windows.length)continue;
      for(const [a,b] of windows){
        const wav=wavBlobFromBuffer(buffer,a,b);
        if(!wav.size)continue;
        const idx=wavCounter++,name=`tmp_audio_wav_${Date.now()}_${String(idx+1).padStart(3,'0')}.wav`;
        const result=await transcribeWavBlob(wav,pin,name,idx,Math.max(1,parts.length),prompt);
        texts.push(result.transcript);meta.push(result.meta);prompt=result.transcript.slice(-1000);
      }
      window.dispatchEvent(new CustomEvent('theology-audio-progress',{detail:{phase:'transcribe_segment',done:i+1,total:parts.length}}));
      await new Promise(r=>setTimeout(r,0));
    }
    const transcript=texts.join('\n\n').trim();
    if(!transcript)throw new Error('Bản phiên âm rỗng.');
    const seconds=meta.reduce((s,x)=>s+(Number(x?.duration_seconds)||0),0),estimated=meta.reduce((s,x)=>s+(Number(x?.estimated_cost_usd)||0),0);
    return {transcript,audio_processing:{model:'gpt-transcribe',duration_seconds:seconds||null,estimated_cost_usd:Number(estimated.toFixed(6)),retained:false,segmented:true,segments:texts.length,converted_to_wav:true}};
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
        fd.set('mode','text');fd.set('text',transcript);fd.set('source_origin','audio');
        const sr=await fetchBeforeEphemeral(AI,{method:'POST',headers:{'x-admin-pin':pin},body:fd});
        const rawResult=await sr.text();let sj={};try{sj=rawResult?JSON.parse(rawResult):{}}catch{}
        if(!sr.ok&&!sj?.error) sj={error:`Tổng hợp bài học thất bại (HTTP ${sr.status}): ${String(rawResult||'Không có chi tiết lỗi.').slice(0,600)}`};
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
            ?'<b>Audio dài:</b> hỗ trợ bài học khoảng 1,5–2 giờ, tối đa 128 MB. <b>Khuyến nghị MP3</b>: app sẽ giải mã từng đoạn MP3 thành WAV chuẩn rồi mới phiên âm; file WAV tạm được tự xóa sau xử lý.'
            :'<b>Ảnh tạm thời:</b> ảnh chỉ được dùng để AI đọc nội dung và sẽ không được lưu vào thư viện sau khi xử lý.';
          drop.insertAdjacentElement('afterend',note);
        }
        if(mode==='audio'){
          const btn=d?.querySelector('#process');
          const onProgress=e=>{if(!document.body.contains(d)){window.removeEventListener('theology-audio-progress',onProgress);return}const x=e.detail||{};if(x.phase==='upload')btn.textContent=x.total?`Đang tải audio… ${x.done||0}/${x.total}`:'Đang tải audio…';else if(x.phase==='segment')btn.textContent=x.total?`Chuẩn bị MP3… ${x.total} đoạn`:'Chuẩn bị MP3…';else if(x.phase==='decode_mp3')btn.textContent=`Đang chuyển MP3 → WAV… ${Math.min((x.done||0)+1,x.total||1)}/${x.total||1}`;else if(x.phase==='transcribe_segment')btn.textContent=`Đang phiên âm… ${x.done||0}/${x.total||0}`;else if(x.phase==='transcribe')btn.textContent='Đang phiên âm…';else if(x.phase==='summarize')btn.textContent='Đang tổng hợp bài học…';else if(x.phase==='done')btn.textContent='Hoàn tất…'};
          window.addEventListener('theology-audio-progress',onProgress);
        }
      }
      return r;
    };
  }

  function valueOr(existing,next){return next!==undefined&&next!==null&&next!==''?next:existing}
  function arrayOr(existing,next){return Array.isArray(next)&&next.length?next:(Array.isArray(existing)?existing:[])}

  function detailedEphemeralLessonHtml(v){
    const block=(label,text)=>text?`<div style="margin:14px 0"><div style="font-weight:800;color:#53657c;margin-bottom:5px">${label}</div><div style="white-space:pre-wrap;line-height:1.65">${esc(text)}</div></div>`:'';
    const points=Array.isArray(v?.main_content)?v.main_content:[];
    const pointHtml=points.map((p,i)=>{
      const subs=Array.isArray(p?.subpoints)?p.subpoints:[];
      const subHtml=subs.map((s,j)=>`<div style="margin:12px 0 0 14px;padding:12px;border-left:3px solid #dcc184;background:#fffdf8;border-radius:8px"><div style="font-weight:800">${i+1}.${j+1} ${esc(s?.title||'')}</div>${s?.scripture_reference?`<div class="muted" style="margin:4px 0 8px">Kinh Thánh: ${esc(s.scripture_reference)}</div>`:''}${block('Giải thích',s?.explanation||'')}${block('Giải thích thực tế',s?.practical_explanation||'')}${block('Ví dụ / minh họa',s?.example||'')}${block('Áp dụng',s?.application||'')}</div>`).join('');
      return `<div style="margin:16px 0;padding:14px;border:1px solid #e3d7c4;border-radius:12px;background:#fff"><div style="font-weight:900;font-size:18px;color:#15365e">${i+1}. ${esc(p?.title||'')}</div>${p?.scripture_reference?`<div class="muted" style="margin:5px 0 8px">Kinh Thánh: ${esc(p.scripture_reference)}</div>`:''}${block('Nội dung chi tiết',p?.explanation||'')}${subHtml}</div>`;
    }).join('');
    return `${block('Mở đầu',v?.introduction||'')}${block('Bối cảnh',v?.background||'')}${block('Chuyển ý',v?.transition_text||'')}${pointHtml||'<div class="muted">Chưa có thân bài chi tiết.</div>'}`;
  }

  function previewEphemeralExistingLesson(v,ctx){
    const old=S.lessons.find(x=>x.id===ctx.lessonId);if(!old)return;
    const detailed=detailedEphemeralLessonHtml(v);
    const d=overlay(`<div class="modal" style="width:min(980px,96vw)"><button class="x">×</button><h2>Xem trước bài học đầy đủ</h2><p class="muted">File ${ctx.mode==='audio'?'audio':'hình ảnh'} sẽ <b>không được lưu</b>. App cập nhật <b>toàn bộ nội dung chi tiết</b> vào bài học hiện tại; phần tóm tắt chỉ là mục kết luận cuối bài.</p><div class="field"><label>Tựa đề</label><input id="epTitle" value="${esc(valueOr(old.title,v?.title||''))}"></div><div style="margin:14px 0"><div style="font-weight:900;color:#15365e;font-size:19px;margin-bottom:8px">Nội dung bài học chi tiết</div><div style="max-height:52vh;overflow:auto;padding:4px 8px 4px 0">${detailed}</div></div><div class="field"><label>Tóm tắt các ý chính · chỉ phần cuối bài</label><textarea id="epSummary" rows="7">${esc(valueOr(old.summary,v?.summary||''))}</textarea></div><div id="epErr"></div><div class="modalActions"><button class="btn gold" id="epSave">Cập nhật toàn bộ bài học</button></div></div>`);
    d.querySelector('#epSave').onclick=async()=>{
      const b=d.querySelector('#epSave');b.disabled=true;b.textContent='Đang lưu…';
      try{
        const lesson={id:old.id,folder_id:old.folder_id,title:d.querySelector('#epTitle').value.trim()||old.title,subtitle:valueOr(old.subtitle,v?.subtitle||''),scripture_reference:valueOr(old.scripture_reference,v?.scripture_reference||''),key_verse_reference:valueOr(old.key_verse_reference,v?.key_verse_reference||''),key_verse_1925:valueOr(old.key_verse_1925,v?.key_verse_1925||''),teacher:valueOr(old.teacher,v?.teacher||''),lesson_date:old.lesson_date||null,summary:d.querySelector('#epSummary').value.trim(),introduction:valueOr(old.introduction,v?.introduction||''),background:valueOr(old.background,v?.background||''),transition_text:valueOr(old.transition_text,v?.transition_text||''),main_content:arrayOr(old.main_content,v?.main_content),application:valueOr(old.application,v?.application||''),reflection_questions:arrayOr(old.reflection_questions,v?.reflection_questions),prayer:valueOr(old.prayer,v?.prayer||''),tags:arrayOr(old.tags,v?.tags),source_kind:old.source_kind||ctx.mode,is_published:old.is_published!==false};
        await adm('save_lesson',{lesson});d.remove();await load();S.selected=S.lessons.find(x=>x.id===old.id)||null;S.tab=S.selected?'detail':'lessons';render();
      }catch(e){b.disabled=false;b.textContent='Cập nhật toàn bộ bài học';d.querySelector('#epErr').innerHTML='<div class="error">'+esc(e?.message||String(e))+'</div>'}
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
