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
    const creationMode=v?.creation_mode||v?.__creation_mode||'';
    if(isStory)v={...v,title:cleanFaithGeneratedText(v?.title),summary:cleanFaithGeneratedText(v?.summary),application:cleanFaithGeneratedText(v?.application)};v={...v,prayer:ensureFaithPrayerEnding(v?.prayer)};
    const sourceCount=Array.isArray(v?.source_urls)?v.source_urls.length:0;
    const d=overlay(`<div class="modal" style="width:min(900px,96vw)"><button class="x">×</button><h2>Xem trước</h2>
      <div class="field"><label>Tiêu đề</label><input id="t" value="${esc(v.title||'')}"></div>
      <div class="field"><label>Phân đoạn Kinh Thánh</label><input id="sr" value="${esc(v.scripture_reference||'')}"></div>
      ${sourceCount?`<div class="muted" style="margin:-4px 0 12px">✓ Câu chuyện đời thật đã được đối chiếu qua ${sourceCount} nguồn web công khai.</div>`:''}
      ${!isStory?`<div class="field"><label>Nội dung câu Kinh Thánh · Bản Truyền Thống 1925 (kiểm tra trước khi lưu)</label><textarea id="kv" rows="4" placeholder="Nhập nguyên văn câu Kinh Thánh đúng với phân đoạn bên trên...">${esc(v.key_verse_1925||'')}</textarea></div>`:v.key_verse_1925?`<div class="field"><label>Câu gốc · Bản 1925</label><textarea id="kv" rows="3">${esc(v.key_verse_1925)}</textarea></div>`:''}
      <div class="field"><label>${isStory?(creationMode==='topic_bible'?'Câu chuyện Kinh Thánh · theo chủ đề · tối đa 500 chữ':creationMode==='topic'?'Câu chuyện đời thật · người thật · sự kiện thật · địa điểm thật · tối đa 500 chữ':'Câu chuyện đức tin · tối đa 500 chữ'):'Suy ngẫm ngắn'}</label><textarea id="sum" rows="${isStory?16:6}">${esc(v.summary||'')}</textarea></div>
      <div class="field"><label>${isStory?'Bài học rút ra · đúng 1 câu':'Lời Chúa an ủi, khích lệ · giải thích và áp dụng'}</label><textarea id="app" rows="${isStory?3:7}">${esc(v.application||'')}</textarea></div>
      <div class="field"><label>Lời cầu nguyện · kết thúc bằng “Trong Danh Chúa Giê-Xu. A-Men.”</label><textarea id="pr" rows="12">${esc(v.prayer||'')}</textarea></div>
      <div id="err"></div><div class="modalActions"><button class="btn gold" id="save">Lưu + tạo ảnh minh họa</button></div></div>`);
    d.querySelector('#save').onclick=async()=>{
      const b=d.querySelector('#save');
      try{
        b.disabled=true;b.textContent='Đang lưu…';
        const summary=d.querySelector('#sum').value.trim();
        if(isStory&&summary.split(/\s+/).filter(Boolean).length>500){throw Error('Câu chuyện đức tin tối đa 500 chữ. Vui lòng rút ngắn trước khi lưu.')}
        const lesson={title:d.querySelector('#t').value.trim(),summary,scripture_reference:d.querySelector('#sr').value.trim(),key_verse_reference:v.key_verse_reference||'',key_verse_1925:d.querySelector('#kv')?.value.trim()||'',subtitle:v.subtitle||'',teacher:'',introduction:'',background:'',transition_text:'',application:d.querySelector('#app')?.value.trim()||'',prayer:ensureFaithPrayerEnding(d.querySelector('#pr').value),main_content:[],reflection_questions:[],tags:v.tags||[],source_kind:kind,source_notes:Array.isArray(v?.source_urls)?v.source_urls.join('\n'):'',is_published:true,folder_slug:isStory?'faith-stories':'short-prayers'};
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
    const help=isStory?'Có 3 cách tạo: theo câu Kinh Thánh, theo chủ đề bằng câu chuyện đời thật, hoặc câu chuyện Kinh Thánh.':'Tạo lời cầu nguyện cá nhân theo hoàn cảnh, nan đề hoặc phân đoạn Kinh Thánh.';
    const modeOptions=isStory?'<option value="scripture">Theo câu / phân đoạn Kinh Thánh</option><option value="topic">Theo chủ đề · câu chuyện đời thật</option><option value="topic_bible">Theo chủ đề · câu chuyện Kinh Thánh</option>':'<option value="personal">Theo chủ đề / hoàn cảnh / nan đề cá nhân</option><option value="scripture">Theo câu / phân đoạn Kinh Thánh</option>';
    const d=overlay(`<div class="modal"><button class="x">×</button><h2>Tạo ${label}</h2><p class="muted">${help}</p><div class="field"><label>${isStory?'Tạo câu chuyện theo':'Tạo lời cầu nguyện theo'}</label><select id="storyMode">${modeOptions}</select></div><div class="field" id="scriptureBox"><label>Câu / phân đoạn Kinh Thánh</label><textarea id="src" rows="7" placeholder="Ví dụ: Thi Thiên 23:1-4 hoặc dán nguyên văn phân đoạn..."></textarea></div><div class="field" id="topicBox"><label id="topicLabel">Chủ đề / hoàn cảnh / nan đề</label><textarea id="topic" rows="6" placeholder="Ví dụ: Con đang mệt mỏi, áp lực công việc và cần sức mới từ Chúa..."></textarea><div class="muted" id="topicHelp" style="margin-top:6px"></div>${!isStory?'<div class="devotional-actions" style="margin-top:12px"><button type="button" class="btn white" data-prayer-example="Con đang mệt mỏi, kiệt sức cả thể chất và tinh thần. Xin Chúa ban cho con sự nghỉ ngơi, bình an và sức mới.">Khi bản thân mệt mỏi</button><button type="button" class="btn white" data-prayer-example="Con đang gặp khó khăn và thử thách trong cuộc sống. Xin Chúa giúp con vững tin và vượt qua.">Vượt qua khó khăn</button><button type="button" class="btn white" data-prayer-example="Con đang lo lắng và áp lực, xin Chúa ban bình an cho lòng con.">Lo lắng, áp lực</button><button type="button" class="btn white" data-prayer-example="Con đang đau bệnh, xin Chúa nâng đỡ, thêm sức và giúp con được chữa lành.">Đau bệnh</button><button type="button" class="btn white" data-prayer-example="Con đang gặp khó khăn tài chính và công việc, xin Chúa ban sự khôn ngoan để con vượt qua.">Công việc, tài chính</button><button type="button" class="btn white" data-prayer-example="Con đang gặp vấn đề trong gia đình, xin Chúa giúp con yêu thương, tha thứ và sống hòa thuận.">Gia đình</button></div>':''}</div><div id="err"></div><div class="modalActions"><button class="btn gold" id="go">Tạo & xem trước</button></div></div>`);
    const modeEl=d.querySelector('#storyMode'),scripture=d.querySelector('#scriptureBox'),topic=d.querySelector('#topicBox'),topicHelp=d.querySelector('#topicHelp');
    const syncMode=()=>{const mode=modeEl.value;const byTopic=mode!=='scripture';scripture.classList.toggle('hidden',byTopic);topic.classList.toggle('hidden',!byTopic);if(topicHelp)topicHelp.textContent=mode==='topic_bible'?'AI sẽ chọn câu chuyện Kinh Thánh phù hợp.':mode==='topic'?'AI sẽ tìm một câu chuyện đời thật phù hợp.':mode==='personal'?'AI sẽ viết lời cầu nguyện ngôi thứ nhất, xưng con, trực tiếp thưa với Chúa.':''};
    modeEl.onchange=syncMode;syncMode();
    d.querySelectorAll('[data-prayer-example]').forEach(b=>b.onclick=()=>{modeEl.value='personal';syncMode();d.querySelector('#topic').value=b.dataset.prayerExample;d.querySelector('#topic').focus()});
    d.querySelector('#go').onclick=async()=>{const mode=modeEl.value;const scriptureText=d.querySelector('#src').value.trim(),topicText=d.querySelector('#topic').value.trim();if(mode==='scripture'?!scriptureText:!topicText){d.querySelector('#err').innerHTML='<div class="error">Vui lòng nhập câu Kinh Thánh hoặc hoàn cảnh cần cầu nguyện.</div>';return}const b=d.querySelector('#go');try{b.disabled=true;b.textContent='Đang tạo…';const fd=new FormData();fd.append('content_kind',kind);fd.append('creation_mode',mode);fd.append('text',scriptureText);fd.append('topic',topicText);const r=await fetch(DEVOTIONAL,{method:'POST',headers:{'x-admin-pin':S.pin},body:fd});const j=await r.json();if(!r.ok)throw Error(j.error||'Không tạo được nội dung');const vv=j.lesson||j;vv.__creation_mode=j.creation_mode||mode;d.remove();previewV2(vv,kind)}catch(e){b.disabled=false;b.textContent='Tạo & xem trước';d.querySelector('#err').innerHTML='<div class="error">'+esc(e.message)+'</div>'}};
  };

  const oldRenderFaithV2=render;
  render=function(){
    oldRenderFaithV2();
    document.querySelectorAll('.devotional-detail h3').forEach(h=>{if(h.textContent.trim()==='Bài học & áp dụng')h.textContent='Bài học rút ra'});
  };

  window.exportDevotionalPdf=function(kind){
    const l=S.selected;if(!l)return;
    const title=kind==='faith_story'?'Câu chuyện đức tin':'Lời cầu nguyện';
    const image=l.cover_image_url?`<img src="${pdfEsc(l.cover_image_url)}" style="width:100%;height:260px;object-fit:cover;border-radius:12px;margin-bottom:18px">`:'';
    const body=`${image}<h1>${pdfEsc(l.title||title)}</h1>${l.scripture_reference?`<div class="meta">Kinh Thánh: ${pdfEsc(l.scripture_reference)}</div>`:''}${l.key_verse_1925?`<div class="verse"><b>${pdfEsc(l.key_verse_reference||'Câu gốc · Bản 1925')}</b><br>${pdfEsc(l.key_verse_1925)}</div>`:''}${kind==='faith_story'?`<h2>Câu chuyện đức tin</h2><p>${pdfEsc(l.summary||'')}</p>${l.application?`<h2>Bài học rút ra</h2><p>${pdfEsc(l.application)}</p>`:''}`:`${l.summary?`<h2>Suy ngẫm</h2><p>${pdfEsc(l.summary)}</p>`:''}`}<h2>Lời cầu nguyện</h2><p>${pdfEsc(l.prayer||'')}</p>${kind!=='faith_story'&&(l.scripture_reference||l.application)?`<h2>Lời Chúa an ủi, khích lệ</h2>${l.scripture_reference?`<p><b>${pdfEsc(l.scripture_reference)}</b></p>`:''}${l.application?`<p>${pdfEsc(l.application)}</p>`:''}`:''}<div class="footer-note">Thư Viện Thần Học · Hành trình đức tin</div>`;
    openPrintablePdf((l.title||title)+' - '+title,body);
  };
})();
