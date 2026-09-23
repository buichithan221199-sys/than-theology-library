// Isolate the optional MP3 verbatim transcript from the lesson editor.
// Uploading audio from the "Nguyên văn MP3" section must never save or replace lesson content.
(function(){
  const VERBATIM=SB+'/functions/v1/theology-verbatim';

  function errText(v){
    if(!v)return 'Không xử lý được nguyên văn MP3.';
    if(typeof v==='string')return v;
    if(v instanceof Error)return v.message||String(v);
    if(typeof v?.error==='string')return v.error;
    if(typeof v?.message==='string')return v.message;
    try{return JSON.stringify(v)}catch{return String(v)}
  }

  async function verbatimOnlyApi(action,payload={}){
    const r=await fetch(VERBATIM,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':S.pin||''},body:JSON.stringify({action,...payload})});
    const raw=await r.text();let j={};try{j=raw?JSON.parse(raw):{}}catch{}
    if(!r.ok)throw new Error(errText(j?.error||j?.message||raw||('HTTP '+r.status)));
    return j;
  }

  function exportVerbatimOnlyPdf(lesson,transcript){
    try{
      const title=String(lesson?.title||'Bài học');
      const body=`<h1>Nguyên văn MP3</h1><div class="meta">${pdfEsc(title)}</div><div style="margin:0 0 18px;padding:10px 12px;border-left:4px solid #d7ad4f;background:#fff9e9;color:#5f6875;font-size:10.5pt"><b>Nguyên văn phiên âm</b><br>Phần này được lưu riêng và không thay đổi nội dung bài học.</div><div style="white-space:pre-wrap;line-height:1.7;font-family:Georgia,'Times New Roman',serif;font-size:11.5pt">${pdfEsc(transcript)}</div><div class="footer-note">Thư Viện Thần Học · Nguyên văn MP3</div>`;
      openPrintablePdf(title+' - Nguyên văn MP3',body);
    }catch(e){console.error(e);alert('Không thể xuất PDF nguyên văn MP3.');}
  }

  function openVerbatimOnlyUpload(lessonId){
    if(!S.pin){unlock(()=>openVerbatimOnlyUpload(lessonId));return}
    const lesson=S.lessons.find(x=>x.id===lessonId)||S.selected;
    const d=overlay(`<div class="modal" style="max-width:720px"><button class="x">×</button><h2>🎙️ Thêm nguyên văn MP3</h2><p class="muted"><b>${esc(lesson?.title||'')}</b></p><div style="padding:12px 14px;border-radius:12px;background:#eef8f0;border:1px solid #cde3d1;color:#315a39;line-height:1.55;margin:10px 0 16px"><b>Chỉ tạo Nguyên văn MP3.</b><br>File này sẽ được phiên âm và lưu riêng. <b>Không thay đổi tiêu đề, nội dung, bố cục, tóm tắt, bài học rút ra hoặc câu hỏi của bài học.</b></div><div class="drop" id="verbOnlyDrop"><b>Chọn file MP3 / audio</b><span class="muted">Tối đa 128 MB. File audio không được giữ lại sau khi xử lý.</span><input id="verbOnlyFile" type="file" accept="audio/*,.mp3" hidden></div><div class="muted" id="verbOnlyName" style="margin-top:8px">Chưa chọn file</div><div id="verbOnlyErr"></div><div class="modalActions"><button class="btn gold" id="verbOnlyGo">Phiên âm & lưu nguyên văn</button></div></div>`);
    const input=d.querySelector('#verbOnlyFile'),drop=d.querySelector('#verbOnlyDrop'),name=d.querySelector('#verbOnlyName'),btn=d.querySelector('#verbOnlyGo'),err=d.querySelector('#verbOnlyErr');
    let file=null;
    drop.onclick=()=>input.click();
    input.onchange=()=>{file=input.files?.[0]||null;name.textContent=file?.name||'Chưa chọn file'};
    const onProgress=e=>{
      if(!document.body.contains(d)){window.removeEventListener('theology-audio-progress',onProgress);return}
      const x=e.detail||{};
      if(x.phase==='upload')btn.textContent=x.total?`Đang tải audio… ${x.done||0}/${x.total}`:'Đang tải audio…';
      else if(x.phase==='segment')btn.textContent=x.total?`Chuẩn bị MP3… ${x.total} đoạn`:'Chuẩn bị MP3…';
      else if(x.phase==='decode_mp3')btn.textContent=`Đang chuyển MP3 → WAV… ${Math.min((x.done||0)+1,x.total||1)}/${x.total||1}`;
      else if(x.phase==='transcribe_segment')btn.textContent=`Đang phiên âm… ${x.done||0}/${x.total||0}`;
      else if(x.phase==='transcribe')btn.textContent='Đang phiên âm…';
      else if(x.phase==='summarize')btn.textContent='Đang hoàn tất bản nguyên văn…';
      else if(x.phase==='done')btn.textContent='Đang lưu nguyên văn…';
    };
    window.addEventListener('theology-audio-progress',onProgress);
    btn.onclick=async()=>{
      if(!file){err.innerHTML='<div class="error">Hãy chọn file MP3 / audio.</div>';return}
      if(file.size>128*1024*1024){err.innerHTML='<div class="error">File lớn hơn 128 MB.</div>';return}
      btn.disabled=true;err.innerHTML='';btn.textContent='Đang chuẩn bị…';
      try{
        const fd=new FormData();
        fd.append('mode','audio');
        fd.append('content_kind','verbatim_only');
        fd.append('target_type','verbatim');
        fd.append('target_lesson_id',lessonId);
        fd.append('target_lesson_title',lesson?.title||'');
        fd.append('file',file);
        const r=await fetch(AI,{method:'POST',headers:{'x-admin-pin':S.pin||''},body:fd});
        const raw=await r.text();let j={};try{j=raw?JSON.parse(raw):{}}catch{}
        if(!r.ok)throw new Error(errText(j?.error||j?.message||raw||('HTTP '+r.status)));
        const transcript=String(j?.lesson?.verbatim_transcript||j?.verbatim_transcript||'').trim();
        if(!transcript)throw new Error('Đã phiên âm nhưng không nhận được bản nguyên văn để lưu.');
        await verbatimOnlyApi('save',{lesson_id:lessonId,transcript});
        window.removeEventListener('theology-audio-progress',onProgress);
        d.remove();
        alert('Đã lưu Nguyên văn MP3. Nội dung bài học chính không bị thay đổi.');
        window.openVerbatimTranscript(lessonId);
      }catch(e){btn.disabled=false;btn.textContent='Phiên âm & lưu nguyên văn';err.innerHTML='<div class="error">'+esc(errText(e))+'</div>'}
    };
  }

  // Replace the earlier viewer so its upload button always uses the isolated transcript-only flow.
  window.openVerbatimTranscript=async function(lessonId){
    if(!S.pin){unlock(()=>window.openVerbatimTranscript(lessonId));return}
    const lesson=S.lessons.find(x=>x.id===lessonId)||S.selected;
    let loading=null;
    try{
      loading=overlay(`<div class="modal" style="max-width:460px;text-align:center"><h2>Đang lấy nguyên văn MP3…</h2><p class="muted">Bản nguyên văn chỉ được tải khi bạn yêu cầu.</p></div>`);
      const j=await verbatimOnlyApi('get',{lesson_id:lessonId});
      loading?.remove();loading=null;
      if(!j?.exists){
        const d=overlay(`<div class="modal" style="max-width:620px"><button class="x">×</button><h2>Nguyên văn MP3</h2><p>Bài <b>${esc(lesson?.title||'này')}</b> chưa có bản nguyên văn MP3 được lưu.</p><div class="verbatim-meta"><b>Lưu ý:</b> tải MP3 tại đây chỉ tạo bản nguyên văn riêng. Nội dung bài học chính sẽ không bị sửa hoặc ghi đè.</div><div class="modalActions"><button class="btn gold" id="verbOnlyUpload">🎙️ Tải MP3 chỉ để tạo nguyên văn</button></div></div>`);
        d.querySelector('#verbOnlyUpload').onclick=()=>{d.remove();openVerbatimOnlyUpload(lessonId)};
        return;
      }
      const transcript=String(j.transcript||'');
      const d=overlay(`<div class="modal" style="width:min(1040px,97vw)"><button class="x">×</button><h2>Nguyên văn MP3</h2><p class="muted"><b>${esc(lesson?.title||'')}</b></p><div class="verbatim-meta"><b>Nguyên văn phiên âm:</b> phần này được lưu riêng, không làm thay đổi bài học chính. Vì đây là nhận dạng giọng nói tự động, một số từ riêng/tên riêng vẫn có thể được nghe sai so với âm thanh gốc.</div><div class="verbatim-paper" id="verbatimText">${esc(transcript)}</div><div class="modalActions"><button class="btn white" id="verbCopy2">Sao chép toàn bộ</button><button class="btn white" id="verbPdf2">📄 Xuất PDF</button><button class="btn gold" id="verbClose2">Đóng</button></div></div>`);
      d.querySelector('#verbClose2').onclick=()=>d.remove();
      d.querySelector('#verbPdf2').onclick=()=>exportVerbatimOnlyPdf(lesson,transcript);
      d.querySelector('#verbCopy2').onclick=async()=>{const b=d.querySelector('#verbCopy2');try{await navigator.clipboard.writeText(transcript);b.textContent='Đã sao chép';setTimeout(()=>{if(document.body.contains(d))b.textContent='Sao chép toàn bộ'},1400)}catch{alert('Không sao chép được trên trình duyệt này.')}};
    }catch(e){loading?.remove();alert(errText(e))}
  };
})();
