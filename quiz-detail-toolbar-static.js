// Static-host version: answer review toolbar only. Management and premium UI are loaded locally by static-app.html.
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
