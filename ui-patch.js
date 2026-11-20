detail=function(){const l=S.selected;if(!l)return lessonList();const qs=S.questions.filter(q=>q.lesson_id===l.id);const pts=Array.isArray(l.main_content)?l.main_content:[];const rqs=Array.isArray(l.reflection_questions)?l.reflection_questions:[];return `<article class="panel lesson"><small>${esc(l.scripture_reference||'')}</small><h2>${esc(l.title)}</h2>${l.key_verse_1925?`<blockquote><b>${esc(l.key_verse_reference||'Câu gốc · Bản 1925')}</b><br>${esc(l.key_verse_1925)}</blockquote>`:''}${l.summary?`<h3>Tóm tắt</h3><p>${esc(l.summary)}</p>`:''}${l.introduction?`<h3>Giới thiệu</h3><p>${esc(l.introduction)}</p>`:''}${l.background?`<h3>Bối cảnh</h3><p>${esc(l.background)}</p>`:''}${l.transition_text?`<h3>Chuyển ý</h3><p>${esc(l.transition_text)}</p>`:''}${pts.length?`<h3>Các ý chính</h3>${pts.map((p,i)=>`<div class="question"><b>${esc(p.title||('Ý '+(i+1)))}</b><p style="white-space:pre-line">${esc(p.content||p.explanation||'')}</p></div>`).join('')}`:''}${l.application?`<h3>Áp dụng</h3><p>${esc(l.application)}</p>`:''}${rqs.length?`<h3>Câu hỏi suy ngẫm</h3><ol>${rqs.map(x=>`<li>${esc(typeof x==='string'?x:(x.question||x.text||''))}</li>`).join('')}</ol>`:''}${l.prayer?`<h3>Lời cầu nguyện</h3><p>${esc(l.prayer)}</p>`:''}<h3>Câu hỏi trắc nghiệm</h3>${qs.length?qs.map((q,i)=>questionHtml(q,i)).join(''):'<p class="muted">Chưa có câu hỏi trắc nghiệm cho bài này.</p>'}</article>`};
previewResult=function(v,ctx){const qs=Array.isArray(v.questions)?v.questions:[];if(ctx.targetType==='questions'){const d=overlay(`<div class="modal"><button class="x">×</button><h2>Xem trước bộ câu hỏi</h2><p>${qs.length} câu hỏi · sẽ gắn vào <b>${esc(S.lessons.find(x=>x.id===ctx.lessonId)?.title||'')}</b></p>${qs.map((q,i)=>`<div class="question"><b>Câu ${i+1}. ${esc(q.question_text||q.question||'')}</b></div>`).join('')}<div class="modalActions"><button class="btn gold" id="save">Lưu câu hỏi</button></div></div>`);d.querySelector('#save').onclick=async()=>{for(let i=0;i<qs.length;i++){const z=qs[i],o=Array.isArray(z.options)?Object.fromEntries(['A','B','C','D'].map((k,j)=>[k,z.options[j]||''])):(z.options||{});await adm('save_question',{question:{lesson_id:ctx.lessonId,question_text:z.question_text||z.question||'',options:o,sort_order:i+1,scripture_reference:z.scripture_reference||''},answer:{correct_option:z.correct_option||'',explanation:z.explanation||'',scripture_reference:z.scripture_reference||''}})}d.remove();await load();go('quiz')};return}
const pts=Array.isArray(v.main_content)?v.main_content:[];const rqs=Array.isArray(v.reflection_questions)?v.reflection_questions:[];const pointHtml=pts.map((p,i)=>`<div class="question" data-point="${i}"><div class="field"><label>Ý ${i+1} - Tiêu đề</label><input class="pt" value="${esc(p.title||('Ý '+(i+1)))}"></div><div class="field"><label>Nội dung / giải thích / ví dụ</label><textarea class="pc" rows="7">${esc(p.content||p.explanation||'')}</textarea></div></div>`).join('');const quizHtml=qs.length?`<h3 class="title" style="font-size:20px">10 câu hỏi trắc nghiệm</h3><p class="muted">Đáp án đúng được lưu riêng và chỉ hiện khi nhập mã quản trị.</p>${qs.map((q,i)=>{const o=q.options||{};return `<div class="question"><b>Câu ${i+1}. ${esc(q.question_text||q.question||'')}</b><div class="opts">${['A','B','C','D'].map(k=>o[k]?`<div class="opt">${k}. ${esc(o[k])}</div>`:'').join('')}</div><div class="muted">Đáp án: ${esc(q.correct_option||'')} · ${esc(q.explanation||'')}</div></div>`}).join('')}`:'';const d=overlay(`<div class="modal" style="width:min(960px,96vw)"><button class="x">×</button><h2>Xem trước bài học</h2><p class="muted">Bạn có thể chỉnh từng phần trước khi lưu.</p><div class="field"><label>Tựa đề</label><input id="t" value="${esc(v.title||'')}"></div><div class="row"><div class="field"><label>Phân đoạn Kinh Thánh</label><input id="sr" value="${esc(v.scripture_reference||'')}"></div><div class="field"><label>Câu gốc</label><input id="kr" value="${esc(v.key_verse_reference||'')}"></div></div><div class="field"><label>Câu gốc · Bản 1925</label><textarea id="kv" rows="3">${esc(v.key_verse_1925||'')}</textarea></div><div class="field"><label>Tóm tắt</label><textarea id="s" rows="4">${esc(v.summary||'')}</textarea></div><div class="field"><label>Giới thiệu / Ý dẫn</label><textarea id="intro" rows="5">${esc(v.introduction||'')}</textarea></div><div class="field"><label>Bối cảnh</label><textarea id="bg" rows="5">${esc(v.background||'')}</textarea></div><div class="field"><label>Chuyển ý</label><textarea id="tr" rows="3">${esc(v.transition_text||'')}</textarea></div>${pointHtml?`<h3 class="title" style="font-size:20px">Các ý chính · giải thích · ví dụ</h3>${pointHtml}`:''}<div class="field"><label>Áp dụng</label><textarea id="app" rows="5">${esc(v.application||'')}</textarea></div><div class="field"><label>Câu hỏi suy ngẫm · mỗi dòng một câu</label><textarea id="rq" rows="6">${esc(rqs.map(x=>typeof x==='string'?x:(x.question||x.text||'')).join('\n'))}</textarea></div><div class="field"><label>Lời cầu nguyện</label><textarea id="pr" rows="5">${esc(v.prayer||'')}</textarea></div><div class="field"><label>Chủ đề / Tags</label><input id="tags" value="${esc((Array.isArray(v.tags)?v.tags:[]).join(', '))}"></div>${quizHtml}<div class="modalActions"><button class="btn gold" id="save">Lưu bài học + ${qs.length} câu trắc nghiệm</button></div></div>`);d.querySelector('#save').onclick=async()=>{const btn=d.querySelector('#save');btn.disabled=true;btn.textContent='Đang lưu…';try{const main=[...d.querySelectorAll('[data-point]')].map(x=>({title:x.querySelector('.pt').value.trim(),content:x.querySelector('.pc').value.trim()})).filter(x=>x.title||x.content);const refl=d.querySelector('#rq').value.split('\n').map(x=>x.trim()).filter(Boolean);const tags=d.querySelector('#tags').value.split(',').map(x=>x.trim()).filter(Boolean);const sourceKind=ctx.mode==='text'?'pasted_text':ctx.mode==='images'?'image':ctx.mode;const lesson={title:d.querySelector('#t').value.trim(),summary:d.querySelector('#s').value.trim(),scripture_reference:d.querySelector('#sr').value.trim(),key_verse_reference:d.querySelector('#kr').value.trim(),key_verse_1925:d.querySelector('#kv').value.trim(),introduction:d.querySelector('#intro').value.trim(),background:d.querySelector('#bg').value.trim(),transition_text:d.querySelector('#tr').value.trim(),application:d.querySelector('#app').value.trim(),prayer:d.querySelector('#pr').value.trim(),main_content:main,reflection_questions:refl,tags,source_kind:sourceKind,is_published:true,folder_slug:ctx.folder};const res=await adm('save_lesson',{lesson});for(let i=0;i<qs.length;i++){const z=qs[i],o=Array.isArray(z.options)?Object.fromEntries(['A','B','C','D'].map((k,j)=>[k,z.options[j]||''])):(z.options||{});await adm('save_question',{question:{lesson_id:res.lesson.id,question_text:z.question_text||z.question||'',options:o,sort_order:i+1,scripture_reference:z.scripture_reference||lesson.scripture_reference||''},answer:{correct_option:z.correct_option||'',explanation:z.explanation||'',scripture_reference:z.scripture_reference||lesson.scripture_reference||''}})}for(const f of ctx.files){const up=await adm('create_upload_url',{file_name:f.name});await fetch(up.signed_url,{method:'PUT',headers:{'content-type':f.type||'application/octet-stream'},body:f});await adm('register_attachment',{attachment:{lesson_id:res.lesson.id,file_name:f.name,file_path:up.path,mime_type:f.type,file_size:f.size,source_kind:sourceKind}})}d.remove();await load();openLesson(res.lesson.id)}catch(e){btn.disabled=false;btn.textContent='Lưu lại';alert(e.message)}}};
/* Admin lesson actions: append to the actual PDF export toolbar, including when
   later feature patches replace the lesson detail renderer. */
