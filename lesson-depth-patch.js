// Deep lesson UI: route Scripture lesson generation to dedicated deep generator and add end-of-lesson recap.
(function(){
  const DEEP=SB+'/functions/v1/theology-scripture-lesson';
  const style=document.createElement('style');style.id='lesson-depth-style';style.textContent=`
    .lesson-ending{margin-top:34px;padding-top:24px;border-top:1px solid #e8dfd1}.lesson-ending h3{font:700 24px Georgia,serif;color:#17375f;margin:18px 0 10px}.lesson-summary-box{background:#f8f4ea;border:1px solid #e7dcc7;border-radius:16px;padding:18px;white-space:pre-line;line-height:1.75}.lesson-takeaway-box{background:#fff8e6;border:1px solid #ead69a;border-left:5px solid #d5a93f;border-radius:14px;padding:18px;line-height:1.75}.lesson-prayer-box{background:#f7f8fb;border:1px solid #dfe5ef;border-left:5px solid #17375f;border-radius:14px;padding:18px;line-height:1.8;font-style:italic}.lesson-ending .ending-kicker{font-size:11px;font-weight:900;letter-spacing:1.4px;color:#a47620;text-transform:uppercase}
  `;if(!document.getElementById(style.id))document.head.appendChild(style);

  window.openScriptureComposer=function(){
    const d=overlay(`<div class="modal"><button class="x">×</button><h2>Soạn bài học từ Kinh Thánh</h2><p class="muted">Bài học sẽ đi sâu vào Kinh Thánh, đời sống thực tế, tự xét và áp dụng; cuối bài luôn có Tóm tắt các ý chính, Bài học rút ra và Lời cầu nguyện.</p><div class="field"><label>Phân đoạn / nội dung Kinh Thánh</label><textarea id="scriptureText" rows="14" placeholder="Ví dụ: Công vụ 13:1–3, hoặc dán nguyên văn phân đoạn..."></textarea></div><div id="err"></div><div class="modalActions"><button class="btn gold" id="go">Soạn bài & xem trước</button></div></div>`);
    d.querySelector('#go').onclick=async()=>{
      const text=d.querySelector('#scriptureText').value.trim();
      if(!text){d.querySelector('#err').innerHTML='<div class="error">Chưa nhập phân đoạn Kinh Thánh.</div>';return}
      const b=d.querySelector('#go');
      try{
        b.disabled=true;b.textContent='Đang soạn bài sâu…';
        const fd=new FormData();fd.append('text',text);
        const r=await fetch(DEEP,{method:'POST',body:fd});const j=await r.json();
        if(!r.ok)throw Error(j.error||'Không xử lý được');
        d.remove();previewResult(j.lesson||j,{targetType:'lesson',lessonId:'',folder:'scripture-lessons',files:[],mode:'text'});
      }catch(e){b.disabled=false;b.textContent='Soạn bài & xem trước';d.querySelector('#err').innerHTML='<div class="error">'+esc(e.message)+'</div>'}
    };
  };

  // Ordinary lessons end with one clean closing sequence:
  // Tóm tắt các ý chính -> Bài học rút ra -> Lời cầu nguyện.
  const oldDetailDepth=detail;
  detail=function(){
    let h=oldDetailDepth();
    const l=S.selected;
    if(!l||['faith_story','short_prayer'].includes(l.source_kind))return h;

    // Remove the older duplicated placements before adding the closing section.
    if(l.summary)h=h.replace(`<h3>Tóm tắt</h3><p>${esc(l.summary)}</p>`,'');
    if(l.application)h=h.replace(`<h3>Áp dụng chung</h3><p>${esc(l.application)}</p>`,'');
    if(l.prayer)h=h.replace(`<h3>Lời cầu nguyện</h3><p>${esc(l.prayer)}</p>`,'');

    if(!l.summary&&!l.application&&!l.prayer)return h;
    const ending=`<section class="lesson-ending"><div class="ending-kicker">Cuối bài</div>${l.summary?`<h3>Tóm tắt các ý chính</h3><div class="lesson-summary-box">${esc(l.summary)}</div>`:''}${l.application?`<h3>Bài học rút ra</h3><div class="lesson-takeaway-box">${esc(l.application)}</div>`:''}${l.prayer?`<h3>Lời cầu nguyện</h3><div class="lesson-prayer-box">${esc(l.prayer)}</div>`:''}</section>`;
    return h.replace('</article>',ending+'</article>');
  };
})();
