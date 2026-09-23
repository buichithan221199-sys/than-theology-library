// Fidelity mode for theology lesson imports: preserve 100% of extracted/transcribed source body.
(function(){
  const EXTRACT=SB+'/functions/v1/theology-source-extract';
  const OUTLINE=SB+'/functions/v1/theology-fidelity-outline';
  const beforeFidelity=window.fetch.bind(window);

  function splitExact(text,maxChars=6500){
    text=String(text??'');
    if(!text.length)return [];
    const chunks=[];let start=0;
    while(start<text.length){
      let end=Math.min(text.length,start+maxChars);
      if(end<text.length){
        let cut=text.lastIndexOf('\n\n',end);
        if(cut<start+Math.floor(maxChars*.55))cut=text.lastIndexOf('\n',end);
        if(cut<start+Math.floor(maxChars*.55))cut=text.lastIndexOf('. ',end);
        if(cut<start+Math.floor(maxChars*.55))cut=text.lastIndexOf(' ',end);
        if(cut>start)end=cut+(text.slice(cut,cut+2)==='. '?2:1);
      }
      if(end<=start)end=Math.min(text.length,start+maxChars);
      chunks.push(text.slice(start,end));
      start=end;
    }
    return chunks.filter(x=>x.length>0);
  }

  async function getOutline(chunks,mode,targetTitle){
    try{
      const r=await beforeFidelity(OUTLINE,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':S.pin||''},body:JSON.stringify({chunks,source_mode:mode,target_title:targetTitle||''})});
      const raw=await r.text();let j={};try{j=raw?JSON.parse(raw):{}}catch{}
      if(r.ok&&j?.outline&&Array.isArray(j.outline.section_titles)&&j.outline.section_titles.length===chunks.length)return j.outline;
      console.warn('Fidelity outline fallback:',j?.error||raw||('HTTP '+r.status));
    }catch(e){console.warn('Fidelity outline fallback:',e)}
    return {title:targetTitle||'Bài học thần học',subtitle:'',teacher:'',scripture_reference:'',key_verse_reference:'',key_verse_1925:'',section_titles:chunks.map((_,i)=>`Phần ${i+1}`),summary:'',application:'',accuracy_notes:[]};
  }

  async function buildFidelityLesson(sourceText,mode,targetTitle,accuracyNotes=[]){
    const exact=String(sourceText??'');
    if(!exact.trim())throw new Error('Không đọc được nội dung nguồn để tạo bài học.');
    const chunks=splitExact(exact);
    if(!chunks.length)throw new Error('Nội dung nguồn bị rỗng.');
    if(chunks.length>80)throw new Error('Nội dung quá dài để sắp xếp trong một lượt.');
    const o=await getOutline(chunks,mode,targetTitle);
    const titles=Array.isArray(o.section_titles)&&o.section_titles.length===chunks.length?o.section_titles:chunks.map((_,i)=>`Phần ${i+1}`);
    return {
      title:targetTitle||o.title||'Bài học thần học',
      subtitle:o.subtitle||'',
      scripture_reference:o.scripture_reference||'',
      key_verse_reference:o.key_verse_reference||'',
      key_verse_1925:o.key_verse_1925||'',
      teacher:o.teacher||'',
      summary:o.summary||'',
      introduction:'',
      background:'',
      transition_text:'',
      main_content:chunks.map((text,i)=>({title:String(titles[i]||`Phần ${i+1}`),scripture_reference:'',explanation:text,subpoints:[]})),
      application:o.application||'',
      reflection_questions:[],
      prayer:'',
      tags:[],
      accuracy_notes:[...(Array.isArray(accuracyNotes)?accuracyNotes:[]),...(Array.isArray(o.accuracy_notes)?o.accuracy_notes:[])],
      questions:[],
      source_transcript:mode==='audio'?'':exact,
      source_kind:mode,
      source_notes:'fidelity_import_v1'
    };
  }

  // Imported theology lessons are already fidelity-structured; never send them through the Bible-lesson standardizer.
  const oldStandardize=window.standardizeBaseLesson;
  window.standardizeBaseLesson=async function(base,sourceMode){
    if(base?.source_notes==='fidelity_import_v1')return base;
    return typeof oldStandardize==='function'?oldStandardize(base,sourceMode):base;
  };
  try{standardizeBaseLesson=window.standardizeBaseLesson}catch{}

  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||'');
    const fd=init?.body instanceof FormData?init.body:null;
    if(fd){
      const mode=String(fd.get('mode')||'');
      const kind=String(fd.get('content_kind')||'');

      // PDF / images / pasted text theology lessons: extract source only, then preserve that source verbatim in the body.
      if(url===PROCESS_CORE&&kind==='lesson'&&['text','pdf','images'].includes(mode)){
        try{
          const er=await beforeFidelity(EXTRACT,{method:'POST',headers:{'x-admin-pin':new Headers(init.headers||{}).get('x-admin-pin')||S.pin||''},body:fd});
          const raw=await er.text();let ej={};try{ej=raw?JSON.parse(raw):{}}catch{}
          if(!er.ok)throw new Error(ej?.error||ej?.message||`Không trích xuất được nguồn (HTTP ${er.status}).`);
          const targetTitle=String(fd.get('target_lesson_title')||'').trim();
          const lesson=await buildFidelityLesson(ej?.source_text||'',mode,targetTitle,ej?.accuracy_notes||[]);
          return new Response(JSON.stringify({lesson,fidelity_preserved:true}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
        }catch(e){
          return new Response(JSON.stringify({error:e?.message||String(e)}),{status:500,headers:{'Content-Type':'application/json; charset=utf-8'}});
        }
      }

      // Second stage of audio flow: transcript already exists. Build the body directly from the full transcript instead of asking AI to rewrite it.
      if(url===AI&&mode==='text'&&String(fd.get('source_origin')||'')==='audio'){
        try{
          const transcript=String(fd.get('text')||'');
          const targetTitle=String(fd.get('target_lesson_title')||'').trim();
          const lesson=await buildFidelityLesson(transcript,'audio',targetTitle,[]);
          return new Response(JSON.stringify({lesson,fidelity_preserved:true,audio_direct:true}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
        }catch(e){
          return new Response(JSON.stringify({error:e?.message||String(e)}),{status:500,headers:{'Content-Type':'application/json; charset=utf-8'}});
        }
      }
    }
    return beforeFidelity(input,init);
  };
})();