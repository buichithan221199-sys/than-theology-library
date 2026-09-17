// Home folder browser: show every folder on the homepage and open all content in each folder.
(function(){
  S.homeFolderId = S.homeFolderId || '';

  const css=document.createElement('style');
  css.id='home-folders-style';
  css.textContent=`
    .home-folders{margin-top:28px}.home-folders-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:14px}.home-folders-head h3{margin:0;font:700 25px Georgia,serif;color:#17375f}.home-folders-head p{margin:4px 0 0;color:#788496;font-size:13px}.folder-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.folder-tile{background:linear-gradient(155deg,#fffdf7,#f7f0df);border:1px solid #e2d5bc;border-radius:18px;padding:20px;cursor:pointer;box-shadow:0 10px 28px #17314d0b;min-height:150px;transition:.18s}.folder-tile:hover{transform:translateY(-2px);box-shadow:0 16px 34px #17314d14}.folder-icon{font-size:29px;margin-bottom:14px}.folder-tile h4{margin:0 0 7px;font:700 19px Georgia,serif;color:#15365f}.folder-tile p{margin:0;color:#758093;font-size:12px;line-height:1.5}.folder-count{display:inline-flex;margin-top:15px;padding:6px 9px;border-radius:999px;background:#fff8e7;border:1px solid #ead69a;color:#8a6518;font-size:11px;font-weight:800}.folder-view-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.folder-view-title h2{margin:0;font:700 31px Georgia,serif;color:#15365f}.folder-view-title p{margin:5px 0 0;color:#7c8793}.folder-content-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.folder-content-card{overflow:hidden;padding:0}.folder-content-cover{height:160px;background:#102f54 center/cover no-repeat}.folder-content-body{padding:17px}.folder-content-body small{color:#a57620;font-weight:800}.folder-content-body h3{font:700 20px Georgia,serif;color:#15365f;margin:7px 0}.folder-content-body p{color:#6e7886;font-size:13px;line-height:1.55}.folder-type{font-size:10px;font-weight:900;color:#8c671d;text-transform:uppercase;letter-spacing:.7px}
    @media(max-width:1100px){.folder-grid{grid-template-columns:repeat(2,1fr)}.folder-content-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:650px){.folder-grid,.folder-content-grid{grid-template-columns:1fr}.folder-tile{min-height:125px}.folder-view-head{align-items:flex-start;flex-direction:column}}
  `;
  if(!document.getElementById(css.id))document.head.appendChild(css);

  const countFor=f=>S.lessons.filter(l=>l.folder_id===f.id).length;
  const iconFor=f=>f.slug==='faith-stories'?'♡':f.slug==='short-prayers'?'🙏':f.slug==='scripture-lessons'?'✦':'📁';

  function folderTiles(){
    const fs=[...(S.folders||[])].sort((a,b)=>(a.sort_order||999)-(b.sort_order||999));
    if(!fs.length)return '<div class="panel empty">Chưa có thư mục.</div>';
    return `<section class="home-folders"><div class="home-folders-head"><div><h3>Thư mục nội dung</h3><p>Mở một thư mục để xem toàn bộ nội dung bên trong.</p></div></div><div class="folder-grid">${fs.map(f=>`<article class="folder-tile" onclick="openHomeFolder('${f.id}')"><div class="folder-icon">${iconFor(f)}</div><h4>${esc(f.name)}</h4><p>${esc(f.description||'Các nội dung được lưu trong thư mục này.')}</p><span class="folder-count">${countFor(f)} nội dung</span></article>`).join('')}</div></section>`;
  }

  window.openHomeFolder=function(id){S.homeFolderId=id;S.tab='folder-view';S.selected=null;render()};
  window.closeHomeFolder=function(){S.homeFolderId='';S.tab='home';render()};

  function openAny(l){
    if(l.source_kind==='faith_story'){S.selected=l;S.tab='faith-detail';render();return}
    if(l.source_kind==='short_prayer'){S.selected=l;S.tab='prayer-detail';render();return}
    openLesson(l.id);
  }
  window.openFolderContent=function(id){const l=S.lessons.find(x=>x.id===id);if(l)openAny(l)};

  function folderView(){
    const f=S.folders.find(x=>x.id===S.homeFolderId);
    if(!f)return '<div class="panel empty">Không tìm thấy thư mục.</div>';
    const items=S.lessons.filter(l=>l.folder_id===f.id);
    const cards=items.length?`<div class="folder-content-grid">${items.map((l,i)=>`<article class="card folder-content-card" onclick="openFolderContent('${l.id}')"><div class="folder-content-cover" style="background-image:url('${lessonVisual(l,i)}')"></div><div class="folder-content-body"><div class="folder-type">${l.source_kind==='faith_story'?'Câu chuyện đức tin':l.source_kind==='short_prayer'?'Lời cầu nguyện':f.name}</div><small>${esc(l.scripture_reference||'')}</small><h3>${esc(l.title)}</h3><p>${esc(l.summary||l.prayer||'')}</p></div></article>`).join('')}</div>`:'<div class="panel empty">Thư mục này chưa có nội dung.</div>';
    return `<div class="folder-view-head"><div class="folder-view-title"><h2>${esc(f.name)}</h2><p>${items.length} nội dung</p></div><button class="btn white" onclick="closeHomeFolder()">← Trở về Trang chủ</button></div>${cards}`;
  }

  const oldHomeFolders=home;
  home=function(){return oldHomeFolders()+folderTiles()};

  const oldViewFolders=view;
  view=function(){if(S.tab==='folder-view')return folderView();return oldViewFolders()};

  const oldRenderFolders=render;
  render=function(){oldRenderFolders();if(S.tab==='folder-view'){const f=S.folders.find(x=>x.id===S.homeFolderId);const h=document.querySelector('.top h1');if(h)h.textContent=f?.name||'Thư mục'}};
})();
