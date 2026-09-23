// Ensure uploaded lesson sources update the selected lesson record, not only attachments.
(function(){
  const oldMediaSourcePreview=window.mediaSourcePreview;

  function pickText(oldValue,newValue){
    const n=String(newValue??'').trim();
    return n?n:(oldValue??'');
  }
  function pickArray(oldValue,newValue){
    return Array.isArray(newValue)&&newValue.length?newValue:(Array.isArray(oldValue)?oldValue:[]);
  }

  window.mediaSourcePreview=function(v,ctx){
    const lesson=S.lessons.find(x=>x.id===ctx.lessonId);
    if(!lesson)return oldMediaSourcePreview?.(v,ctx);
    const transcript=v?.source_transcript||'';
    const pointCount=Array.isArray(v?.main_content)?v.main_content.length:0;
    const d=overlay(`<div class="modal" style="width:min(920px,96vw)"><button class="x">×</button><h2>Xem trước bài học</h2><p class="muted">Nội dung AI sẽ cập nhật trực tiếp vào: <b>${esc(lesson.title||'')}</b>. Bộ trắc nghiệm hiện có được giữ nguyên.</p><div class="field"><label>Tiêu đề nguồn</label><input id="mt" value="${esc(v?.title||'Tài liệu bài học')}"></div><div class="field"><label>Tóm tắt</label><textarea id="ms" rows="5">${esc(v?.summary||'')}</textarea></div><div class="muted" style="margin:8px 0 14px">${pointCount?`AI đã tạo ${pointCount} ý chính cho bài học.`:'AI chưa tạo ý chính; các phần hiện có của bài sẽ được giữ lại nếu dữ liệu mới để trống.'}</div><div class="field"><label>Nội dung nguồn đã đọc</label><textarea id="mx" rows="12">${esc(transcript)}</textarea></div><div id="saveLessonUploadErr"></div><div class="modalActions"><button class="btn gold" id="save">Cập nhật bài học + lưu file nguồn</button></div></div>`);

    d.querySelector('#save').onclick=async()=>{
      const b=d.querySelector('#save');b.disabled=true;b.textContent='Đang cập nhật…';
      const err=d.querySelector('#saveLessonUploadErr');
      try{
        const updated={
          id:lesson.id,
          folder_id:lesson.folder_id||null,
          title:lesson.title||v?.title||'Bài học',
          subtitle:pickText(lesson.subtitle,v?.subtitle),
          scripture_reference:pickText(lesson.scripture_reference,v?.scripture_reference),
          key_verse_reference:pickText(lesson.key_verse_reference,v?.key_verse_reference),
          key_verse_1925:pickText(lesson.key_verse_1925,v?.key_verse_1925),
          teacher:pickText(lesson.teacher,v?.teacher),
          lesson_date:lesson.lesson_date||v?.lesson_date||null,
          summary:d.querySelector('#ms').value.trim()||pickText(lesson.summary,v?.summary),
          introduction:pickText(lesson.introduction,v?.introduction),
          background:pickText(lesson.background,v?.background),
          transition_text:pickText(lesson.transition_text,v?.transition_text),
          main_content:pickArray(lesson.main_content,v?.main_content),
          application:pickText(lesson.application,v?.application),
          reflection_questions:pickArray(lesson.reflection_questions,v?.reflection_questions),
          prayer:pickText(lesson.prayer,v?.prayer),
          tags:pickArray(lesson.tags,v?.tags),
          cover_image_url:lesson.cover_image_url||v?.cover_image_url||null,
          source_kind:v?.source_kind||ctx?.mode||lesson.source_kind||'uploaded',
          source_notes:lesson.source_notes||'',
          is_published:lesson.is_published!==false
        };

        // Save the visible lesson content first. Quiz rows are stored separately and are untouched.
        await adm('save_lesson',{lesson:updated});

        const warnings=[];
        try{await saveOriginalAttachments(ctx.lessonId,ctx.files||[],'lesson_source')}catch(e){warnings.push('File nguồn chưa lưu được: '+(e?.message||String(e)))}
        try{
          const text=d.querySelector('#mx').value.trim();
          const label=d.querySelector('#mt').value.trim()||'tai-lieu';
          await saveTranscriptAttachment(ctx.lessonId,text,label,'lesson_source');
        }catch(e){warnings.push('Bản text nguồn chưa lưu được: '+(e?.message||String(e)))}

        d.remove();
        await load();
        S.selected=S.lessons.find(x=>x.id===ctx.lessonId)||null;
        S.tab=S.selected?'detail':'lessons';
        render();
        if(warnings.length)alert('Nội dung bài học đã được cập nhật.\n\n'+warnings.join('\n'));
        else alert('Đã cập nhật nội dung bài học và lưu file nguồn.');
      }catch(e){
        b.disabled=false;b.textContent='Cập nhật bài học + lưu file nguồn';
        err.innerHTML='<div class="error">'+esc(e?.message||String(e))+'</div>';
      }
    };
  };
  try{mediaSourcePreview=window.mediaSourcePreview}catch{}
})();