(function(){
  let busy=false;
  function syncLessonActions(){
    if(busy)return;
    busy=true;
    try{
      const lesson=typeof S!=='undefined'&&S.selected;
      const admin=typeof S!=='undefined'&&Boolean(S.pin);
      document.querySelectorAll('[data-lesson-admin-toolbar]').forEach(el=>{
        if(!admin||!lesson||el.dataset.lessonAdminToolbar!==String(lesson.id))el.remove();
      });
      if(!admin||!lesson)return;
      const buttons=[...document.querySelectorAll('button')];
      const pdf=buttons.find(b=>/Xuất PDF bài học/i.test(b.textContent||''))||
                buttons.find(b=>/Xuất PDF/i.test(b.textContent||'')&&b.closest('.lesson,article,.panel'));
      if(!pdf)return;
      const toolbar=pdf.parentElement;
      if(!toolbar||toolbar.querySelector('[data-lesson-admin-toolbar]'))return;
      toolbar.style.display='flex';
      toolbar.style.flexWrap='wrap';
      toolbar.style.alignItems='center';
      toolbar.style.gap='8px';
      const wrapper=document.createElement('span');
      wrapper.dataset.lessonAdminToolbar=String(lesson.id);
      wrapper.style.cssText='display:inline-flex;gap:8px;flex-wrap:wrap;align-items:center';
      const edit=document.createElement('button');
      edit.type='button';edit.className='btn gold';
      edit.textContent='✎ Sửa bài học';
      edit.addEventListener('click',()=>{if(typeof editLesson==='function')editLesson(lesson.id);else alert('Chức năng chỉnh sửa chưa được tải.');});
      const del=document.createElement('button');
      del.type='button';del.className='btn white';
      del.style.cssText='color:#b42318;border:1px solid #b42318';
      del.textContent='🗑 Xóa bài học';
      del.addEventListener('click',()=>{if(typeof deleteLesson==='function')deleteLesson(lesson.id);else alert('Chức năng xóa chưa được tải.');});
      wrapper.append(edit,del);toolbar.appendChild(wrapper);
    }finally{busy=false;}
  }
  if(typeof MutationObserver!=='undefined'){
    const observer=new MutationObserver(()=>syncLessonActions());
    const start=()=>{observer.observe(document.body,{childList:true,subtree:true});syncLessonActions();};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }
})();

