// Premium visual refresh for Thư Viện Thần Học. Keeps existing data/features and upgrades presentation.
(function(){
  const PHOTO={
    bible:'https://unsplash.com/photos/2dE06Y4GSZk/download?force=true&w=1600',
    study:'https://unsplash.com/photos/52DIsLNYTKs/download?force=true&w=1400',
    cross:'https://unsplash.com/photos/ITiJrBI3XnE/download?force=true&w=1400',
    library:'https://unsplash.com/photos/UolPvs1rBk8/download?force=true&w=1400',
    scripture:'https://unsplash.com/photos/EOwN2FTGjc0/download?force=true&w=1400'
  };
  const fallbackPhotos=[PHOTO.bible,PHOTO.study,PHOTO.library,PHOTO.scripture];
  function hashText(s){let h=0;for(const c of String(s||''))h=(h*31+c.charCodeAt(0))>>>0;return h}
  window.lessonVisual=function(l,i=0){
    if(l?.cover_image_url)return l.cover_image_url;
    const t=(l?.title||'')+' '+(l?.scripture_reference||'');
    if(/kinh thánh|châm ngôn|thi thiên|giê-rê-mi|công vụ|phúc âm|sáng thế|xuất ê/i.test(t))return PHOTO.bible;
    if(/cầu nguyện|thập tự|chúa|đức chúa/i.test(t))return PHOTO.cross;
    return fallbackPhotos[(hashText(t)+i)%fallbackPhotos.length];
  };

  const style=document.createElement('style');
  style.id='premium-ui-style';
  style.textContent=`
  :root{--navy:#0b2346;--navy2:#153b68;--navy3:#07182f;--gold:#d4aa4d;--gold2:#f0d189;--cream:#f6f1e8;--cream2:#fbf8f1;--ink:#17253a;--muted:#738095;--line:#e6ddcf}
  html{scroll-behavior:smooth}body{background:linear-gradient(180deg,#f8f5ee 0%,#f3eee4 100%);color:var(--ink);letter-spacing:.01em}
  .app{grid-template-columns:270px minmax(0,1fr)}
  .side{background:radial-gradient(circle at 30% 5%,#1c4c7d 0,transparent 26%),linear-gradient(180deg,#0a2448 0%,#06162c 68%,#04101e 100%);padding:22px 16px;box-shadow:18px 0 45px #07162c18;border-right:1px solid #e2bf6d26}
  .brand{border:1px solid #e2bd5d38;background:linear-gradient(145deg,#ffffff0e,#ffffff05);box-shadow:inset 0 1px 0 #ffffff12,0 18px 45px #0000001e;padding:18px;border-radius:22px;position:relative;overflow:hidden}
  .brand:before{content:'✝';position:absolute;right:14px;top:8px;font:700 50px Georgia,serif;color:#e7c66c20}
  .brand b{font-size:23px;line-height:1.1;letter-spacing:.01em}.brand span{display:block;margin-top:7px;letter-spacing:.12em;text-transform:uppercase;font-size:10px;color:#e8c76f}
  .nav{gap:6px}.nav button,.admin{border-radius:13px;transition:.18s ease;font-weight:700}.nav button:hover,.nav button.on{background:linear-gradient(90deg,#1b4b7d,#173d68);box-shadow:inset 3px 0 0 #e3bc5c;color:white;transform:translateX(1px)}
  .top{height:78px;background:#fffdf9e8;backdrop-filter:blur(16px);border-bottom:1px solid #e5dccd;box-shadow:0 8px 30px #122c4b08}.top h1{font-size:26px;letter-spacing:-.02em}.content{padding:30px;max-width:1480px}
  .btn{border-radius:12px;box-shadow:none;transition:.16s ease}.btn:hover{transform:translateY(-1px)}.gold{background:linear-gradient(180deg,#e6c76d,#c99734);box-shadow:0 8px 18px #c997342a}.white{background:#fffdfa;border-color:#dfd5c6}
  .hero.premium-hero{min-height:440px;padding:0;position:relative;overflow:hidden;background:#071b35;border:1px solid #d7b35a33;box-shadow:0 28px 70px #132d4a28}
  .premium-hero .hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(.84) contrast(1.02)}
  .premium-hero .hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,#06162ff2 0%,#071d37d9 42%,#071d3770 68%,#06162f24 100%),linear-gradient(0deg,#04122275,transparent 44%)}
  .premium-hero .hero-copy{position:relative;z-index:2;max-width:750px;padding:64px 58px 58px}.premium-hero small{font-size:11px;letter-spacing:.18em}.premium-hero h2{font-size:46px;line-height:1.08;margin:14px 0 18px;text-shadow:0 2px 25px #0008}.premium-hero p{font-size:16px;line-height:1.75;color:#e8edf4}.premium-hero .hero-kicker{display:inline-flex;align-items:center;gap:9px;border:1px solid #e8c66b55;background:#071a3094;padding:8px 12px;border-radius:999px;color:#f0d58f;font-size:11px;font-weight:800;letter-spacing:.08em}
  .stats{gap:16px;margin:22px 0}.stat{padding:20px 22px;border-radius:18px;background:linear-gradient(180deg,#fff,#fcfaf5);box-shadow:0 12px 34px #17314d0d;border-color:#e8dfd2;position:relative;overflow:hidden}.stat:after{content:'';position:absolute;width:72px;height:72px;border-radius:50%;right:-20px;bottom:-28px;background:#d6ad4c12}.stat b{font-size:31px}.stat span{font-size:11px;letter-spacing:.06em;text-transform:uppercase}
  .title{letter-spacing:-.015em}.cards{gap:18px}.card{padding:0;overflow:hidden;border-radius:20px;background:#fff;border:1px solid #e4dbce;box-shadow:0 12px 38px #17314d10;transition:.18s ease}.card:hover{transform:translateY(-4px);box-shadow:0 18px 44px #17314d1a}.lesson-thumb{height:156px;background:#0d2e52 center/cover no-repeat;position:relative}.lesson-thumb:after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#0a203e9c,transparent 65%)}.lesson-thumb .badge{position:absolute;left:14px;bottom:12px;z-index:1;background:#fffdf2e8;color:#70531b;padding:6px 9px;border-radius:999px;font-size:10px;font-weight:900;backdrop-filter:blur(8px)}.card-body{padding:18px 18px 20px}.card h3{font-size:20px;line-height:1.28;margin:6px 0 9px}.card p{font-size:13px;line-height:1.6;margin:0}.card .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#9a7428;font-size:11px;font-weight:800}
  .panel{border-radius:22px;border-color:#e6ddd0;background:#fffefa;box-shadow:0 14px 42px #17314d0c}.panel> .title:first-child{margin-bottom:18px}
  .premium-folder-head{background:linear-gradient(135deg,#0d2f55,#163f6d);color:white;border-radius:18px;padding:18px}.premium-folder-head .muted{color:#d9e2ee}
  .lesson.premium-lesson{padding:0;overflow:hidden}.lesson-cover{height:310px;position:relative;background-size:cover;background-position:center}.lesson-cover:after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#07182ee3 0%,#07182e6b 52%,transparent 100%)}.lesson-cover-copy{position:absolute;left:34px;right:34px;bottom:28px;z-index:2;color:#fff}.lesson-cover-copy .eyebrow{font-size:11px;font-weight:900;color:#f1d17f;letter-spacing:.12em;text-transform:uppercase}.lesson-cover-copy h2{color:white!important;margin:7px 0 0!important;font-size:38px!important;text-shadow:0 2px 22px #0009}.lesson-content-pad{padding:30px 34px 36px}.lesson h3{margin-top:27px;color:#15385f;font:700 21px Georgia,serif}.lesson blockquote{border-radius:14px;background:linear-gradient(135deg,#fff7dd,#fffdf5);border:1px solid #ead89f;border-left:5px solid #d5a93f;box-shadow:0 8px 24px #d5a93f10}.question{border-radius:15px;border-color:#e6ddd1;background:#fffefa;box-shadow:0 7px 22px #17314d08}.opts{gap:8px}.opt{border:1px solid #ebe3d8;background:#fbfaf6;padding:11px 12px}.answer{border-radius:10px;background:#eff8f1;border:1px solid #cfe8d5}
  .modal{border:1px solid #e3dacd;box-shadow:0 30px 100px #05132666}.modal h2{letter-spacing:-.02em}.field label{letter-spacing:.02em}.field input,.field select,.field textarea,input,select,textarea{border-color:#dcd2c3;background:#fffefb;transition:.15s}.field input:focus,.field select:focus,.field textarea:focus,input:focus,select:focus,textarea:focus{outline:none;border-color:#c8a04a;box-shadow:0 0 0 3px #d8ad4b18}
  @media(max-width:900px){.app{grid-template-columns:88px 1fr}.content{padding:24px}.premium-hero .hero-copy{padding:48px 38px}.premium-hero h2{font-size:38px}.lesson-cover-copy h2{font-size:31px!important}}
  @media(max-width:650px){body{background:#f7f3eb}.content{padding:14px 12px 88px}.top{height:64px}.hero.premium-hero{min-height:410px;border-radius:22px}.premium-hero .hero-bg{background-position:62% center}.premium-hero .hero-shade{background:linear-gradient(0deg,#06172ff6 8%,#071d37c9 63%,#06172f55 100%)}.premium-hero .hero-copy{padding:178px 22px 26px}.premium-hero h2{font-size:32px}.premium-hero p{font-size:14px}.premium-hero .actions{gap:8px;flex-wrap:wrap}.stats{gap:10px}.stat{padding:15px}.stat b{font-size:26px}.lesson-thumb{height:150px}.card-body{padding:15px}.lesson-cover{height:270px}.lesson-cover-copy{left:20px;right:20px;bottom:20px}.lesson-cover-copy h2{font-size:27px!important}.lesson-content-pad{padding:20px 18px 28px}.panel{border-radius:18px}.cards{gap:13px}}
  `;
  if(!document.querySelector('#premium-ui-style'))document.head.appendChild(style);

  const oldNav=nav;
  nav=function(){
    let h=oldNav();
    h=h.replace('<div class="brand"><b>Thư Viện<br>Thần Học</b><span>Hành trình đức tin</span></div>','<div class="brand"><div style="font-size:28px;margin-bottom:7px">📖</div><b>Thư Viện<br>Thần Học</b><span>Hành trình đức tin</span></div>');
    return h;
  };

  cards=function(ls){
    return ls.length?`<div class="cards">${ls.map((l,i)=>`<article class="card" onclick="openLesson('${l.id}')"><div class="lesson-thumb" style="background-image:url('${lessonVisual(l,i)}')"><span class="badge">${esc(l.scripture_reference||'Bài học thần học')}</span></div><div class="card-body"><div class="meta"><span>📘 Bài học</span>${l.lesson_date?`<span>• ${esc(String(l.lesson_date).slice(0,10))}</span>`:''}</div><h3>${esc(l.title)}</h3><p>${esc(l.summary||'Mở bài học để xem nội dung chi tiết.')}</p></div></article>`).join('')}</div>`:`<div class="panel empty">Chưa có bài học.</div>`;
  };

  home=function(){
    return `<section class="hero premium-hero"><div class="hero-bg" style="background-image:url('${PHOTO.bible}')"></div><div class="hero-shade"></div><div class="hero-copy"><span class="hero-kicker">✦ HÀNH TRÌNH ĐỨC TIN</span><h2>Lưu giữ Lời Chúa, bài học và hành trình thần học của bạn.</h2><p>Một không gian học tập cá nhân để tổ chức bài học trên lớp, nghiên cứu Kinh Thánh, tài liệu nguồn và câu hỏi trắc nghiệm — rõ ràng, trang trọng và dễ tra cứu.</p><div class="actions"><button class="btn gold" onclick="openImport()">+ Thêm nội dung</button><button class="btn white" onclick="go('lessons')">Mở thư viện</button></div></div></section><div class="stats"><div class="stat"><b>${S.lessons.length}</b><span>Bài học</span></div><div class="stat"><b>${S.questions.length}</b><span>Câu hỏi</span></div><div class="stat"><b>${S.folders.length}</b><span>Thư mục</span></div><div class="stat"><b>1925</b><span>Bản Kinh Thánh</span></div></div><h3 class="title">Bài học gần đây</h3>${cards(S.lessons.slice(0,6))}`;
  };

  const previousDetailPremium=detail;
  detail=function(){
    let h=previousDetailPremium();
    const l=S.selected;if(!l)return h;
    const cover=`<div class="lesson-cover" style="background-image:url('${lessonVisual(l)}')"><div class="lesson-cover-copy"><div class="eyebrow">${esc(l.scripture_reference||'Bài học thần học')}</div><h2>${esc(l.title||'')}</h2></div></div><div class="lesson-content-pad">`;
    if(h.includes('<article class="panel lesson">')){
      h=h.replace('<article class="panel lesson">','<article class="panel lesson premium-lesson">'+cover);
      h=h.replace('</article>','</div></article>');
      // avoid duplicate plain title at the top because it is now on the image cover
      const dup=`<small>${esc(l.scripture_reference||'')}</small><h2>${esc(l.title)}</h2>`;
      h=h.replace(dup,'');
    }
    return h;
  };

  const previousRenderPremium=render;
  render=function(){previousRenderPremium();document.body.classList.add('premium-theology-ui')};
})();
