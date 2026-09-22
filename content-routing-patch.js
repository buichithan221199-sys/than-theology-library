// Upload routing: every upload is classified and attached to a lesson; Scripture lesson composer is separate.
function openImport(){
  if(!S.pin){unlock();return}
  const d=overlay(`<div class="modal"><button class="x">×</button><h2>Thêm nội dung</h2><p class="muted">Tải tài liệu vào bài học đã chọn, hoặc mở riêng phần soạn bài học từ Kinh Thánh.</p><div class="methods"><button data-m="images">🖼️<br>Hình ảnh</button><button data-m="pdf">📄<br>PDF</button><button data-m="audio">🎙️<br>Ghi âm</button><button data-m="text">✍️<br>Văn bản</button></div><button class="btn gold" id="scriptureComposer" style="width:100%;margin-top:10px">📖 Soạn bài học từ Kinh Thánh</button></div>`);
  d.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const m=b.dataset.m;d.remove();uploadRoutingModal(m)});
  d.querySelector('#scriptureComposer').onclick=()=>{d.remove();openScriptureComposer()};
}

function lessonTargetOptions(includeNew=true){
  return `${includeNew?'<option value="__new__">+ Tạo bài học mới</option>':''}<option value="">-- Chọn bài học --</option>`+S.lessons.map(l=>`<option value="${l.id}">${esc(l.title)}</option>`).join('');
}

