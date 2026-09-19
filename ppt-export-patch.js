// Illustrated PowerPoint export for lessons. Generates .pptx in the browser and does not store files in Supabase.
(function(){
  const CDN='https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
  const TRANSLATE=SB+'/functions/v1/theology-translate-export';
  const IMG={bible:'https://unsplash.com/photos/2dE06Y4GSZk/download?force=true&w=1600',study:'https://unsplash.com/photos/52DIsLNYTKs/download?force=true&w=1400',cross:'https://unsplash.com/photos/ITiJrBI3XnE/download?force=true&w=1400',library:'https://unsplash.com/photos/UolPvs1rBk8/download?force=true&w=1400',scripture:'https://unsplash.com/photos/EOwN2FTGjc0/download?force=true&w=1400'};
  const cache={};
  const clean=v=>String(v||'').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();
  const fileName=v=>String(v||'PowerPoint').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90)||'PowerPoint';
  const escP=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function box(text){try{return overlay(`<div class="modal" style="max-width:440px;text-align:center"><h2>${esc(text)}</h2><p class="muted">PowerPoint được tạo tạm trên thiết bị, không lưu vào app.</p></div>`)}catch{return null}}
  function closeLoading(){const ovs=[...document.querySelectorAll('.overlay')];const last=ovs.at(-1);if(last&&/Đang (tạo|dịch|chuẩn bị|hoàn tất)/.test(last.textContent||''))last.remove()}

  function showPptReady(blob,name){
    try{
      if(window.__theologyPptUrl){try{URL.revokeObjectURL(window.__theologyPptUrl)}catch{}}
      const url=URL.createObjectURL(blob);window.__theologyPptUrl=url;
      const d=overlay(`<div class="modal" style="max-width:520px"><button class="x">×</button><h2>PowerPoint đã sẵn sàng</h2><p class="muted">File đã tạo xong. Chọn một cách bên dưới để lưu vào thiết bị.</p><div style="display:grid;gap:10px;margin-top:18px"><button class="btn gold" id="pptDownloadReady" style="min-height:54px">⬇️ Tải PowerPoint</button><button class="btn white" id="pptShareReady" style="min-height:54px">📤 Chia sẻ / Lưu vào Tệp</button></div><p class="muted" style="margin-top:14px">File chỉ tồn tại tạm trong trình duyệt và không được lưu vào app.</p></div>`);
      const close=d.querySelector('.x');if(close)close.addEventListener('click',()=>{setTimeout(()=>{try{URL.revokeObjectURL(url)}catch{};if(window.__theologyPptUrl===url)window.__theologyPptUrl=''},3000)},{once:true});
      d.querySelector('#pptDownloadReady').onclick=()=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()};
      const share=d.querySelector('#pptShareReady');
      const file=new File([blob],name,{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}))share.onclick=async()=>{try{await navigator.share({files:[file],title:name})}catch(e){if(e?.name!=='AbortError')alert('Không mở được bảng chia sẻ. Hãy dùng nút Tải PowerPoint.')}};
      else share.style.display='none';
    }catch(e){console.error(e);alert('PowerPoint đã tạo xong nhưng không mở được nút tải. Hãy thử lại.')}
  }

  function choose(run){
    const d=overlay(`<div class="modal" style="max-width:560px"><button class="x">×</button><h2>Xuất PowerPoint</h2><p class="muted">Bạn sẽ được xem trước slide trước khi tạo file tải về. App không lưu file này nên không làm đầy bộ nhớ.</p><div class="field"><label>Ngôn ngữ</label><select id="pptLang"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div><div class="field"><label>Nội dung</label><select id="pptKind"><option value="lesson">Bài học</option><option value="lesson_quiz">Bài học + trắc nghiệm</option><option value="quiz">Chỉ trắc nghiệm</option><option value="quiz_answers">Trắc nghiệm + đáp án</option></select></div><div class="modalActions"><button class="btn gold" id="pptGo">Xem trước PowerPoint</button></div></div>`);
    d.querySelector('#pptGo').onclick=()=>{const opt={lang:d.querySelector('#pptLang').value,kind:d.querySelector('#pptKind').value};d.remove();run(opt)};
  }

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
  function teachBullets(text,maxLen=175){
    text=clean(text);if(!text)return [];
    const sentences=text.split(/(?<=[.!?。！？])\s+|\n+|;\s+/).map(x=>x.trim()).filter(Boolean);
    const out=[];
    for(const sentence of sentences){
      if(sentence.length<=maxLen){out.push(sentence);continue}
      let cur='';
      for(const word of sentence.split(/\s+/)){
        const next=(cur?cur+' ':'')+word;
        if(next.length>maxLen&&cur){out.push(cur);cur=word}else cur=next;
      }
      if(cur)out.push(cur);
    }
    return out;
  }
  function bulletGroups(text,maxPer=4){
    const arr=teachBullets(text),out=[];
    for(let i=0;i<arr.length;i+=maxPer)out.push(arr.slice(i,i+maxPer));
    return out;
  }
  function bulletText(items){return (items||[]).map(x=>'• '+x).join('\n')}
  function outlineItems(lesson){
    return (Array.isArray(lesson.main_content)?lesson.main_content:[]).map((m,i)=>({n:i+1,title:String(m?.title||'').trim()})).filter(x=>x.title);
  }
  async function addSectionDivider(pptx,m,num,lesson,lang,page){
    const s=pptx.addSlide();bg(pptx,s,'06172D');
    await imagePanel(pptx,s,imgFor((m?.title||'')+' '+(m?.explanation||m?.content||''),lesson),7.45,0,5.88,7.5);
    s.addShape(shape(pptx,'rect'),{x:0,y:0,w:8.25,h:7.5,fill:{color:'06172D'},line:{color:'06172D'}});
    s.addText(lang==='en'?'MAIN POINT':'Ý CHÍNH',{x:.72,y:.82,w:2.3,h:.32,fontFace:'Aptos',fontSize:11,bold:true,color:'D6AF54',charSpace:1.5,margin:0});
    s.addText(String(num).padStart(2,'0'),{x:.72,y:1.38,w:1.15,h:.88,fontFace:'Georgia',fontSize:34,bold:true,color:'D6AF54',margin:0});
    title(s,m?.title||'',2.0,1.38,5.25,1.75,31,'FFFFFF');
    if(m?.scripture_reference)s.addText(String(m.scripture_reference),{x:.76,y:4.05,w:6.25,h:.5,fontFace:'Aptos',fontSize:15,bold:true,color:'D9E3EF',fit:'shrink',margin:0});
    const lead=teachBullets(m?.explanation||m?.content||'')[0]||'';
    if(lead)s.addText(lead,{x:.76,y:4.92,w:6.25,h:1.22,fontFace:'Aptos',fontSize:17,color:'D6E0EB',fit:'shrink',margin:.03});
    footer(s,lang,page);return 1;
  }
  async function addTeachingBulletSlides(pptx,ttl,text,imgUrl,lang,page,label='',maxPer=4){
    const groups=bulletGroups(text,maxPer);let count=0;
    for(let i=0;i<groups.length;i++){
      const heading=ttl+(groups.length>1?' ('+(i+1)+'/'+groups.length+')':'');
      const content=(label?label+'\n\n':'')+bulletText(groups[i]);
      count+=await textSlides(pptx,heading,content,imgUrl,lang,page+count);
    }
    return count;
  }
  async function addSubpointTeachingSlides(pptx,sp,num,j,lesson,lang,page){
    let count=0;
    const st=String(num)+'.'+String(j+1)+' '+String(sp?.title||'');
    const ref=sp?.scripture_reference?(lang==='en'?'Scripture: ':'Kinh Thánh: ')+String(sp.scripture_reference):'';
    const explanation=[sp?.explanation,sp?.practical_explanation].filter(Boolean).join(' ');
    const groups=bulletGroups(explanation,3);
    for(let i=0;i<groups.length;i++){
      const heading=st+(groups.length>1?' ('+(i+1)+'/'+groups.length+')':'');
      const content=(ref?ref+'\n\n':'')+bulletText(groups[i]);
      count+=await textSlides(pptx,heading,content,imgFor(st+' '+groups[i].join(' '),lesson),lang,page+count);
    }
    if(sp?.example)count+=await textSlides(pptx,(lang==='en'?'Example · ':'Ví dụ · ')+st,String(sp.example),imgFor(String(sp.example),lesson),lang,page+count);
    if(sp?.application)count+=await textSlides(pptx,(lang==='en'?'Application · ':'Áp dụng · ')+st,String(sp.application),IMG.cross,lang,page+count);
    return count;
  }
  function quizRows(l){return (S.questions||[]).filter(q=>q?.lesson_id===l.id).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0))}
  function quizOptionData(q){
    const o=normalizeOpts(q.options||{}),keys=optionKeysPdf(o);
    return keys.map(k=>({key:k,text:String(o[k]||'')}));
  }
  function correctLetters(q){return String(q.answer?.correct_option||'').split(/[^A-Za-z]+/).map(x=>x.trim().toUpperCase()).filter(Boolean)}
  function correctOptionText(q){
    const letters=correctLetters(q),opts=quizOptionData(q);
    const hit=opts.filter(x=>letters.includes(x.key)).map(x=>x.key+'. '+x.text);
    return hit.join('\n');
  }
  async function addQuizQuestionSlide(pptx,q,lang,page){
    const s=pptx.addSlide();bg(pptx,s,'FCFAF5');
    s.addShape(shape(pptx,'rect'),{x:0,y:0,w:13.333,h:.18,fill:{color:'D5A93F'},line:{color:'D5A93F'}});
    s.addText(`${lang==='en'?'QUESTION':'CÂU'} ${q.sort_order||''}`,{x:.62,y:.45,w:2.7,h:.3,fontFace:'Aptos',fontSize:11,bold:true,color:'B08324',charSpace:1.3,margin:0});
    title(s,q.question_text||'',.62,.88,12.05,1.42,25,'15365F');
    const opts=quizOptionData(q),n=Math.max(opts.length,1),available=4.45,gap=.12,rowH=Math.min(.83,(available-gap*(n-1))/n),startY=2.38;
    opts.forEach((o,i)=>{
      const y=startY+i*(rowH+gap);
      s.addShape(shape(pptx,'roundRect'),{x:.72,y,w:11.9,h:rowH,rectRadius:.06,fill:{color:'FFFFFF'},line:{color:'DED6C9',width:1.1}});
      s.addShape(shape(pptx,'ellipse'),{x:.94,y:y+Math.max(.08,(rowH-.48)/2),w:.48,h:.48,fill:{color:'15365F'},line:{color:'15365F'}});
      s.addText(o.key,{x:.94,y:y+Math.max(.08,(rowH-.48)/2)+.02,w:.48,h:.32,fontFace:'Aptos',fontSize:13,bold:true,color:'FFFFFF',align:'center',margin:0});
      s.addText(o.text,{x:1.58,y:y+.08,w:10.65,h:Math.max(.42,rowH-.14),fontFace:'Aptos',fontSize:18,color:'24364B',fit:'shrink',valign:'mid',margin:.03});
    });
    footer(s,lang,page);
  }
  async function addQuizAnswerSlide(pptx,q,lang,page){
    const s=pptx.addSlide();bg(pptx,s,'F8F7F1');
    s.addShape(shape(pptx,'rect'),{x:0,y:0,w:13.333,h:.18,fill:{color:'4C8B62'},line:{color:'4C8B62'}});
    s.addText(`${lang==='en'?'ANSWER · QUESTION':'ĐÁP ÁN · CÂU'} ${q.sort_order||''}`,{x:.62,y:.48,w:3.9,h:.3,fontFace:'Aptos',fontSize:11,bold:true,color:'4C8B62',charSpace:1.1,margin:0});
    title(s,q.question_text||'',.62,.9,12.05,1.12,21,'15365F');
    const letters=correctLetters(q),answerLabel=letters.length?letters.join(', '):'—',answerText=correctOptionText(q);
    s.addShape(shape(pptx,'roundRect'),{x:.72,y:2.28,w:11.9,h:1.55,fill:{color:'EAF5ED'},line:{color:'7FB18E',width:1.3}});
    s.addText(lang==='en'?'CORRECT ANSWER':'ĐÁP ÁN ĐÚNG',{x:1.0,y:2.58,w:2.15,h:.26,fontFace:'Aptos',fontSize:10,bold:true,color:'4C8B62',charSpace:1.1,margin:0});
    s.addText(answerLabel,{x:3.02,y:2.4,w:1.35,h:.7,fontFace:'Georgia',fontSize:30,bold:true,color:'2E6E45',align:'center',margin:0});
    if(answerText)s.addText(answerText,{x:4.45,y:2.42,w:7.75,h:.85,fontFace:'Aptos',fontSize:18,bold:true,color:'234333',fit:'shrink',margin:.02,valign:'mid'});
    if(q.answer?.explanation){
      s.addText(lang==='en'?'Explanation':'Giải thích',{x:.76,y:4.18,w:2.2,h:.3,fontFace:'Aptos',fontSize:11,bold:true,color:'A47C25',charSpace:.8,margin:0});
      s.addText(String(q.answer.explanation),{x:.78,y:4.58,w:11.75,h:1.55,fontFace:'Aptos',fontSize:17,color:'314155',fit:'shrink',margin:.03});
    }
    footer(s,lang,page);
  }
  async function quizSlides(pptx,qs,lang,page,showAnswers=false){
    let count=0;
    for(const q of qs){
      await addQuizQuestionSlide(pptx,q,lang,page+count);count++;
      if(showAnswers){await addQuizAnswerSlide(pptx,q,lang,page+count);count++}
    }
    return count;
  }

  async function prepareData(l,opt){
    const lessonMode=opt.kind==='lesson'||opt.kind==='lesson_quiz';
    const quizMode=opt.kind==='lesson_quiz'||opt.kind==='quiz'||opt.kind==='quiz_answers';
    const answerMode=opt.kind==='quiz_answers';
    let lesson=l,qs=quizRows(l),b=null;
    if(answerMode){const r=await adm('reveal_answers',{lesson_id:l.id});const amap=r?.answers||{};qs=qs.map(q=>({...q,answer:amap[q.id]||{correct_option:'',explanation:''}}))}
    if(opt.lang==='en'){
      b=box('Đang dịch PowerPoint sang English…');
      if(lessonMode)lesson=await translate(l,'lesson');
      if(quizMode&&qs.length){const payload=await translate({lesson:{title:l.title,scripture_reference:l.scripture_reference},questions:qs},answerMode?'quiz_answers':'quiz');qs=payload?.questions||qs}
      b?.remove();b=null;
    }
    return {original:l,lesson,qs,opt,lessonMode,quizMode,answerMode};
  }

  function previewItems(data){
    const {lesson,qs,opt,lessonMode,quizMode,answerMode,original}=data,items=[];
    const push=(title,text,img)=>{for(const part of chunks(text,500))items.push({title,body:part,img})};
    if(lessonMode){
      items.push({title:lesson.title||'Bài học',body:[lesson.scripture_reference,lesson.teacher,lesson.lesson_date].filter(Boolean).join(' · '),img:imgFor((lesson.title||'')+' '+(lesson.summary||''),lesson),cover:true});
      const outline=outlineItems(lesson);
      if(outline.length)items.push({title:opt.lang==='en'?'Lesson Roadmap':'Bố cục bài học',body:outline.map(x=>String(x.n)+'. '+x.title).join('\n'),img:IMG.study});
      if(lesson.key_verse_1925)items.push({title:opt.lang==='en'?'Key Verse':'Câu gốc',body:[lesson.key_verse_reference||'',lesson.key_verse_1925].filter(Boolean).join('\n\n'),img:IMG.scripture});
      const opening=[lesson.introduction,lesson.background].filter(Boolean).join(' ');
      for(const g of bulletGroups(opening,4))items.push({title:opt.lang==='en'?'Opening & Context':'Mở đầu & Bối cảnh',body:bulletText(g),img:IMG.library});
      if(lesson.transition_text)for(const g of bulletGroups(lesson.transition_text,4))items.push({title:opt.lang==='en'?'Transition':'Chuyển ý',body:bulletText(g),img:IMG.study});
      const pts=Array.isArray(lesson.main_content)?lesson.main_content:[];
      pts.forEach((m,i)=>{
        const num=i+1;
        items.push({title:(opt.lang==='en'?'Main Point ':'Ý chính ')+String(num)+': '+String(m?.title||''),body:[m?.scripture_reference||'',teachBullets(m?.explanation||m?.content||'')[0]||''].filter(Boolean).join('\n\n'),img:imgFor((m?.title||'')+' '+(m?.explanation||''),lesson),cover:true});
        const mg=bulletGroups(m?.explanation||m?.content||'',4);
        mg.forEach((g,k)=>items.push({title:String(num)+'. '+String(m?.title||'')+(mg.length>1?' ('+(k+1)+'/'+mg.length+')':''),body:bulletText(g),img:imgFor(g.join(' '),lesson)}));
        (m?.subpoints||[]).forEach((sp,j)=>{
          const st=String(num)+'.'+String(j+1)+' '+String(sp?.title||'');
          const sg=bulletGroups([sp?.explanation,sp?.practical_explanation].filter(Boolean).join(' '),3);
          sg.forEach((g,k)=>items.push({title:st+(sg.length>1?' ('+(k+1)+'/'+sg.length+')':''),body:[sp?.scripture_reference?(opt.lang==='en'?'Scripture: ':'Kinh Thánh: ')+sp.scripture_reference:'',bulletText(g)].filter(Boolean).join('\n\n'),img:imgFor(g.join(' '),lesson)}));
          if(sp?.example)push((opt.lang==='en'?'Example · ':'Ví dụ · ')+st,String(sp.example),imgFor(String(sp.example),lesson));
          if(sp?.application)push((opt.lang==='en'?'Application · ':'Áp dụng · ')+st,String(sp.application),IMG.cross);
        });
      });
      for(const g of bulletGroups(lesson.summary||'',4))items.push({title:opt.lang==='en'?'Summary of Key Points':'Tóm tắt các ý chính',body:bulletText(g),img:IMG.library});
      for(const g of bulletGroups(lesson.application||'',4))items.push({title:opt.lang==='en'?'Lesson Takeaway':'Bài học rút ra',body:bulletText(g),img:IMG.cross});
      if(lesson.prayer)push(opt.lang==='en'?'Prayer':'Lời cầu nguyện',lesson.prayer,IMG.cross);

    }else{
      items.push({title:opt.lang==='en'?(answerMode?'Quiz · Answer Key':'Quiz'):(answerMode?'Trắc nghiệm · Kèm đáp án':'Trắc nghiệm'),body:original.title||'',img:imgFor(original.title,original),cover:true});
    }
    if(quizMode){
      if(!qs.length)throw new Error('Bài học này chưa có câu hỏi trắc nghiệm.');
      for(const q of qs){
        const opts=quizOptionData(q);
        items.push({quiz:true,title:`${opt.lang==='en'?'Question':'Câu'} ${q.sort_order||''}`,question:q.question_text||'',options:opts});
        if(answerMode){
          items.push({quizAnswer:true,title:`${opt.lang==='en'?'Answer · Question':'Đáp án · Câu'} ${q.sort_order||''}`,question:q.question_text||'',answer:correctLetters(q).join(', ')||'—',answerText:correctOptionText(q),explanation:q.answer?.explanation||''});
        }
      }
    }
    items.push({title:opt.lang==='en'?'Thank you':'Cảm ơn',body:opt.lang==='en'?'Theology Library · Faith Journey':'Thư Viện Thần Học · Hành trình đức tin',img:IMG.bible,cover:true});
    return items;
  }

  function showPreview(data,onConfirm){
    const items=previewItems(data),count=items.length;
    const kindLabel={lesson:'Bài học',lesson_quiz:'Bài học + trắc nghiệm',quiz:'Chỉ trắc nghiệm',quiz_answers:'Trắc nghiệm + đáp án'}[data.opt.kind]||'PowerPoint';
    const cards=items.map((it,i)=>{
      let inner='';
      if(it.quiz){
        inner=`<div class="ppt-q-label">${escP(it.title||'')}</div><div class="ppt-q-question">${escP(it.question||'')}</div><div class="ppt-q-options">${(it.options||[]).map(o=>`<div class="ppt-q-opt"><b>${escP(o.key)}</b><span>${escP(o.text)}</span></div>`).join('')}</div>`;
      }else if(it.quizAnswer){
        inner=`<div class="ppt-q-label answer">${escP(it.title||'')}</div><div class="ppt-a-question">${escP(it.question||'')}</div><div class="ppt-answer-box"><small>${data.opt.lang==='en'?'CORRECT ANSWER':'ĐÁP ÁN ĐÚNG'}</small><b>${escP(it.answer||'—')}</b><span>${escP(it.answerText||'')}</span></div>${it.explanation?`<div class="ppt-a-explain">${escP(it.explanation)}</div>`:''}`;
      }else{
        inner=`<div class="ppt-preview-text"><small>Slide ${i+1}/${count}</small><h3>${escP(it.title||'')}</h3>${it.body?`<p>${escP(it.body).replace(/\n/g,'<br>')}</p>`:''}</div>`;
      }
      return `<div class="ppt-preview-card"><div class="ppt-preview-slide ${it.cover?'cover':''} ${it.quiz?'quiz':''} ${it.quizAnswer?'quiz-answer':''}">${(!it.quiz&&!it.quizAnswer)?`<div class="ppt-preview-img" style="background-image:url('${escP(it.img||IMG.scripture)}')"></div><div class="ppt-preview-shade"></div>`:''}<div class="ppt-slide-num">Slide ${i+1}/${count}</div>${inner}</div></div>`;
    }).join('');
    const d=overlay(`<div class="modal" style="width:min(1100px,97vw);max-height:94vh;overflow:auto"><button class="x">×</button><h2>Xem trước PowerPoint</h2><p class="muted">${escP(kindLabel)} · ${data.opt.lang==='en'?'English':'Tiếng Việt'} · ${count} slide. Phần trắc nghiệm dùng 1 câu/slide để dễ đọc khi trình chiếu.</p><style>
      .ppt-preview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(285px,1fr));gap:14px;margin-top:16px}
      .ppt-preview-card{background:#f6f1e8;border:1px solid #e4d7c6;border-radius:16px;padding:8px}
      .ppt-preview-slide{position:relative;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#fbf8f1;box-shadow:0 10px 28px #10223a22}
      .ppt-preview-img{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.34}
      .ppt-preview-slide.cover .ppt-preview-img{opacity:.62}
      .ppt-preview-shade{position:absolute;inset:0;background:linear-gradient(90deg,#06172df0 0%,#06172db0 48%,#06172d22 100%)}
      .ppt-preview-slide:not(.cover):not(.quiz):not(.quiz-answer) .ppt-preview-shade{background:linear-gradient(90deg,#fbf8f1 0%,#fbf8f1e8 62%,#fbf8f144 100%)}
      .ppt-slide-num{position:absolute;top:11px;right:14px;z-index:4;font-size:9px;font-weight:900;color:#a97d24;text-transform:uppercase}
      .ppt-preview-text{position:absolute;inset:18px;color:#fff;display:flex;flex-direction:column;justify-content:center}
      .ppt-preview-slide:not(.cover):not(.quiz):not(.quiz-answer) .ppt-preview-text{color:#17365e}
      .ppt-preview-text small{font-size:10px;color:#d7ad4f;font-weight:900;text-transform:uppercase}
      .ppt-preview-text h3{font:700 23px Georgia,serif;line-height:1.12;margin:5px 0 8px;color:inherit}
      .ppt-preview-text p{font-size:12.5px;line-height:1.34;margin:0;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
      .ppt-preview-slide.quiz,.ppt-preview-slide.quiz-answer{padding:18px;background:#fcfaf5;color:#17365e}
      .ppt-q-label{font-size:10px;font-weight:900;letter-spacing:1px;color:#a97d24;text-transform:uppercase;margin-bottom:7px}
      .ppt-q-label.answer{color:#4c8b62}
      .ppt-q-question{font:700 18px Georgia,serif;line-height:1.18;padding-right:56px;margin-bottom:11px}
      .ppt-q-options{display:grid;gap:6px}
      .ppt-q-opt{display:grid;grid-template-columns:25px 1fr;gap:7px;align-items:center;background:#fff;border:1px solid #e1d9cc;border-radius:8px;padding:5px 7px;font-size:11px;line-height:1.2}
      .ppt-q-opt b{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#15365f;color:white;font-size:10px}
      .ppt-a-question{font:700 15px Georgia,serif;line-height:1.18;margin:8px 0 12px;padding-right:52px}
      .ppt-answer-box{display:grid;grid-template-columns:auto 42px 1fr;gap:9px;align-items:center;background:#eaf5ed;border:1px solid #8eb99a;border-radius:9px;padding:9px}
      .ppt-answer-box small{font-size:8px;font-weight:900;color:#4c8b62}.ppt-answer-box b{font:700 22px Georgia,serif;color:#2e6e45}.ppt-answer-box span{font-size:10.5px;font-weight:700;color:#284438}
      .ppt-a-explain{margin-top:9px;font-size:10.5px;line-height:1.25;color:#425466}
      @media(max-width:650px){.ppt-preview-grid{grid-template-columns:1fr}.ppt-preview-text h3{font-size:20px}.ppt-preview-text{inset:14px}.ppt-preview-text p{-webkit-line-clamp:5}.ppt-q-question{font-size:16px}.ppt-q-opt{font-size:10.5px;padding:4px 6px}}
    </style><div class="ppt-preview-grid">${cards}</div><div class="modalActions" style="position:sticky;bottom:0;background:#fff;padding-top:14px"><button class="btn white" id="pptBack">← Chọn lại</button><button class="btn gold" id="pptMake">Tạo & tải PowerPoint</button></div></div>`);
    d.querySelector('#pptBack').onclick=()=>{d.remove();choose(async opt=>{await runPptFlow(data.original,opt)})};
    d.querySelector('#pptMake').onclick=async()=>{d.remove();await onConfirm()};
  }

  async function buildPrepared(data){
    await ensure();
    const {original:l,lesson,qs,opt,lessonMode,quizMode,answerMode}=data;
    const pptx=new window.PptxGenJS();
    pptx.layout='LAYOUT_WIDE';pptx.author='Thư Viện Thần Học';pptx.subject='Theology lesson';pptx.title=lesson.title||l.title||'Bài học';pptx.company='Than Theology Library';pptx.theme={headFontFace:'Georgia',bodyFontFace:'Aptos',lang:opt.lang==='en'?'en-US':'vi-VN'};
    let b=box('Đang tạo PowerPoint…'),page=1;
    if(lessonMode){
      await titleSlide(pptx,lesson,opt.lang);page++;
      const outline=outlineItems(lesson);
      if(outline.length)page+=await addTeachingBulletSlides(pptx,opt.lang==='en'?'Lesson Roadmap':'Bố cục bài học',outline.map(x=>String(x.n)+'. '+x.title).join('. '),IMG.study,opt.lang,page,opt.lang==='en'?'TODAY':'HÔM NAY',5);
      if(lesson.key_verse_1925)page+=await textSlides(pptx,opt.lang==='en'?'Key Verse':'Câu gốc',[lesson.key_verse_reference||'',lesson.key_verse_1925].filter(Boolean).join('\n\n'),IMG.scripture,opt.lang,page);
      const opening=[lesson.introduction,lesson.background].filter(Boolean).join(' ');
      if(opening)page+=await addTeachingBulletSlides(pptx,opt.lang==='en'?'Opening & Context':'Mở đầu & Bối cảnh',opening,IMG.library,opt.lang,page,opt.lang==='en'?'OPENING':'MỞ ĐẦU',4);
      if(lesson.transition_text)page+=await addTeachingBulletSlides(pptx,opt.lang==='en'?'Transition':'Chuyển ý',lesson.transition_text,IMG.study,opt.lang,page,'',4);
      const pts=Array.isArray(lesson.main_content)?lesson.main_content:[];
      for(let i=0;i<pts.length;i++){
        const m=pts[i]||{},num=i+1;
        page+=await addSectionDivider(pptx,m,num,lesson,opt.lang,page);
        const mtext=m.explanation||m.content||'';
        if(mtext)page+=await addTeachingBulletSlides(pptx,String(num)+'. '+String(m.title||''),mtext,imgFor((m.title||'')+' '+mtext,lesson),opt.lang,page,opt.lang==='en'?'KEY IDEAS':'Ý CẦN NHỚ',4);
        for(let j=0;j<(m.subpoints||[]).length;j++)page+=await addSubpointTeachingSlides(pptx,m.subpoints[j]||{},num,j,lesson,opt.lang,page);
      }
      if(lesson.summary)page+=await addTeachingBulletSlides(pptx,opt.lang==='en'?'Summary of Key Points':'Tóm tắt các ý chính',lesson.summary,IMG.library,opt.lang,page,opt.lang==='en'?'REVIEW':'ÔN LẠI',4);
      if(lesson.application)page+=await addTeachingBulletSlides(pptx,opt.lang==='en'?'Lesson Takeaway':'Bài học rút ra',lesson.application,IMG.cross,opt.lang,page,opt.lang==='en'?'TAKEAWAY':'ÁP DỤNG',4);
      if(lesson.prayer)page+=await textSlides(pptx,opt.lang==='en'?'Prayer':'Lời cầu nguyện',lesson.prayer,IMG.cross,opt.lang,page);

    }else{const cover={...l,title:opt.lang==='en'?(answerMode?'Quiz · Answer Key':'Quiz'):(answerMode?'Trắc nghiệm · Kèm đáp án':'Trắc nghiệm'),summary:l.title,scripture_reference:l.scripture_reference};await titleSlide(pptx,cover,opt.lang);page++}
    if(quizMode){if(!qs.length)throw new Error('Bài học này chưa có câu hỏi trắc nghiệm.');page+=await quizSlides(pptx,qs,opt.lang,page,answerMode)}
    const end=pptx.addSlide();bg(pptx,end,'06172D');title(end,opt.lang==='en'?'Thank you':'Cảm ơn',.8,2.25,8.5,1,40);body(end,opt.lang==='en'?'Theology Library · Faith Journey':'Thư Viện Thần Học · Hành trình đức tin',.85,3.32,7,.45,17,'D6AF54');await imagePanel(pptx,end,IMG.bible,8.0,0,5.33,7.5);
    const suffix=opt.kind==='quiz'?(opt.lang==='en'?' - Quiz':' - Trac nghiem'):opt.kind==='quiz_answers'?(opt.lang==='en'?' - Quiz Answer Key':' - Trac nghiem dap an'):(opt.lang==='en'?' - English':'');
    const outName=fileName((lesson.title||l.title||'Bai hoc')+suffix+'.pptx');if(b){const h=b.querySelector('h2');if(h)h.textContent='Đang hoàn tất file PowerPoint…'}
    const blob=await pptx.write({outputType:'blob'});b?.remove();showPptReady(blob,outName);
  }

  async function runPptFlow(l,opt){const data=await prepareData(l,opt);showPreview(data,async()=>{try{await buildPrepared(data)}catch(e){closeLoading();alert(e?.message||String(e))}})}
  window.exportLessonPowerPoint=function(){const l=S?.selected;if(!l){alert('Chưa chọn bài học.');return}choose(async opt=>{const run=async()=>{try{await runPptFlow(l,opt)}catch(e){closeLoading();alert(e?.message||String(e))}};if(opt.kind==='quiz_answers'&&!S.pin){unlock(run);return}await run()})};
  const oldDetail=detail;detail=function(){let h=oldDetail();if(!S?.selected)return h;if(h.includes('exportLessonPowerPoint()'))return h;const btn=`<div class="ppt-action-toolbar" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px"><button class="btn white ppt-action" onclick="exportLessonPowerPoint()">📊 Xuất PowerPoint</button></div>`;return h.includes('<article class="panel lesson')?h.replace('<article class="panel lesson',btn+'<article class="panel lesson'):btn+h};
})();