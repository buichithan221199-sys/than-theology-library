// Capture the complete audio transcript before it is structured into a lesson.
// The MP3/audio file itself remains ephemeral and is not retained.
(function(){
  const beforeVerbatimCapture=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||'');
    const fd=init?.body instanceof FormData?init.body:null;
    if(url===AI&&fd&&String(fd.get('mode')||'')==='text'&&String(fd.get('source_origin')||'')==='audio'){
      const verbatim=String(fd.get('text')||'');
      const r=await beforeVerbatimCapture(input,init);
      if(!verbatim.trim())return r;
      const raw=await r.clone().text();let j=null;
      try{j=raw?JSON.parse(raw):null}catch{return r}
      if(j?.lesson&&typeof j.lesson==='object')j.lesson.verbatim_transcript=verbatim;
      const headers=new Headers(r.headers);headers.set('Content-Type','application/json; charset=utf-8');headers.set('Cache-Control','no-store');
      return new Response(JSON.stringify(j),{status:r.status,statusText:r.statusText,headers});
    }
    return beforeVerbatimCapture(input,init);
  };
})();
