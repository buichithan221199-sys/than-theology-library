// Show quiz answer review button inside an individual lesson in admin mode.
(function(){
  const previousDetail=detail;
  detail=function(){
    const html=previousDetail();
    if(!S.pin||!S.selected)return html;
    const lessonQs=S.questions.filter(q=>q.lesson_id===S.selected.id);
    if(!lessonQs.length)return html;
    const bar=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px"><button class="btn gold" onclick="showAllQuizAnswers()">✓ Hiển thị toàn bộ đáp án đúng</button></div>`;
    const marker='<h3>Câu hỏi trắc nghiệm</h3>';
    if(html.includes(marker))return html.replace(marker,marker+bar);
    return html+bar;
  };
})();

// Load management, premium UI, faith/prayer features, then automatic covers.
(async()=>{
  try{
    const base='https://raw.githubusercontent.com/buichithan221199-sys/than-theology-library/main/';
    const mg=await fetch(base+'lesson-management-patch.js?v='+Date.now(),{cache:'no-store'});if(!mg.ok)throw new Error('Không tải được công cụ quản lý bài học');
    eval(await mg.text());
    const ui=await fetch(base+'premium-ui-patch.js?v='+Date.now(),{cache:'no-store'});if(!ui.ok)throw new Error('Không tải được giao diện mới');
    eval(await ui.text());
    const faith=await fetch(base+'faith-content-patch.js?v='+Date.now(),{cache:'no-store'});if(!faith.ok)throw new Error('Không tải được Câu chuyện đức tin / Lời cầu nguyện');
    eval(await faith.text());
    const cover=await fetch(base+'auto-cover-patch.js?v='+Date.now(),{cache:'no-store'});if(!cover.ok)throw new Error('Không tải được chức năng tạo ảnh tự động');
    eval(await cover.text());
    if(typeof render==='function')render();
  }catch(err){console.error('theology patches',err)}
})();