/* Friendly editor for nested lesson JSON. Keep original textareas as canonical
   save fields, and sync a structured form before the existing save handler. */
(function(){
 const names={main_content:'Nội dung bài học',recap_points:'Các điểm tóm tắt',reflection_questions:'Câu hỏi suy ngẫm'};
 function mount(){
  const modal=[...document.querySelectorAll('.modal')].find(x=>x.querySelector('#saveEdit')&&x.querySelector('[data-field="main_content"]'));
  if(!modal||modal.dataset.structuredEditorReady)return;
  modal.dataset.structuredEditorReady='1';
  const tracked=[];
  for(const key of Object.keys(names)){
   const textarea=modal.querySelector('[data-field="'+key+'"]');
   if(!textarea)continue;
   let value;try{value=JSON.parse(textarea.value||'[]')}catch(e){continue}
   const field=textarea.closest('.field')||textarea.parentElement;
   textarea.style.display='none';
   const panel=document.createElement('div');
   panel.className='structured-lesson-editor';
   panel.style.cssText='padding:12px;border:1px solid #ddd3bf;border-radius:12px;margin:8px 0 18px';
   const heading=field.querySelector('label');
   if(heading)heading.textContent=names[key];
   field.appendChild(panel);
   const build=(parent,containerKey,depth)=>{
    if(depth>20)return;
    const current=parent[containerKey];
    const isArray=Array.isArray(current),isObject=current!==null&&typeof current==='object';
    if(!isArray&&!isObject){
     const input=document.createElement(typeof current==='string'&&current.length>110?'textarea':'input');
     if(input.tagName==='INPUT')input.type='text';
     input.value=current==null?'':String(current);
     input.style.cssText='display:block;width:100%;min-height:38px;margin:5px 0 10px;padding:8px;border:1px solid #d6cbbb;border-radius:8px;box-sizing:border-box';
     input.addEventListener('input',()=>{parent[containerKey]=typeof current==='number'?Number(input.value):typeof current==='boolean'?input.value==='true':input.value});
     return input;
    }
    const group=document.createElement('div');
    group.style.cssText='margin:8px 0 12px;padding:8px 10px;border-left:2px solid #c7ad75';
    const keys=Object.keys(current);
    for(const k of keys){
     const item=document.createElement('div');
     const label=document.createElement('label');
     label.style.cssText='display:block;font-weight:600;margin:8px 0 4px;font-size:13px';
     const labels={title:'Tiêu đề',content:'Nội dung',explanation:'Giải thích',subpoints:'Các ý phụ',items:'Các ý',item:'Ý',question:'Câu hỏi',text:'Nội dung',scripture_reference:'Kinh Thánh',application:'Áp dụng'};
     label.textContent=isArray?'Mục '+(Number(k)+1):(labels[k]||k.replaceAll('_',' '));
     item.appendChild(label);
     item.appendChild(build(current,k,depth+1));
     if(isArray){
      const remove=document.createElement('button');remove.type='button';remove.className='btn white';remove.textContent='Xóa mục này';
      remove.style.cssText='font-size:12px;margin-bottom:8px';
      remove.onclick=()=>{current.splice(Number(k),1);render()};
      item.appendChild(remove);
     }
     group.appendChild(item);
    }
    if(isArray){
     const add=document.createElement('button');add.type='button';add.className='btn white';add.textContent='+ Thêm mục';
     add.onclick=()=>{const template=current.length?JSON.parse(JSON.stringify(current[current.length-1])):(containerKey==='subpoints'||containerKey==='items'?{title:'',items:[]}:containerKey==='main_content'?{title:'',subpoints:[]}:containerKey==='reflection_questions'?'':'');function clear(x){if(Array.isArray(x))return [];if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,clear(v)]));return typeof x==='string'?'':x}current.push(clear(template));render()};
     group.appendChild(add);
    }
    return group;
   };
   function render(){panel.replaceChildren(build({root:value},'root',0))}
   render();
   tracked.push({textarea,getValue:()=>value});
  }
  const save=modal.querySelector('#saveEdit');
  if(save)save.addEventListener('click',()=>{for(const f of tracked)f.textarea.value=JSON.stringify(f.getValue());},true);
 }
 const obs=new MutationObserver(()=>mount());
 const start=()=>{obs.observe(document.body,{childList:true,subtree:true});mount()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Remember Admin sign-in for up to 15 days; never persist the password.
   Restore synchronously before the page's first load, and validate remotely. */
(function(){
 const KEY='theology_remember_admin_v1';
 const LIMIT=15*24*60*60*1000;
 const saved=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}})();
 const valid=!!(saved&&typeof saved.session==='string'&&saved.session&&
   typeof saved.savedAt==='number'&&Date.now()-saved.savedAt>=0&&Date.now()-saved.savedAt<LIMIT);
 if(valid){
   S.pin=saved.session;S.adminName=saved.name||'';S.isPrimary=!!saved.primary;
 }else{try{localStorage.removeItem(KEY)}catch(e){}}
 const oldAdm=adm;
 adm=async function(action,payload={},pin=S.pin){
   try{
     const result=await oldAdm(action,payload,pin);
     if(action==='admin_login'){
       const cb=document.getElementById('rememberAdmin');
       if(cb&&cb.checked&&result.session){
         try{localStorage.setItem(KEY,JSON.stringify({session:result.session,name:result.admin_name||'',primary:!!result.is_primary,savedAt:Date.now()}))}catch(e){}
       }else{try{localStorage.removeItem(KEY)}catch(e){}}
     }
     if(action==='admin_logout'){try{localStorage.removeItem(KEY)}catch(e){}}
     return result;
   }catch(e){
     if(action==='load_admin_snapshot'&&valid&&pin===saved.session){
       try{localStorage.removeItem(KEY)}catch(err){}
       S.pin='';S.adminName='';S.isPrimary=false;
     }
     throw e;
   }
 };
 const oldLock=lockAdmin;
 lockAdmin=async function(){try{localStorage.removeItem(KEY)}catch(e){}return oldLock.apply(this,arguments)};
 function inject(){
   const pin=document.getElementById('adminPin');
   if(!pin||document.getElementById('rememberAdmin')||document.getElementById('oldPin'))return;
   const field=pin.closest('.field');if(!field)return;
   const label=document.createElement('label');
   label.style.cssText='display:flex;align-items:center;gap:9px;margin:10px 0 15px;cursor:pointer';
   const cb=document.createElement('input');cb.id='rememberAdmin';cb.type='checkbox';
   cb.checked=valid;cb.style.cssText='width:auto;min-width:17px;height:17px;margin:0';
   label.append(cb,document.createTextNode('Ghi nhớ đăng nhập trong 15 ngày trên thiết bị này'));
   field.after(label);
 }
 const start=()=>{new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});inject()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Church bylaws navigation: works with dynamically rebuilt sidebars. */
(()=>{const insert=()=>{const nav=document.querySelector('.nav,nav,.sidebar');if(!nav||nav.querySelector('[data-church-rules]'))return;const a=document.createElement('a');a.href='./noi-quy.html';a.dataset.churchRules='true';a.textContent='📜 Nội Quy Hội Thánh';a.style.cssText='display:block;padding:12px 14px;border-radius:12px;color:#d7e4f5;text-decoration:none;font-weight:600';const target=[...nav.querySelectorAll('button,a')].find(el=>/Chi phí AI|Quản lý Admin/i.test(el.textContent||''));if(target)target.before(a);else nav.append(a)};new MutationObserver(insert).observe(document.documentElement,{subtree:true,childList:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insert);else insert()})();
