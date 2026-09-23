// Final PDF toolbar guard: ensure PDF export buttons remain visible after all detail() patches.
(function(){
  if(typeof detail!=='function')return;
  const previousDetail=detail;
  detail=function(){
    let h=previousDetail();
    try{
      if(!S||!S.selected||typeof h!=='string')return h;
      if(h.includes('pdf-action-toolbar'))return h;
      const answerBtn=`<button class="btn white answer-action" onclick="exportQuizAnswerPdf()">✅ Xuất PDF trắc nghiệm + đáp án</button>`;
      const bar=`<div class="pdf-action-toolbar" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px"><button class="btn gold" onclick="exportLessonPdf()">📘 Xuất PDF bài học</button><button class="btn white" onclick="exportQuizPdf()">📝 Xuất PDF trắc nghiệm</button>${answerBtn}</div>`;
      if(h.includes('<article class="panel lesson">'))return h.replace('<article class="panel lesson">','<article class="panel lesson">'+bar);
      return bar+h;
    }catch(e){
      console.error('final pdf toolbar patch error',e);
      return h;
    }
  };
})();
