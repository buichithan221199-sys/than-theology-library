// Adds heart reflection + recap + takeaway to existing lesson detail pages.
(function(){
  const st=document.createElement('style');
  st.textContent=`.heart-box{margin:26px 0;padding:22px;border-radius:16px;background:#fff8e8;border:1px solid #ead9a6;border-left:5px solid #d6a83d}.heart-box p{font:17px/1.8 Georgia,serif;color:#314257;white-space:pre-line}.recap-box{margin:26px 0;padding:20px 22px;border-radius:16px;background:#f7f9fc;border:1px solid #dce4ef}.recap-box ul{margin:10px 0 0;padding-left:22px}.recap-box li{margin:8px 0;line-height:1.6}.takeaway-box{margin:22px 0;padding:18px 20px;border-radius:14px;background:#0f2f55;color:#fff}.takeaway-box b{color:#f0cf74}.takeaway-box p{font:18px/1.65 Georgia,serif;margin:8px 0 0}`;
  document.head.appendChild(st);
  const oldDetail=detail;
  detail=function(){
    const l=S.selected;
    let h=oldDetail();
    if(!l || ['faith_story','short_prayer'].includes(l.source_kind)) return h;
    const heart=l.heart_reflection?`<section class="heart-box"><h3>Đi sâu vào lòng mình</h3><p>${esc(l.heart_reflection)}</p></section>`:'';
    const pts=Array.isArray(l.recap_points)?l.recap_points:[];
    const recap=pts.length?`<section class="recap-box"><h3>Tóm tắt các ý chính</h3><ul>${pts.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:'';
    const takeaway=l.lesson_takeaway?`<section class="takeaway-box"><b>Bài học rút ra</b><p>${esc(l.lesson_takeaway)}</p></section>`:'';
    const block=heart+recap+takeaway;
    if(!block)return h;
    if(h.includes('<h3>Câu hỏi</h3>')) return h.replace('<h3>Câu hỏi</h3>',block+'<h3>Câu hỏi</h3>');
    return h.replace('</article>',block+'</article>');
  };
})();
