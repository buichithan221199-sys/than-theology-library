// Illustrated PowerPoint export for lessons. Generates .pptx locally in the browser; nothing is stored in Supabase.
(function(){
  const TRANSLATE=SB+'/functions/v1/theology-translate-export';
  const PPTX_CDN='https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
  const IMG={
    bible:'https://unsplash.com/photos/2dE06Y4GSZk/download?force=true&w=1600',
    study:'https://unsplash.com/photos/52DIsLNYTKs/download?force=true&w=1400',
    cross:'https://unsplash.com/photos/ITiJrBI3XnE/download?force=true&w=1400',
    library:'https://unsplash.com/photos/UolPvs1rBk8/download?force=true&w=1400',
    scripture:'https://unsplash.com/photos/EOwN2FTGjc0/download?force=true&w=1400'
  };
  const imageCache={};
  function cleanText(v){return String(v||'').replace(/\s+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
  function stripHtml(v){const d=document.createElement('div');d.innerHTML=String(v||'');return d.textContent||''}
  function safeName(v){return String(v||'PowerPoint').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90)||'PowerPoint'}
  function waitBoxPpt(text){try{return overlay(`<div class="modal" style="max-width:440px;text-align:center"><h2>${esc(text)}</h2><p class="muted">PowerPoint được tạo tạm trên thiết bị của bạn, không lưu vào app.</p></div>`)}catch{return null}}
  function choosePptOptions(run){
    const d=overlay(`<div class="modal" style="max-width:560px"><button class="x">×</button><h2>Xuất PowerPoint</h2><p class="muted">File .pptx sẽ có ảnh minh họa và tải trực tiếp về thiết bị. App không lưu file này để tránh đầy bộ nhớ.</p><div class="field"><label>Ngôn ngữ</label><select id="pptLang"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div><div class="field"><label>Nội dung</label><select id="pptKind"><option value="lesson">Bài học</option><option value="lesson_quiz">Bài học + trắc nghiệm</option></select></div><div class="modalActions"><button class="btn gold" id="pptGo">Tạo PowerPoint</button></div></div>`);
    d.querySelector('#pptGo').onclick=()=>{const lang=d.querySelector('#pptLang').value,kind=d.querySelector('#pptKind').value;d.remove();run({lang,kind})};
  }
  async function ensurePptx(){
    if(window.pptxgen)return;
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=PPTX_CDN;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Không tải được thư viện PowerPoint. Hãy kiểm tra mạng rồi thử lại.'));document.head.appendChild(s)});
    if(!window.pptxgen)throw new Error('Trình duyệt chưa sẵn sàng tạo PowerPoint.');
  }
  async function translatePayloadPpt(payload,kind){
    const r=await fetch(TRANSLATE,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target_language:'en',kind,payload})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Không dịch được nội dung PowerPoint.');return j.translated;
  }
  function chooseImageUrl(text,l){
    if(l?.cover_image_url)return l.cover_image_url;
    const t=String(text||'').toLowerCase();
    if(/thập tự|cầu nguyện|chúa giê|jesus|christ|đức tin/.test(t))return IMG.cross;
    if(/kinh thánh|cựu ước|tân ước|thi thiên|châm ngôn|sáng thế|xuất ê|ma-thi|công vụ/.test(t))return IMG.bible;
    if(/học|nghiên cứu|lớp|giảng|thần học|bài/.test(t))return IMG.study;
    if(/sách|thư viện|kinh điển|tài liệu/.test(t))return IMG.library;
    return IMG.scripture;
  }
  function blobToDataURL(blob){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)})}
  async function imageData(url){
    if(!url)return '';
    if(imageCache[url])return imageCache[url];
    try{const r=await fetch(url,{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error('image');const b=await r.blob();if(!String(b.type||'').startsWith('image/'))throw new Error('not image');return imageCache[url]=await blobToDataURL(b)}catch(e){console.warn('Không tải được ảnh minh họa',url,e);return ''}
  }
  function chunkText(text,max=560){
    text=cleanText(text);if(!text)return [];
    const parts=[];let cur='';
    const bits=text.split(/(?<=[.!?。！？])\s+|\n+/);
    for(const bit of bits){const b=bit.trim();if(!b)continue;if((cur+' '+b).trim().length>max&&cur){parts.push(cur.trim());cur=b}else cur=(cur?cur+' ': '')+b}
    if(cur.trim())parts.push(cur.trim());
    const out=[];for(const p of parts){if(p.length<=max+160)out.push(p);else{for(let i=0;i<p.length;i+=max)out.push(p.slice(i,i+max).trim())}}
    return out;
  }
  function addBg(slide,color='0B2346'){slide.background={color};slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:7.5,fill:{color},line:{color}})}
  function addFooter(slide,lang,idx){slide.addText(`${lang==='en'?'Theology Library':'Thư Viện Thần Học'} · ${idx}`,{x:.55,y:7.12,w:12.2,h:.22,fontFace:'Aptos',fontSize:8,color:'9AA8BA',margin:0})}
  function addTitle(slide,text,x,y,w,h,size=28,color='FFFFFF'){slide.addText(cleanText(text),{x,y,w,h,fontFace:'Georgia',bold:true,fontSize:size,color,fit:'shrink',breakLine:false,margin:0.03})}
  function addBody(slide,text,x,y,w,h,size=17,color='203044'){slide.addText(cleanText(text),{x,y,w,h,fontFace:'Aptos',fontSize:size,color,fit:'shrink',breakLine:false,margin:0.05,breakLine:false})}
  async function addImagePanel(slide,url,x=8.45,y=.7,w=4.25,h=6.05){const data=await imageData(url);if(data){slide.addImage({data,x,y,w,h});slide.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:'000000',transparency:68},line:{color:'000000',transparency:100}})}else slide.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:'E7DCC7'},line:{color:'E7DCC7'}})}
  async function titleSlide(pptx,l,lang){const s=pptx.addSlide();addBg(s,'06172D');await addImagePanel(s,chooseImageUrl(l.title+' '+l.summary,l),6.95,0,6.39,7.5);s.addShape(pptx.ShapeType.rect,{x:0,y:0,w:8.1,h:7.5,fill:{color:'06172D',transparency:0},line:{color:'06172D'}});s.addText(lang==='en'?'THEOLOGY LESSON':'BÀI HỌC THẦN HỌC',{x:.62,y:.72,w:5.7,h:.32,fontFace:'Aptos',fontSize:10,bold:true,color:'D6AF54',charSpace:1.6});addTitle(s,l.title||'Bài học',.62,1.2,6.45,2.45,35,'FFFFFF');const meta=[l.scripture_reference,l.teacher,l.lesson_date].filter(Boolean).join(' · ');if(meta)addBody(s,meta,.65,4.05,6.2,.8,15,'DDE7F3');s.addShape(pptx.ShapeType.line,{x:.65,y:5.25,w:2.2,h:0,line:{color:'D6AF54',width:2}});addBody(s,lang==='en'?'Generated from Theology Library':'Tạo từ Thư Viện Thần Học',.65,5.52,5.4,.4,13,'B8C5D6')}
  async function sectionSlide(pptx,title,text,imgUrl,lang,page){
    const chunks=chunkText(text,620);const list=chunks.length?chunks:[''];
    for(let i=0;i<list.length;i++){const s=pptx.addSlide();addBg(s,'FBF8F1');s.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:.22,fill:{color:'D5A93F'},line:{color:'D5A93F'}});addTitle(s,title+(list.length>1?` (${i+1}/${list.length})`:''),.58,.58,7.15,.8,25,'143D70');addBody(s,list[i],.62,1.58,7.05,4.95,16,'203044');await addImagePanel(s,imgUrl,8.15,.72,4.55,5.95);addFooter(s,lang,page+i)}return list.length;
  }
  async function simpleSlide(pptx,title,text,imgUrl,lang,page){return sectionSlide(pptx,title,text,imgUrl,lang,page)}
  function getQuizRows(l){return (S.questions||[]).filter(q=>q?.lesson_id===l.id).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0))}
  function quizText(q,lang){const o=normalizeOpts(q.options||{}),keys=optionKeysPdf(o);return `${lang==='en'?'Question':'Câu'} ${q.sort_order||''}. ${q.question_text||''}\n`+keys.map(k=>`${k}. ${o[k]}`).join('\n')}
  async function addQuizSlides(pptx,l,qs,lang,startPage){
    let p=startPage;if(!qs.length)return 0;
    const title=lang==='en'?'Quiz Questions':'Câu hỏi trắc nghiệm';
    for(let i=0;i<qs.length;i+=2){const body=qs.slice(i,i+2).map(q=>quizText(q,lang)).join('\n\n');p+=await simpleSlide(pptx,`${title} ${i+1}-${Math.min(i+2,qs.length)}`,body,IMG.study,lang,p)}
    return p-startPage;
  }
  async function buildPowerPoint(l,{lang,kind}){
    await ensurePptx();
    const P=window.pptxgen;window.pptx=P.prototype?null:window.pptx; // no-op guard for old browsers
    const pptx=new window.pptxgen();
    pptx.layout='LAYOUT_WIDE';pptx.author='Thư Viện Thần Học';pptx.subject='Theology lesson';pptx.title=l.title||'Bài học';pptx.company='Than Theology Library';
    pptx.theme={headFontFace:'Georgia',bodyFontFace:'Aptos',lang:lang==='en'?'en-US':'vi-VN'};
    let lesson=l,qs=getQuizRows(l),box=null;
    if(lang==='en'){box=waitBoxPpt('Đang dịch PowerPoint sang English…');lesson=await translatePayloadPpt(l,'lesson');if(kind==='lesson_quiz'&&qs.length){const payload=await translatePayloadPpt({lesson:{title:l.title,scripture_reference:l.scripture_reference},questions:qs},'quiz');qs=payload.questions||qs}box?.remove();box=null}
    box=waitBoxPpt('Đang tạo PowerPoint…');
    let page=1;await titleSlide(pptx,lesson,lang);page++;
    if(lesson.key_verse_1925)page+=await simpleSlide(pptx,lang==='en'?'Key Verse':'Câu gốc',`${lesson.key_verse_reference||''}\n\n${lesson.key_verse_1925}`,IMG.scripture,lang,page);
    if(lesson.introduction)page+=await simpleSlide(pptx,lang==='en'?'Introduction':'Giới thiệu',lesson.introduction,chooseImageUrl(lesson.introduction,lesson),lang,page);
    if(lesson.background)page+=await simpleSlide(pptx,lang==='en'?'Background':'Bối cảnh',lesson.background,IMG.library,lang,page);
    if(lesson.transition_text)page+=await simpleSlide(pptx,lang==='en'?'Transition':'Chuyển ý',lesson.transition_text,IMG.study,lang,page);
    const pts=Array.isArray(lesson.main_content)?lesson.main_content:[];
    for(let i=0;i<pts.length;i++){
      const m=pts[i]||{},num=i+1,title=`${num}. ${m.title||''}`,body=[m.scripture_reference?`${lang==='en'?'Scripture':'Kinh Thánh'}: ${m.scripture_reference}`:'',m.explanation||m.content||''].filter(Boolean).join('\n\n');
      page+=await sectionSlide(pptx,title,body,chooseImageUrl((m.title||'')+' '+(m.explanation||''),lesson),lang,page);
      const subs=Array.isArray(m.subpoints)?m.subpoints:[];
      for(let j=0;j<subs.length;j++){
        const sp=subs[j]||{};const stitle=`${num}.${j+1} ${sp.title||''}`;const sbody=[sp.scripture_reference?`${lang==='en'?'Scripture':'Kinh Thánh'}: ${sp.scripture_reference}`:'',sp.explanation,sp.practical_explanation,sp.example,sp.application].filter(Boolean).join('\n\n');
        page+=await sectionSlide(pptx,stitle,sbody,chooseImageUrl(stitle+' '+sbody,lesson),lang,page);
      }
    }
    if(lesson.summary)page+=await simpleSlide(pptx,lang==='en'?'Summary of Key Points':'Tóm tắt các ý chính',lesson.summary,IMG.library,lang,page);
    if(lesson.application)page+=await simpleSlide(pptx,lang==='en'?'Lesson Takeaway':'Bài học rút ra',lesson.application,IMG.cross,lang,page);
    if(lesson.prayer)page+=await simpleSlide(pptx,lang==='en'?'Prayer':'Lời cầu nguyện',lesson.prayer,IMG.cross,lang,page);
    if(kind==='lesson_quiz')page+=await addQuizSlides(pptx,lesson,qs,lang,page);
    const end=pptx.addSlide();addBg(end,'06172D');addTitle(end,lang==='en'?'Thank you':'Cảm ơn',.8,2.25,8.5,1,40,'FFFFFF');addBody(end,lang==='en'?'Theology Library · Faith Journey':'Thư Viện Thần Học · Hành trình đức tin',.85,3.32,7,.45,17,'D6AF54');await addImagePanel(end,IMG.bible,8.0,0,5.33,7.5);box?.remove();
    await pptx.writeFile({fileName:safeName((lesson.title||l.title||'Bai hoc')+(lang==='en'?' - English':'')+'.pptx')});
  }
  window.exportLessonPowerPoint=function(){const l=S?.selected;if(!l){alert('Chưa chọn bài học.');return}choosePptOptions(async opt=>{let b=null;try{await buildPowerPoint(l,opt)}catch(e){b?.remove();alert(e?.message||String(e))}})};
  const oldDetailPpt=detail;
  detail=function(){let h=oldDetailPpt();if(!S?.selected)return h;if(h.includes('exportLessonPowerPoint()'))return h;const btn=`<div class="ppt-action-toolbar" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px"><button class="btn white ppt-action" onclick="exportLessonPowerPoint()">📊 Xuất PowerPoint</button></div>`;return h.includes('<article class="panel lesson')?h.replace('<article class="panel lesson',btn+'<article class="panel lesson'):btn+h};
})();
