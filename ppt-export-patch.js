// Illustrated PowerPoint export for lessons. Generates .pptx in the browser and does not store files in Supabase.
(function(){
  const CDN='https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
  const TRANSLATE=SB+'/functions/v1/theology-translate-export';
  const IMG={bible:'https://unsplash.com/photos/2dE06Y4GSZk/download?force=true&w=1600',study:'https://unsplash.com/photos/52DIsLNYTKs/download?force=true&w=1400',cross:'https://unsplash.com/photos/ITiJrBI3XnE/download?force=true&w=1400',library:'https://unsplash.com/photos/UolPvs1rBk8/download?force=true&w=1400',scripture:'https://unsplash.com/photos/EOwN2FTGjc0/download?force=true&w=1400'};
  const cache={};
  const clean=v=>String(v||'').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();
  const fileName=v=>String(v||'PowerPoint').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90)||'PowerPoint';
  function box(text){try{return overlay(`<div class="modal" style="max-width:440px;text-align:center"><h2>${esc(text)}</h2><p class="muted">PowerPoint được tạo tạm trên thiết bị, không lưu vào app.</p></div>`)}catch{return null}}
  function showPptReady(blob,name){
    try{
      if(window.__theologyPptUrl){try{URL.revokeObjectURL(window.__theologyPptUrl)}catch{}}
      const url=URL.createObjectURL(blob);window.__theologyPptUrl=url;
      const d=overlay(`<div class="modal" style="max-width:520px"><button class="x">×</button><h2>PowerPoint đã sẵn sàng</h2><p class="muted">File đã tạo xong. Chọn một cách bên dưới để lưu vào thiết bị.</p><div style="display:grid;gap:10px;margin-top:18px"><button class="btn gold" id="pptDownloadReady" style="min-height:54px">⬇️ Tải PowerPoint</button><button class="btn white" id="pptShareReady" style="min-height:54px">📤 Chia sẻ / Lưu vào Tệp</button></div><p class="muted" style="margin-top:14px">File chỉ tồn tại tạm trong trình duyệt và không được lưu vào app.</p></div>`);
      const close=d.querySelector('.x');if(close)close.addEventListener('click',()=>{setTimeout(()=>{try{URL.revokeObjectURL(url)}catch{};if(window.__theologyPptUrl===url)window.__theologyPptUrl=''},3000)},{once:true});
      d.querySelector('#pptDownloadReady').onclick=()=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()};
      const share=d.querySelector('#pptShareReady');
      const file=new File([blob],name,{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        share.onclick=async()=>{try{await navigator.share({files:[file],title:name})}catch(e){if(e?.name!=='AbortError')alert('Không mở được bảng chia sẻ. Hãy dùng nút Tải PowerPoint.')}};
      }else{
        share.style.display='none';
      }
    }catch(e){
      console.error(e);alert('PowerPoint đã tạo xong nhưng không mở được nút tải. Hãy thử lại.');
    }
  }
  function choose(run){const d=overlay(`<div class="modal" style="max-width:560px"><button class="x">×</button><h2>Xuất PowerPoint</h2><p class="muted">File .pptx sẽ có ảnh minh họa và tải về thiết bị. App không lưu file này nên không làm đầy bộ nhớ.</p><div class="field"><label>Ngôn ngữ</label><select id="pptLang"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div><div class="field"><label>Nội dung</label><select id="pptKind"><option value="lesson">Bài học</option><option value="lesson_quiz">Bài học + trắc nghiệm</option><option value="quiz">Chỉ trắc nghiệm</option><option value="quiz_answers">Trắc nghiệm + đáp án</option></select></div><div class="modalActions"><button class="btn gold" id="pptGo">Tạo PowerPoint</button></div></div>`);d.querySelector('#pptGo').onclick=()=>{const opt={lang:d.querySelector('#pptLang').value,kind:d.querySelector('#pptKind').value};d.remove();run(opt)}}
  async function ensure(){if(window.PptxGenJS)return;await new Promise((res,rej)=>{const old=document.querySelector('script[data-pptxgen]');if(old){old.addEventListener('load',res,{once:true});old.addEventListener('error',()=>rej(new Error('Không tải được thư viện PowerPoint. Hãy kiểm tra mạng rồi thử lại.')),{once:true});return}const s=document.createElement('script');s.src=CDN;s.async=true;s.dataset.pptxgen='1';s.onload=res;s.onerror=()=>rej(new Error('Không tải được thư viện PowerPoint. Hãy kiểm tra mạng rồi thử lại.'));document.head.appendChild(s)});if(!window.PptxGenJS)throw new Error('Trình duyệt chưa sẵn sàng tạo PowerPoint.')}
  async function translate(payload,kind){const r=await fetch(TRANSLATE,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target_language:'en',kind,payload})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Không dịch được nội dung PowerPoint.');return j.translated}
  function imgFor(text,l){if(l?.cover_image_url)return l.cover_image_url;const t=String(text||'').toLowerCase();if(/thập tự|cầu nguyện|jesus|christ|đức tin|chúa/.test(t))return IMG.cross;if(/kinh thánh|cựu ước|tân ước|thi thiên|châm ngôn|sáng thế|xuất ê|ma-thi|công vụ/.test(t))return IMG.bible;if(/sách|thư viện|kinh điển|tài liệu/.test(t))return IMG.library;if(/học|nghiên cứu|lớp|giảng|thần học|bài/.test(t))return IMG.study;return IMG.scripture}
  function b64(blob){return new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(blob)})}
  async function imgData(url){if(!url)return '';if(cache[url])return cache[url];try{const r=await fetch(url,{mode:'cors',cache:'force-cache'});if(!r.ok)throw Error('image');const b=await r.blob();if(!String(b.type||'').startsWith('image/'))throw Error('image');cache[url]=await b64(b);return cache[url]}catch(e){console.warn('PowerPoint image skipped',url,e);return ''}}
  function chunks(text,max=620){text=clean(text);if(!text)return [''];let arr=[],cur='';for(const part of text.split(/(?<=[.!?。！？])\s+|\n+/)){const p=part.trim();if(!p)continue;if(cur&&(cur+' '+p).length>max){arr.push(cur);cur=p}else cur=(cur?cur+' ':'')+p}if(cur)arr.push(cur);let out=[];for(const a of arr){if(a.length<=max+140)out.push(a);else for(let i=0;i<a.length;i+=max)out.push(a.slice(i,i+max))}return out.length?out:['']}
  function shape(pptx,t){return pptx.ShapeType?.[t]||t}
  function bg(pptx,s,color){s.background={color};s.addShape(shape(pptx,'rect'),{x:0,y:0,w:13.333,h:7.5,fill:{color},line:{color}})}
  function title(s,t,x,y,w,h,size=28,color='FFFFFF'){s.addText(clean(t),{x,y,w,h,fontFace:'Georgia',bold:true,fontSize:size,color,fit:'shrink',margin:.03})}
  function body(s,t,x,y,w,h,size=16,color='203044'){s.addText(clean(t),{x,y,w,h,fontFace:'Aptos',fontSize:size,color,fit:'shrink',margin:.05,breakLine:false})}
  function footer(s,lang,n){s.addText(`${lang==='en'?'Theology Library':'Thư Viện Thần Học'} · ${n}`,{x:.55,y:7.12,w:12.2,h:.22,fontFace:'Aptos',fontSize:8,color:'9AA8BA',margin:0})}
  async function imagePanel(pptx,s,url,x=8.15,y=.72,w=4.55,h=5.95){const data=await imgData(url);if(data){s.addImage({data,x,y,w,h});s.addShape(shape(pptx,'rect'),{x,y,w,h,fill:{color:'000000',transparency:70},line:{color:'000000',transparency:100}})}else{s.addShape(shape(pptx,'rect'),{x,y,w,h,fill:{color:'E7DCC7'},line:{color:'E7DCC7'}})}}
  async function titleSlide(pptx,l,lang){const s=pptx.addSlide();bg(pptx,s,'06172D');await imagePanel(pptx,s,imgFor((l.title||'')+' '+(l.summary||''),l),6.95,0,6.39,7.5);s.addShape(shape(pptx,'rect'),{x:0,y:0,w:8.1,h:7.5,fill:{color:'06172D'},line:{color:'06172D'}});s.addText(lang==='en'?'THEOLOGY LESSON':'BÀI HỌC THẦN HỌC',{x:.62,y:.72,w:5.7,h:.32,fontFace:'Aptos',fontSize:10,bold:true,color:'D6AF54',charSpace:1.6});title(s,l.title||'Bài học',.62,1.2,6.45,2.45,35);const meta=[l.scripture_reference,l.teacher,l.lesson_date].filter(Boolean).join(' · ');if(meta)body(s,meta,.65,4.05,6.2,.8,15,'DDE7F3');s.addShape(shape(pptx,'line'),{x:.65,y:5.25,w:2.2,h:0,line:{color:'D6AF54',width:2}});body(s,lang==='en'?'Generated from Theology Library':'Tạo từ Thư Viện Thần Học',.65,5.52,5.4,.4,13,'B8C5D6')}
  async function textSlides(pptx,ttl,txt,url,lang,page){let c=chunks(txt);for(let i=0;i<c.length;i++){const s=pptx.addSlide();bg(pptx,s,'FBF8F1');s.addShape(shape(pptx,'rect'),{x:0,y:0,w:13.333,h:.22,fill:{color:'D5A93F'},line:{color:'D5A93F'}});title(s,ttl+(c.length>1?` (${i+1}/${c.length})`:''),.58,.58,7.15,.86,25,'143D70');body(s,c[i],.62,1.58,7.05,4.95,16);await imagePanel(pptx,s,url);footer(s,lang,page+i)}return c.length}
  function quizRows(l){return (S.questions||[]).filter(q=>q?.lesson_id===l.id).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0))}
  function qText(q,lang,showAnswer=false){const o=normalizeOpts(q.options||{}),keys=optionKeysPdf(o);let t=`${lang==='en'?'Question':'Câu'} ${q.sort_order||''}. ${q.question_text||''}\n`+keys.map(k=>`${k}. ${o[k]}`).join('\n');if(showAnswer){const a=String(q.answer?.correct_option||'').trim();t+=`\n\n${lang==='en'?'Correct answer':'Đáp án đúng'}: ${a||'—'}`;if(q.answer?.explanation)t+=`\n${lang==='en'?'Explanation':'Giải thích'}: ${q.answer.explanation}`}return t}
  async function quizSlides(pptx,qs,lang,page,showAnswers=false){let count=0;for(let i=0;i<qs.length;i+=2){count+=await textSlides(pptx,`${lang==='en'?(showAnswers?'Quiz · Answer Key':'Quiz Questions'):(showAnswers?'Trắc nghiệm · Kèm đáp án':'Câu hỏi trắc nghiệm')} ${i+1}-${Math.min(i+2,qs.length)}`,qs.slice(i,i+2).map(q=>qText(q,lang,showAnswers)).join('\n\n'),IMG.study,lang,page+count)}return count}
  async function build(l,opt){
    await ensure();
    const pptx=new window.PptxGenJS();
    pptx.layout='LAYOUT_WIDE';
    pptx.author='Thư Viện Thần Học';
    pptx.subject='Theology lesson';
    pptx.title=l.title||'Bài học';
    pptx.company='Than Theology Library';
    pptx.theme={headFontFace:'Georgia',bodyFontFace:'Aptos',lang:opt.lang==='en'?'en-US':'vi-VN'};

    const lessonMode=opt.kind==='lesson'||opt.kind==='lesson_quiz';
    const quizMode=opt.kind==='lesson_quiz'||opt.kind==='quiz'||opt.kind==='quiz_answers';
    const answerMode=opt.kind==='quiz_answers';
    let lesson=l,qs=quizRows(l),b=null;

    if(answerMode){
      const r=await adm('reveal_answers',{lesson_id:l.id});
      const amap=r?.answers||{};
      qs=qs.map(q=>({...q,answer:amap[q.id]||{correct_option:'',explanation:''}}));
    }

    if(opt.lang==='en'){
      b=box('Đang dịch PowerPoint sang English…');
      if(lessonMode)lesson=await translate(l,'lesson');
      if(quizMode&&qs.length){
        const payload=await translate(
          {lesson:{title:l.title,scripture_reference:l.scripture_reference},questions:qs},
          answerMode?'quiz_answers':'quiz'
        );
        qs=payload?.questions||qs;
      }
      b?.remove();b=null;
    }

    b=box('Đang tạo PowerPoint…');
    let page=1;

    if(lessonMode){
      await titleSlide(pptx,lesson,opt.lang);page++;
      if(lesson.key_verse_1925)page+=await textSlides(pptx,opt.lang==='en'?'Key Verse':'Câu gốc',`${lesson.key_verse_reference||''}\n\n${lesson.key_verse_1925}`,IMG.scripture,opt.lang,page);
      for(const [name,val,img] of [[opt.lang==='en'?'Introduction':'Giới thiệu',lesson.introduction,imgFor(lesson.introduction,lesson)],[opt.lang==='en'?'Background':'Bối cảnh',lesson.background,IMG.library],[opt.lang==='en'?'Transition':'Chuyển ý',lesson.transition_text,IMG.study]])if(val)page+=await textSlides(pptx,name,val,img,opt.lang,page);
      const pts=Array.isArray(lesson.main_content)?lesson.main_content:[];
      for(let i=0;i<pts.length;i++){
        const m=pts[i]||{},num=i+1,bodyTxt=[m.scripture_reference?`${opt.lang==='en'?'Scripture':'Kinh Thánh'}: ${m.scripture_reference}`:'',m.explanation||m.content||''].filter(Boolean).join('\n\n');
        page+=await textSlides(pptx,`${num}. ${m.title||''}`,bodyTxt,imgFor((m.title||'')+' '+(m.explanation||''),lesson),opt.lang,page);
        for(let j=0;j<(m.subpoints||[]).length;j++){
          const sp=m.subpoints[j]||{},st=`${num}.${j+1} ${sp.title||''}`,txt=[sp.scripture_reference?`${opt.lang==='en'?'Scripture':'Kinh Thánh'}: ${sp.scripture_reference}`:'',sp.explanation,sp.practical_explanation,sp.example,sp.application].filter(Boolean).join('\n\n');
          page+=await textSlides(pptx,st,txt,imgFor(st+' '+txt,lesson),opt.lang,page);
        }
      }
      if(lesson.summary)page+=await textSlides(pptx,opt.lang==='en'?'Summary of Key Points':'Tóm tắt các ý chính',lesson.summary,IMG.library,opt.lang,page);
      if(lesson.application)page+=await textSlides(pptx,opt.lang==='en'?'Lesson Takeaway':'Bài học rút ra',lesson.application,IMG.cross,opt.lang,page);
      if(lesson.prayer)page+=await textSlides(pptx,opt.lang==='en'?'Prayer':'Lời cầu nguyện',lesson.prayer,IMG.cross,opt.lang,page);
    }else{
      const cover={...l,title:opt.lang==='en'?(answerMode?'Quiz · Answer Key':'Quiz'):(answerMode?'Trắc nghiệm · Kèm đáp án':'Trắc nghiệm'),summary:l.title,scripture_reference:l.scripture_reference};
      await titleSlide(pptx,cover,opt.lang);page++;
    }

    if(quizMode){
      if(!qs.length)throw new Error('Bài học này chưa có câu hỏi trắc nghiệm.');
      page+=await quizSlides(pptx,qs,opt.lang,page,answerMode);
    }

    const end=pptx.addSlide();
    bg(pptx,end,'06172D');
    title(end,opt.lang==='en'?'Thank you':'Cảm ơn',.8,2.25,8.5,1,40);
    body(end,opt.lang==='en'?'Theology Library · Faith Journey':'Thư Viện Thần Học · Hành trình đức tin',.85,3.32,7,.45,17,'D6AF54');
    await imagePanel(pptx,end,IMG.bible,8.0,0,5.33,7.5);
    const suffix=opt.kind==='quiz'?(opt.lang==='en'?' - Quiz':' - Trac nghiem'):opt.kind==='quiz_answers'?(opt.lang==='en'?' - Quiz Answer Key':' - Trac nghiem dap an'):(opt.lang==='en'?' - English':'');
    const outName=fileName((lesson.title||l.title||'Bai hoc')+suffix+'.pptx');
    if(b){const h=b.querySelector('h2');if(h)h.textContent='Đang hoàn tất file PowerPoint…'}
    const blob=await pptx.write({outputType:'blob'});
    b?.remove();
    showPptReady(blob,outName);
  }
  window.exportLessonPowerPoint=function(){const l=S?.selected;if(!l){alert('Chưa chọn bài học.');return}choose(async opt=>{const run=async()=>{try{await build(l,opt)}catch(e){const ovs=[...document.querySelectorAll('.overlay')];const last=ovs.at(-1);if(last&&/Đang (tạo|dịch|hoàn tất)/.test(last.textContent||''))last.remove();alert(e?.message||String(e))}};if(opt.kind==='quiz_answers'&&!S.pin){unlock(run);return}await run()})};
  const oldDetail=detail;detail=function(){let h=oldDetail();if(!S?.selected)return h;if(h.includes('exportLessonPowerPoint()'))return h;const btn=`<div class="ppt-action-toolbar" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px"><button class="btn white ppt-action" onclick="exportLessonPowerPoint()">📊 Xuất PowerPoint</button></div>`;return h.includes('<article class="panel lesson')?h.replace('<article class="panel lesson',btn+'<article class="panel lesson'):btn+h};
})();