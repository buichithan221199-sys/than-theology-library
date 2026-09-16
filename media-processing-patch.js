// Complete media upload processing: compress image copies for AI, preserve originals, and attach processed sources to existing lessons.
async function aiCompressImage(file){
  try{
    let bmp;
    if('createImageBitmap' in window) bmp=await createImageBitmap(file);
    else {
      const url=URL.createObjectURL(file);const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
      bmp=img;URL.revokeObjectURL(url);
    }
    const w=bmp.width,h=bmp.height,max=1800,scale=Math.min(1,max/Math.max(w,h));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
    const x=c.getContext('2d');x.drawImage(bmp,0,0,c.width,c.height);if(bmp.close)bmp.close();
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.84));
    if(!blob)return file;
    return new File([blob],file.name.replace(/\.[^.]+$/, '')+'-ai.jpg',{type:'image/jpeg',lastModified:file.lastModified});
  }catch{return file}
}

const _fetchMedia=window.fetch.bind(window);
window.fetch=async function(input,init){
  try{
    const url=typeof input==='string'?input:(input?.url||'');
    if(url===AI && init?.body instanceof FormData && init.body.get('mode')==='images'){
      const old=init.body,fd=new FormData();
      for(const [k,v] of old.entries())if(k!=='files'&&k!=='file')fd.append(k,v);
      const originals=[...old.getAll('files'),...old.getAll('file')].filter(x=>x instanceof File);
      for(const f of originals)fd.append('files',await aiCompressImage(f));
      init={...init,body:fd};
    }
  }catch(e){console.warn('Image optimization skipped',e)}
  return _fetchMedia(input,init);
};

async function saveOriginalAttachments(lessonId,files,sourceKind){
  for(const f of files||[]){
    const up=await adm('create_upload_url',{file_name:f.name});
    await _fetchMedia(up.signed_url,{method:'PUT',headers:{'content-type':f.type||'application/octet-stream'},body:f});
    await adm('register_attachment',{attachment:{lesson_id:lessonId,file_name:f.name,file_path:up.path,mime_type:f.type||'application/octet-stream',file_size:f.size,source_kind:sourceKind}});
  }
}
async function saveTranscriptAttachment(lessonId,text,label,sourceKind){
  if(!text?.trim())return;
  const safe=(label||'nguon').replace(/[\\/:*?"<>|]+/g,'-').slice(0,70);const name=`${safe}-noi-dung.txt`;
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const up=await adm('create_upload_url',{file_name:name});
  await _fetchMedia(up.signed_url,{method:'PUT',headers:{'content-type':'text/plain;charset=utf-8'},body:blob});
  await adm('register_attachment',{attachment:{lesson_id:lessonId,file_name:name,file_path:up.path,mime_type:'text/plain',file_size:blob.size,source_kind:sourceKind}});
}

function mediaSourcePreview(v,ctx){
  const lesson=S.lessons.find(x=>x.id===ctx.lessonId);const transcript=v?.source_transcript||'';
  const d=overlay(`<div class="modal" style="width:min(900px,96vw)"><button class="x">×</button><h2>Xem trước tài liệu bài học</h2><p class="muted">Tài liệu sẽ được gắn vào: <b>${esc(lesson?.title||'')}</b></p><div class="field"><label>Tiêu đề nhận diện</label><input id="mt" value="${esc(v?.title||'Tài liệu bài học')}"></div><div class="field"><label>Tóm tắt nội dung</label><textarea id="ms" rows="5">${esc(v?.summary||'')}</textarea></div><div class="field"><label>Nội dung đọc được / bản phiên âm</label><textarea id="mx" rows="14">${esc(transcript)}</textarea></div><div class="modalActions"><button class="btn gold" id="save">Lưu vào bài học này</button></div></div>`);
  d.querySelector('#save').onclick=async()=>{const b=d.querySelector('#save');b.disabled=true;b.textContent='Đang lưu…';try{await saveOriginalAttachments(ctx.lessonId,ctx.files,'lesson_source');const text=d.querySelector('#mx').value.trim();const label=d.querySelector('#mt').value.trim()||'tai-lieu';await saveTranscriptAttachment(ctx.lessonId,text,label,'lesson_source');d.remove();alert('Đã lưu tài liệu vào bài học.')}catch(e){b.disabled=false;b.textContent='Lưu vào bài học này';alert(e.message)}};
}

function mediaQuestionsPreview(v,ctx){
  const qs=Array.isArray(v?.questions)?v.questions:[],lesson=S.lessons.find(x=>x.id===ctx.lessonId);const transcript=v?.source_transcript||'';
  const d=overlay(`<div class="modal" style="width:min(920px,96vw)"><button class="x">×</button><h2>Xem trước câu hỏi trắc nghiệm</h2><p class="muted">Sẽ gắn ${qs.length} câu vào <b>${esc(lesson?.title||'')}</b>. File gốc cũng sẽ được lưu cùng bài học.</p>${qs.map((q,i)=>{const o=q.options||{};return `<div class="question"><b>Câu ${i+1}. ${esc(q.question_text||'')}</b><div class="opts">${['A','B','C','D'].map(k=>`<div class="opt">${k}. ${esc(o[k]||'')}</div>`).join('')}</div><div class="muted">Đáp án: ${esc(q.correct_option||'')} · ${esc(q.explanation||'')}</div></div>`}).join('')||'<div class="error">Không nhận diện được câu hỏi nào.</div>'}<div class="modalActions"><button class="btn gold" id="save" ${qs.length?'':'disabled'}>Lưu câu hỏi + file nguồn</button></div></div>`);
  d.querySelector('#save')?.addEventListener('click',async()=>{const b=d.querySelector('#save');b.disabled=true;b.textContent='Đang lưu…';try{for(let i=0;i<qs.length;i++){const z=qs[i],o=Array.isArray(z.options)?Object.fromEntries(['A','B','C','D'].map((k,j)=>[k,z.options[j]||''])):(z.options||{});await adm('save_question',{question:{lesson_id:ctx.lessonId,question_text:z.question_text||'',options:o,sort_order:i+1,scripture_reference:z.scripture_reference||''},answer:{correct_option:z.correct_option||'',explanation:z.explanation||'',scripture_reference:z.scripture_reference||''}})}await saveOriginalAttachments(ctx.lessonId,ctx.files,'question_source');await saveTranscriptAttachment(ctx.lessonId,transcript,'nguon-cau-hoi','question_source');d.remove();await load();go('quiz')}catch(e){b.disabled=false;b.textContent='Lưu câu hỏi + file nguồn';alert(e.message)}});
}

const _previewMediaBase=previewResult;
previewResult=function(v,ctx){
  if(ctx?.targetType==='questions'&&ctx.lessonId)return mediaQuestionsPreview(v,ctx);
  if(ctx?.targetType==='lesson'&&ctx.lessonId)return mediaSourcePreview(v,ctx);
  return _previewMediaBase(v,ctx);
};