function uploadRoutingModal(mode){
  let files=[];const multi=mode==='images';
  const title=multi?'Tải hình ảnh':mode==='pdf'?'Tải PDF':mode==='audio'?'Tải ghi âm':'Dán văn bản';
  const d=overlay(`<div class="modal"><button class="x">×</button><h2>${title}</h2>
    <div class="field"><label>Đây là loại nội dung gì?</label><select id="contentKind"><option value="lesson">Bài học</option><option value="questions">Câu hỏi trắc nghiệm</option><option value="scripture">Kinh Thánh</option></select></div>
    <div class="field"><label>Thuộc bài học nào?</label><select id="lessonTarget">${lessonTargetOptions(true)}</select><div class="muted" id="targetHint" style="margin-top:6px">Chọn “Tạo bài học mới” nếu đây là tài liệu để tạo một bài học mới.</div></div>
    <div id="newFolder" class="field"><label>Nơi lưu nếu tạo bài học mới</label><select id="folder"><option value="class-lessons">Bài học trên lớp</option><option value="scripture-lessons">Bài học từ Kinh Thánh</option></select></div>
    ${mode==='text'?`<div class="field"><label>Nội dung</label><textarea id="text" rows="12"></textarea></div>`:`<div class="drop" id="drop"><b>${multi?'Chọn nhiều ảnh (tối đa 40)':'Chọn file'}</b><span class="muted">${multi?'Có thể chọn nhiều ảnh một lần hoặc chọn thêm nhiều lần.':'Nhấn để chọn file.'}</span><input id="file" type="file" ${multi?'multiple accept="image/*"':mode==='pdf'?'accept="application/pdf"':'accept="audio/*"'} hidden></div>${multi?`<button class="btn white" id="more" style="width:100%;margin-top:10px">+ Chọn thêm ảnh</button><div class="muted" id="count">0/40 ảnh</div><div class="preview" id="preview"></div>`:`<div class="muted" id="count">Chưa chọn file</div>`}`}
    <div id="err"></div><div class="modalActions"><button class="btn gold" id="process">Xử lý & xem trước</button></div>`);
  const kind=d.querySelector('#contentKind'),target=d.querySelector('#lessonTarget'),folderBox=d.querySelector('#newFolder'),hint=d.querySelector('#targetHint');
  const sync=()=>{const k=kind.value;const allowNew=k==='lesson';const cur=target.value;target.innerHTML=lessonTargetOptions(allowNew);if(allowNew&&cur==='__new__')target.value='__new__';else if(cur&&cur!=='__new__'&&S.lessons.some(x=>x.id===cur))target.value=cur;folderBox.classList.toggle('hidden',target.value!=='__new__');hint.textContent=k==='questions'?'Chọn bài học mà bộ câu hỏi này thuộc về.':k==='scripture'?'Chọn bài học mà phần Kinh Thánh này thuộc về. Phần này chỉ lưu/ghép nguồn, không phải chức năng soạn bài học từ Kinh Thánh.':'Chọn bài học đã có, hoặc “Tạo bài học mới”.'};
  kind.onchange=sync;target.onchange=()=>folderBox.classList.toggle('hidden',target.value!=='__new__');sync();
  if(mode!=='text'){
    const input=d.querySelector('#file'),drop=d.querySelector('#drop');
    const upd=()=>{d.querySelector('#count').textContent=multi?`${files.length}/40 ảnh`:files[0]?.name||'Chưa chọn file';if(multi)d.querySelector('#preview').innerHTML=files.map((f,i)=>`<span class="chip">${i+1}. ${esc(f.name)} <button data-rm="${i}">×</button></span>`).join('');d.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{files.splice(+b.dataset.rm,1);upd()})};
    drop.onclick=()=>input.click();d.querySelector('#more')?.addEventListener('click',()=>input.click());input.onchange=e=>{const picked=[...(e.target.files||[])];if(multi){const n=Math.max(0,40-files.length);files.push(...picked.slice(0,n));if(picked.length>n)d.querySelector('#err').innerHTML='<div class="error">Tối đa 40 ảnh.</div>';input.value=''}else files=picked.slice(0,1);upd()};['dragover','drop'].forEach(ev=>drop.addEventListener(ev,e=>e.preventDefault()));drop.addEventListener('drop',e=>{if(!multi)return;const picked=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/'));const n=Math.max(0,40-files.length);files.push(...picked.slice(0,n));upd()});
  }
  d.querySelector('#process').onclick=async()=>{
    const k=kind.value,lessonId=target.value,folder=d.querySelector('#folder')?.value||'class-lessons',text=d.querySelector('#text')?.value||'';
    if(k!=='lesson'&&!lessonId){d.querySelector('#err').innerHTML='<div class="error">Bạn phải chọn bài học đích.</div>';return}
    if(k==='lesson'&&!lessonId){d.querySelector('#err').innerHTML='<div class="error">Hãy chọn bài học đã có hoặc “Tạo bài học mới”.</div>';return}
    if(mode==='text'&&!text.trim()){d.querySelector('#err').innerHTML='<div class="error">Chưa có nội dung.</div>';return}
    if(mode!=='text'&&!files.length){d.querySelector('#err').innerHTML='<div class="error">Chưa chọn file.</div>';return}
    try{
      const b=d.querySelector('#process');b.disabled=true;b.textContent='Đang xử lý…';
      const fd=new FormData();fd.append('mode',mode);fd.append('content_kind',k);fd.append('target_type',k==='questions'?'questions':k==='scripture'?'scripture':'lesson');fd.append('target_lesson_id',lessonId==='__new__'?'':lessonId);fd.append('target_lesson_title',S.lessons.find(x=>x.id===lessonId)?.title||'');fd.append('folder_slug',folder);fd.append('text',text);files.forEach(f=>fd.append(multi?'files':'file',f));
      const r=await fetch(AI,{method:'POST',headers:{'x-admin-pin':S.pin},body:fd});const j=await r.json();if(!r.ok)throw Error(j.error||'Không xử lý được');d.remove();
      if(k==='questions')return previewResult(j.lesson||j,{targetType:'questions',lessonId,folder,files,mode});
      if(k==='scripture')return previewScriptureSource(j.lesson||j,{lessonId,files,mode,text});
      return previewResult(j.lesson||j,{targetType:'lesson',lessonId:lessonId==='__new__'?'':lessonId,folder,files,mode});
    }catch(e){d.querySelector('#err').innerHTML='<div class="error">'+esc(e.message)+'</div>';d.querySelector('#process').disabled=false;d.querySelector('#process').textContent='Xử lý & xem trước'}
  };
}

function previewScriptureSource(v,ctx){
  const lesson=S.lessons.find(x=>x.id===ctx.lessonId);const sourceText=v?.source_transcript||ctx.text||'';
  const d=overlay(`<div class="modal"><button class="x">×</button><h2>Xem trước nguồn Kinh Thánh</h2><p class="muted">Sẽ gắn vào bài: <b>${esc(lesson?.title||'')}</b></p><div class="field"><label>Phân đoạn nhận diện</label><input id="sr" value="${esc(v?.scripture_reference||'')}"></div><div class="field"><label>Nội dung nguồn</label><textarea id="source" rows="12">${esc(sourceText)}</textarea></div><div class="modalActions"><button class="btn gold" id="save">Lưu vào bài học</button></div></div>`);
  d.querySelector('#save').onclick=async()=>{try{const sr=d.querySelector('#sr').value.trim(),txt=d.querySelector('#source').value.trim();for(const f of ctx.files){const up=await adm('create_upload_url',{file_name:f.name});await fetch(up.signed_url,{method:'PUT',headers:{'content-type':f.type||'application/octet-stream'},body:f});await adm('register_attachment',{attachment:{lesson_id:ctx.lessonId,file_name:f.name,file_path:up.path,mime_type:f.type,file_size:f.size,source_kind:'scripture_source'}})}if(txt){const blob=new Blob([txt],{type:'text/plain'}),name=`Kinh-Thanh-${sr||'nguon'}.txt`;const up=await adm('create_upload_url',{file_name:name});await fetch(up.signed_url,{method:'PUT',headers:{'content-type':'text/plain'},body:blob});await adm('register_attachment',{attachment:{lesson_id:ctx.lessonId,file_name:name,file_path:up.path,mime_type:'text/plain',file_size:blob.size,source_kind:'scripture_source'}})}d.remove();alert('Đã lưu nguồn Kinh Thánh vào bài học.')}catch(e){alert(e.message)}};
}

function openScriptureComposer(){
  const d=overlay(`<div class="modal"><button class="x">×</button><h2>Soạn bài học từ Kinh Thánh</h2><p class="muted">Chức năng riêng: nhập phân đoạn hoặc dán nguyên văn Kinh Thánh để AI soạn thành một bài học mới.</p><div class="field"><label>Phân đoạn / nội dung Kinh Thánh</label><textarea id="scriptureText" rows="14" placeholder="Ví dụ: Công vụ 13:1–3, hoặc dán nguyên văn phân đoạn..."></textarea></div><div id="err"></div><div class="modalActions"><button class="btn gold" id="go">Soạn bài & xem trước</button></div></div>`);
  d.querySelector('#go').onclick=async()=>{const text=d.querySelector('#scriptureText').value.trim();if(!text){d.querySelector('#err').innerHTML='<div class="error">Chưa nhập phân đoạn Kinh Thánh.</div>';return}try{const b=d.querySelector('#go');b.disabled=true;b.textContent='Đang soạn bài…';const fd=new FormData();fd.append('mode','text');fd.append('content_kind','scripture_lesson');fd.append('target_type','lesson');fd.append('folder_slug','scripture-lessons');fd.append('text',text);const r=await fetch(AI,{method:'POST',headers:{'x-admin-pin':S.pin},body:fd});const j=await r.json();if(!r.ok)throw Error(j.error||'Không xử lý được');d.remove();previewResult(j.lesson||j,{targetType:'lesson',lessonId:'',folder:'scripture-lessons',files:[],mode:'text'})}catch(e){d.querySelector('#err').innerHTML='<div class="error">'+esc(e.message)+'</div>';d.querySelector('#go').disabled=false;d.querySelector('#go').textContent='Soạn bài & xem trước'}};
}
