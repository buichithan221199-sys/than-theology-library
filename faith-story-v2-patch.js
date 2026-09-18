// Faith Story v2: documented real person + real event/place + one-line takeaway + short heartfelt prayer.
(function(){
  const DEVOTIONAL=SB+'/functions/v1/theology-devotional';
  const IMAGE=SB+'/functions/v1/theology-image';
  function cleanFaithGeneratedText(v){let s=String(v||'');s=s.replace(/\[([^\]\n]{1,160})\]\s*\((https?:\/\/[^)]+)\)/gi,' ');s=s.replace(/\[(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\]\s]*)?\]/gi,' ');s=s.replace(/\(https?:\/\/[^)]+\)/gi,' ');s=s.replace(/https?:\/\/\S+/gi,' ');s=s.replace(/cite[^]+/g,' ');s=s.replace(/\[(?:nguồn|source|citation)[^\]]*\]/gi,' ');return s.replace(/[ \t]+/g,' ').replace(/\s+([,.;:!?])/g,'$1').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
  function ensureFaithPrayerEnding(v){let s=cleanFaithGeneratedText(v).trim();s=s.replace(/\s*Trong\s+Danh\s+Chúa\s+Giê[- ]?Xu[\s,.!;:-]*A[- ]?Men[.!\s]*$/iu,'').trim();return (s?s+'\n\n':'')+'Trong Danh Chúa Giê-Xu. A-Men.'}

  async function makeCover(l,kind){
    try{
      const r=await fetch(IMAGE,{method:'POST',headers:{'content-type':'application/json','x-admin-pin':S.pin},body:JSON.stringify({lesson_id:l.id,title:l.title,scripture_reference:l.scripture_reference,summary:l.summary,kind})});
      const j=await r.json();
      if(!r.ok)throw Error(j.error||'Không tạo được ảnh');
      return j.url||'';
    }catch(e){console.warn('Cover generation failed',e);return ''}
  }

  function previewV2(v,kind){
    const isStory=kind==='faith_story';
    if(isStory)v={...v,title:cleanFaithGeneratedText(v?.title),summary:cleanFaithGeneratedText(v?.summary),application:cleanFaithGeneratedText(v?.application)};v={...v,prayer:ensureFaithPrayerEnding(v?.prayer)};
    const sourceCount=Array.isArray(v?.source_urls)?v.source_urls.length:0;
    const d=overlay(`<div class="modal" style="width:min(900px,96vw)"><button class="x">×</button><h2>Xem trước</h2>
      <div class="field"><label>Tiêu đề</label><input id="t" value="${esc(v.title||'')}"></div>
      <div class="field"><label>Phân đoạn Kinh Thánh</label><input id="sr" value="${esc(v.scripture_reference||'')}"></div>
      ${sourceCount?`<div class="muted" style="margin:-4px 0 12px">✓ Câu chuyện đời thật đã được đối chiếu qua ${sourceCount} nguồn web công khai.</div>`:''}
      ${v.key_verse_1925?`<div class="field"><label>Câu gốc · Bản 1925</label><textarea id="kv" rows="3">${esc(v.key_verse_1925)}</textarea></div>`:''}
      <div class="field"><label>${isStory?'Câu chuyện đức tin · người thật · sự kiện thật · địa điểm thật · tối đa 500 chữ':'Suy ngẫm ngắn'}</label><textarea id="sum" rows="${isStory?16:6}">${esc(v.summary||'')}</textarea></div>
      ${isStory?`<div class="field"><label>Bài học rút ra · đúng 1 câu</label><textarea id="app" rows="3">${esc(v.application||'')}</textarea></div>`:''}
      <div class="field"><label>Lời cầu nguyện ngắn · kết thúc bằng “Trong Danh Chúa Giê-Xu. A-Men.”</label><textarea id="pr" rows="7">${esc(v.prayer||'')}</textarea></div>
      <div id="err"></div><div class="modalActions"><button class="btn gold" id="save">Lưu + tạo ảnh minh họa</button></div></div>`);
    d.querySelector('#save').onclick=async()=>{
      const b=d.querySelector('#save');
      try{
        b.disabled=true;b.textContent='Đang lưu…';
        const summary=d.querySelector('#sum').value.trim();
        if(isStory&&summary.split(/\s+/).filter(Boolean).length>500){throw Error('Câu chuyện đức tin tối đa 500 chữ. Vui lòng rút ngắn trước khi lưu.')}
        const lesson={title:d.querySelector('#t').value.trim(),summary,scripture_reference:d.querySelector('#sr').value.trim(),key_verse_reference:v.key_verse_reference||'',key_verse_1925:d.querySelector('#kv')?.value.trim()||'',subtitle:v.subtitle||'',teacher:'',introduction:'',background:'',transition_text:'',application:isStory?(d.querySelector('#app')?.value.trim()||''):'',prayer:ensureFaithPrayerEnding(d.querySelector('#pr').value),main_content:[],reflection_questions:[],tags:v.tags||[],source_kind:kind,source_notes:Array.isArray(v?.source_urls)?v.source_urls.join('\n'):'',is_published:true,folder_slug:isStory?'faith-stories':'short-prayers'};
        const res=await adm('save_lesson',{lesson});
        d.remove();
        await makeCover(res.lesson,kind);
        await load();
        S.selected=S.lessons.find(x=>x.id===res.lesson.id)||res.lesson;
        S.tab=isStory?'faith-detail':'prayer-detail';
        render();
      }catch(e){b.disabled=false;b.textContent='Lưu + tạo ảnh minh họa';d.querySelector('#err').innerHTML='<div class="error">'+esc(e.message)+'</div>'}
    };
  }

  window.openDevotionalComposer=function(kind){
    if(!S.pin){unlock();return}
    const isStory=kind==='faith_story';
    const label=isStory?'Câu chuyện đức tin':'Lời cầu nguyện ngắn';
    const help=isStory
      ?'Tạo theo Kinh Thánh hoặc theo chủ đề. Riêng chế độ Theo chủ đề, app sẽ tìm một câu chuyện đời thật gần gũi trước; Kinh Thánh chỉ dùng để soi sáng và ứng dụng, không kể lại câu chuyện Kinh Thánh làm nội dung chính.'
      :'AI sẽ tạo suy ngẫm và lời cầu nguyện ngắn dựa trên Kinh Thánh.';
    const storyMode=isStory?`<div class="field"><label>Tạo câu chuyện theo</label><select id="storyMode"><option value="scripture">Theo câu / phân đoạn Kinh Thánh</option><option value="topic">Theo chủ đề · câu chuyện đời thật</option></select></div>`:'';
    const scriptureBox=`<div class="field" id="scriptureBox"><label>Câu / phân đoạn Kinh Thánh</label><textarea id="src" rows="8" placeholder="Ví dụ: Thi Thiên 23:1-4 hoặc dán nguyên văn phân đoạn..."></textarea></div>`;
    const topicBox=isStory?`<div class="field hidden" id="topicBox"><label>Chủ đề</label><textarea id="topic" rows="5" placeholder="Ví dụ: tha thứ, kiên trì, đức tin khi chờ đợi, khi bị hiểu lầm, trung tín trong thử thách..."></textarea><div class="muted" style="margin-top:6px">AI sẽ tìm và đối chiếu một câu chuyện có thật trong đời sống: người thật, sự kiện thật, địa điểm thật. Câu chuyện sẽ gần gũi và đi sâu vào lòng người đọc; sau đó mới liên hệ với một phân đoạn Kinh Thánh phù hợp. Không dùng câu chuyện Kinh Thánh làm câu chuyện chính.</div></div>`:'';
    const d=overlay(`<div class="modal"><button class="x">×</button><h2>Tạo ${label}</h2><p class="muted">${help}</p>${storyMode}${scriptureBox}${topicBox}<div id="err"></div><div class="modalActions"><button class="btn gold" id="go">Tạo & xem trước</button></div></div>`);
    const modeEl=d.querySelector('#storyMode'),scripture=d.querySelector('#scriptureBox'),topic=d.querySelector('#topicBox');
    const syncMode=()=>{if(!isStory)return;const byTopic=modeEl.value==='topic';scripture?.classList.toggle('hidden',byTopic);topic?.classList.toggle('hidden',!byTopic)};
    if(modeEl){modeEl.onchange=syncMode;syncMode()}
    d.querySelector('#go').onclick=async()=>{
      const mode=isStory?(modeEl?.value||'scripture'):'scripture';
      const text=d.querySelector('#src')?.value.trim()||'';
      const topicText=d.querySelector('#topic')?.value.trim()||'';
      if(mode==='topic'&&!topicText){d.querySelector('#err').innerHTML='<div class="error">Chưa nhập chủ đề.</div>';return}
      if(mode!=='topic'&&!text){d.querySelector('#err').innerHTML='<div class="error">Chưa nhập câu hoặc phân đoạn Kinh Thánh.</div>';return}
      const b=d.querySelector('#go');
      try{
        b.disabled=true;b.textContent=mode==='topic'?'Đang tìm câu chuyện thật…':'Đang tạo…';
        const fd=new FormData();
        fd.append('content_kind',kind);
        fd.append('creation_mode',mode);
        fd.append('text',text);
        fd.append('topic',topicText);
        const r=await fetch(DEVOTIONAL,{method:'POST',body:fd});
        const j=await r.json();if(!r.ok)throw Error(j.error||'Không tạo được nội dung');
        d.remove();previewV2(j.lesson||j,kind);
      }catch(e){b.disabled=false;b.textContent='Tạo & xem trước';d.querySelector('#err').innerHTML='<div class="error">'+esc(e.message)+'</div>'}
    };
  };

  const oldRenderFaithV2=render;
  render=function(){
    oldRenderFaithV2();
    document.querySelectorAll('.devotional-detail h3').forEach(h=>{if(h.textContent.trim()==='Bài học & áp dụng')h.textContent='Bài học rút ra'});
  };

  window.exportDevotionalPdf=function(kind){
    const l=S.selected;if(!l)return;
    const title=kind==='faith_story'?'Câu chuyện đức tin':'Lời cầu nguyện ngắn';
    const image=l.cover_image_url?`<img src="${pdfEsc(l.cover_image_url)}" style="width:100%;height:260px;object-fit:cover;border-radius:12px;margin-bottom:18px">`:'';
    const body=`${image}<h1>${pdfEsc(l.title||title)}</h1>${l.scripture_reference?`<div class="meta">Kinh Thánh: ${pdfEsc(l.scripture_reference)}</div>`:''}${l.key_verse_1925?`<div class="verse"><b>${pdfEsc(l.key_verse_reference||'Câu gốc · Bản 1925')}</b><br>${pdfEsc(l.key_verse_1925)}</div>`:''}${kind==='faith_story'?`<h2>Câu chuyện đức tin</h2><p>${pdfEsc(l.summary||'')}</p>${l.application?`<h2>Bài học rút ra</h2><p>${pdfEsc(l.application)}</p>`:''}`:`${l.summary?`<h2>Suy ngẫm</h2><p>${pdfEsc(l.summary)}</p>`:''}`}<h2>Lời cầu nguyện ngắn</h2><p>${pdfEsc(l.prayer||'')}</p><div class="footer-note">Thư Viện Thần Học · Hành trình đức tin</div>`;
    openPrintablePdf((l.title||title)+' - '+title,body);
  };
})();
