// Optional per-lesson verbatim MP3 transcript: private, lazy-loaded, and never part of the public lesson payload.
(function(){
  const VERBATIM=SB+'/functions/v1/theology-verbatim';
  const pendingByContent=new WeakMap();

  const style=document.createElement('style');
  style.id='verbatim-transcript-style';
  style.textContent=`
    .verbatim-card{margin:26px 0 20px;padding:18px;border:1px solid #ded5c6;border-radius:16px;background:linear-gradient(135deg,#fbfaf6,#f6f0e4)}
    .verbatim-card h3{margin:0 0 7px!important;color:#17375f}.verbatim-card p{margin:0 0 13px;color:#687587;line-height:1.55;font-size:13px}
    .verbatim-paper{white-space:pre-wrap;line-height:1.78;background:#fffdf8;border:1px solid #e2dacd;border-radius:14px;padding:20px;max-height:62vh;overflow:auto;color:#26384d;font-family:Georgia,serif;font-size:16px}
    .verbatim-meta{margin:8px 0 14px;padding:10px 12px;border-radius:10px;background:#f8f4e9;color:#6b7481;font-size:12px;line-height:1.5}
    @media(max-width:650px){.verbatim-paper{padding:15px;font-size:15px;max-height:58vh}}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);

  async function verbatimApi(action,payload={}){
    const r=await fetch(VERBATIM,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':S.pin||''},body:JSON.stringify({action,...payload})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j?.error||'Không xử lý được bản nguyên văn MP3.');
    return j;
  }

  function exportVerbatimPdf(lesson,transcript){
    try{
      const title=String(lesson?.title||'Bài học');
      const body=`<h1>Nguyên văn MP3</h1><div class="meta">${pdfEsc(title)}</div><div style="margin:0 0 18px;padding:10px 12px;border-left:4px solid #d7ad4f;background:#fff9e9;color:#5f6875;font-size:10.5pt"><b>Nguyên văn phiên âm</b><br>Nội dung bên dưới được lấy từ bản nhận dạng giọng nói của MP3 và không được tóm tắt hay viết lại.</div><div style="white-space:pre-wrap;line-height:1.7;font-family:Georgia,'Times New Roman',serif;font-size:11.5pt">${pdfEsc(transcript)}</div><div class="footer-note">Thư Viện Thần Học · Nguyên văn MP3</div>`;
      openPrintablePdf(title+' - Nguyên văn MP3',body);
    }catch(e){console.error(e);alert('Không thể xuất PDF nguyên văn MP3.');}
  }

  // Remember the transcript only in memory while the preview is open.
  // It is stored privately only after the lesson itself saves successfully.
  const previewBeforeVerbatim=previewResult;
  previewResult=function(v,ctx){
    if(ctx?.mode==='audio'&&v?.verbatim_transcript&&Array.isArray(v?.main_content)){
      pendingByContent.set(v.main_content,String(v.verbatim_transcript));
    }
    return previewBeforeVerbatim(v,ctx);
  };

  const admBeforeVerbatim=adm;
  adm=async function(action,payload={},pin=S.pin){
    let transcript='',contentKey=null;
    if(action==='save_lesson'&&Array.isArray(payload?.lesson?.main_content)&&pendingByContent.has(payload.lesson.main_content)){
      contentKey=payload.lesson.main_content;
      transcript=pendingByContent.get(contentKey)||'';
    }
    const result=await admBeforeVerbatim(action,payload,pin);
    if(transcript){
      const lessonId=result?.lesson?.id||payload?.lesson?.id;
      if(!lessonId)throw new Error('Đã lưu bài nhưng chưa xác định được lesson_id để lưu nguyên văn MP3.');
      await verbatimApi('save',{lesson_id:lessonId,transcript});
      if(contentKey)pendingByContent.delete(contentKey);
    }
    return result;
  };

  function preselectAudioLesson(lessonId){
    uploadRoutingModal('audio');
    setTimeout(()=>{
      const overlays=[...document.querySelectorAll('.overlay')],d=overlays[overlays.length-1];
      if(!d)return;
      const kind=d.querySelector('#contentKind');
      if(kind){kind.value='lesson';kind.dispatchEvent(new Event('change',{bubbles:true}));}
      const target=d.querySelector('#lessonTarget');
      if(target){target.value=lessonId;target.dispatchEvent(new Event('change',{bubbles:true}));}
      const hint=d.querySelector('#targetHint');
      if(hint)hint.textContent='MP3 này sẽ được xử lý cho bài đang mở. Bản nguyên văn sẽ được lưu riêng và chỉ tải khi bạn bấm “Nguyên văn MP3”.';
    },0);
  }

  window.openVerbatimTranscript=async function(lessonId){
    if(!S.pin){unlock(()=>window.openVerbatimTranscript(lessonId));return;}
    const lesson=S.lessons.find(x=>x.id===lessonId)||S.selected;
    let loading=null;
    try{
      loading=overlay(`<div class="modal" style="max-width:460px;text-align:center"><h2>Đang lấy nguyên văn MP3…</h2><p class="muted">Bản nguyên văn chỉ được tải khi bạn yêu cầu.</p></div>`);
      const j=await verbatimApi('get',{lesson_id:lessonId});
      loading?.remove();loading=null;
      if(!j?.exists){
        const d=overlay(`<div class="modal" style="max-width:600px"><button class="x">×</button><h2>Nguyên văn MP3</h2><p>Bài <b>${esc(lesson?.title||'này')}</b> chưa có bản nguyên văn MP3 được lưu.</p><div class="verbatim-meta">Nếu đây là bài đã tải MP3 trước khi tính năng này được thêm vào, app không thể khôi phục lời nói đã bỏ đi vì file audio cũ không được lưu. Bạn chỉ cần tải lại MP3 vào bài này một lần.</div><div class="modalActions"><button class="btn gold" id="verbUpload">🎙️ Tải MP3 cho bài này</button></div></div>`);
        d.querySelector('#verbUpload').onclick=()=>{d.remove();preselectAudioLesson(lessonId)};
        return;
      }
      const transcript=String(j.transcript||'');
      const d=overlay(`<div class="modal" style="width:min(1040px,97vw)"><button class="x">×</button><h2>Nguyên văn MP3</h2><p class="muted"><b>${esc(lesson?.title||'')}</b></p><div class="verbatim-meta"><b>Nguyên văn phiên âm:</b> nội dung dưới đây không được tóm tắt, viết lại hay sắp xếp lại. Vì đây là nhận dạng giọng nói tự động, một số từ riêng/tên riêng vẫn có thể được nghe sai so với âm thanh gốc.</div><div class="verbatim-paper" id="verbatimText">${esc(transcript)}</div><div class="modalActions"><button class="btn white" id="verbCopy">Sao chép toàn bộ</button><button class="btn white" id="verbPdf">📄 Xuất PDF</button><button class="btn gold" id="verbClose">Đóng</button></div></div>`);
      d.querySelector('#verbClose').onclick=()=>d.remove();
      d.querySelector('#verbPdf').onclick=()=>exportVerbatimPdf(lesson,transcript);
      d.querySelector('#verbCopy').onclick=async()=>{const b=d.querySelector('#verbCopy');try{await navigator.clipboard.writeText(transcript);b.textContent='Đã sao chép';setTimeout(()=>{if(document.body.contains(d))b.textContent='Sao chép toàn bộ'},1400)}catch{alert('Không sao chép được trên trình duyệt này.')}};
    }catch(e){loading?.remove();alert(e?.message||String(e));}
  };

  const detailBeforeVerbatim=detail;
  detail=function(){
    let h=detailBeforeVerbatim();
    const l=S.selected;if(!l||!l.id||typeof h!=='string')return h;
    const card=`<section class="verbatim-card"><h3>🎙️ Nguyên văn MP3</h3><p>Bản phiên âm đầy đủ của lời nói/bài chia sẻ trong MP3. Phần này được lưu riêng và chỉ tải khi bạn bấm mở.</p><button class="btn white" onclick="openVerbatimTranscript('${l.id}')">Mở nguyên văn MP3</button></section>`;
    const quiz='<h3>Câu hỏi trắc nghiệm</h3>';
    if(h.includes(quiz))return h.replace(quiz,card+quiz);
    return h.replace('</article>',card+'</article>');
  };
})();
