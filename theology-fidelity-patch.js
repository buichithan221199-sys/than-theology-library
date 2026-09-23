// Fidelity import v2: preserve source wording while assigning it to a readable hierarchy.
(function(){
  const EXTRACT=SB+'/functions/v1/theology-source-extract';
  const OUTLINE=SB+'/functions/v1/theology-fidelity-outline';
  const beforeFidelity=window.fetch.bind(window);

  function cleanHeading(v){
    return String(v??'').replace(/\s+/g,' ').trim();
  }
  function parseTimeTitle(raw){
    let s=cleanHeading(raw),time='';
    const m=s.match(/\s*\(((?:\d{1,2}:)?\d{1,2}:\d{2})\)\.?\s*$/);
    if(m){time=m[1];s=s.slice(0,m.index).trim();}
    return {title:s,time_label:time};
  }
  function appendBody(node,line){
    if(!node)return;
    node.explanation=(node.explanation||'')+(node.explanation?'\n':'')+line;
  }
  function hasMeaning(node){
    return !!(String(node?.title||'').trim()||String(node?.explanation||'').trim()||(node?.subpoints||[]).length||(node?.items||[]).length||(node?.subitems||[]).length);
  }
  const ROMAN_HEADING=/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\.\s+(.+)$/i;

  // When a PDF/text already contains I./A./1./a. headings, trust those explicit headings.
  // Only formatting markers are lifted into the hierarchy; body wording stays untouched.
  function parseExplicitHierarchy(sourceText){
    const text=String(sourceText??'').replace(/\f/g,'\n');
    const lines=text.split(/\r?\n/);
    const out=[];
    let section=null,sub=null,item=null,subitem=null;
    let romanCount=0,secondaryCount=0;
    const makeSection=(title,label='',time='',unnumbered=false)=>{
      const x={title,explicit_label:label,time_label:time,unnumbered,explanation:'',subpoints:[],items:[]};out.push(x);section=x;sub=item=subitem=null;return x;
    };
    const ensureSection=()=>section||makeSection('Nội dung','','',true);

    for(const rawLine of lines){
      const line=rawLine.replace(/\s+$/,'');
      const t=line.trim();
      if(!t){
        const target=subitem||item||sub||section;
        if(target && String(target.explanation||'') && !String(target.explanation).endsWith('\n')) target.explanation+='\n';
        continue;
      }
      if(/^GHI CHÚ$/i.test(t))continue;
      let m=t.match(ROMAN_HEADING);
      if(m){
        const z=parseTimeTitle(m[2]);makeSection(z.title,m[1].toUpperCase(),z.time_label);romanCount++;continue;
      }
      if(/^(Câu Hỏi Ôn Bài|Câu Hỏi Áp Dụng|Bảng Chú Giải Thuật Ngữ)$/i.test(t)){
        makeSection(t,'','',true);secondaryCount++;continue;
      }
      m=t.match(/^([A-Z])\.\s+(.+)$/);
      if(m){
        ensureSection();const z=parseTimeTitle(m[2]);sub={title:z.title,explicit_label:m[1],time_label:z.time_label,explanation:'',items:[]};section.subpoints.push(sub);item=subitem=null;secondaryCount++;continue;
      }
      m=t.match(/^(\d+)\.\s+(.+)$/);
      if(m){
        ensureSection();const z=parseTimeTitle(m[2]);item={title:z.title,explicit_label:m[1],time_label:z.time_label,explanation:'',subitems:[]};
        if(sub)sub.items.push(item);else section.items.push(item);
        subitem=null;secondaryCount++;continue;
      }
      m=t.match(/^([a-z])\.\s+(.+)$/);
      if(m && item){
        const z=parseTimeTitle(m[2]);subitem={title:z.title,explicit_label:m[1],time_label:z.time_label,explanation:''};item.subitems.push(subitem);secondaryCount++;continue;
      }
      appendBody(subitem||item||sub||ensureSection(),line);
    }
    const meaningful=out.filter(hasMeaning);
    if(romanCount<2 || secondaryCount<2)return null;
    return meaningful;
  }

  // Exact slices: every character belongs to exactly one unit. No trim/filter is used on stored text.
  function splitExactUnits(text,maxUnits=72){
    text=String(text??'');
    if(!text.length)return [];
    const target=Math.max(900,Math.min(4200,Math.ceil(text.length/Math.max(10,Math.min(maxUnits-4,56)))));
    const chunks=[];let start=0;
    while(start<text.length){
      let end=Math.min(text.length,start+target);
      if(end<text.length){
        const floor=start+Math.floor(target*.55);
        const cuts=[text.lastIndexOf('\n\n',end),text.lastIndexOf('\n',end),text.lastIndexOf('. ',end),text.lastIndexOf('! ',end),text.lastIndexOf('? ',end),text.lastIndexOf(' ',end)];
        const cut=cuts.find(x=>x>=floor);
        if(cut>=floor){
          if(text.slice(cut,cut+2)==='\n\n')end=cut+2;
          else if(['. ','! ','? '].includes(text.slice(cut,cut+2)))end=cut+2;
          else end=cut+1;
        }
      }
      if(end<=start)end=Math.min(text.length,start+target);
      chunks.push(text.slice(start,end));start=end;
      if(chunks.length>=maxUnits-1 && start<text.length){chunks.push(text.slice(start));break;}
    }
    return chunks;
  }

  async function getOutline(units,mode,targetTitle){
    try{
      const r=await beforeFidelity(OUTLINE,{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':S.pin||''},body:JSON.stringify({chunks:units,source_mode:mode,target_title:targetTitle||''})});
      const raw=await r.text();let j={};try{j=raw?JSON.parse(raw):{}}catch{}
      if(r.ok&&j?.outline&&Array.isArray(j.outline.placements)&&j.outline.placements.length===units.length)return j.outline;
      console.warn('Fidelity hierarchy fallback:',j?.error||raw||('HTTP '+r.status));
    }catch(e){console.warn('Fidelity hierarchy fallback:',e)}
    return {title:targetTitle||'Bài học thần học',subtitle:'',teacher:'',scripture_reference:'',key_verse_reference:'',key_verse_1925:'',summary:'',application:'',accuracy_notes:[],placements:units.map((_,i)=>({section_no:i+1,section_title:`Phần ${i+1}`,subsection_no:0,subsection_title:'',item_no:0,item_title:''}))};
  }

  function reconstructHierarchy(units,placements){
    const sections=[];let sec=null,sub=null,item=null;
    const keyOf=(n,t)=>`${Number(n)||0}|${String(t||'').trim()}`;
    let lastSec='',lastSub='',lastItem='';
    for(let i=0;i<units.length;i++){
      const p=placements[i]||{},u=units[i];
      const sn=Math.max(1,Number(p.section_no)||1),st=cleanHeading(p.section_title)||`Phần ${sn}`;
      const sk=keyOf(sn,st);
      if(!sec||sk!==lastSec){sec={title:st,explicit_label:'',time_label:'',unnumbered:false,explanation:'',subpoints:[],items:[]};sections.push(sec);sub=item=null;lastSec=sk;lastSub=lastItem='';}
      const bn=Math.max(0,Number(p.subsection_no)||0),bt=cleanHeading(p.subsection_title);
      const inn=Math.max(0,Number(p.item_no)||0),it=cleanHeading(p.item_title);
      if(bn>0||bt){
        const bk=keyOf(bn||1,bt||`Mục ${bn||1}`);
        if(!sub||bk!==lastSub){sub={title:bt||`Mục ${bn||1}`,explicit_label:'',time_label:'',explanation:'',items:[]};sec.subpoints.push(sub);item=null;lastSub=bk;lastItem='';}
        if(inn>0||it){
          const ik=keyOf(inn||1,it||`Ý ${inn||1}`);
          if(!item||ik!==lastItem){item={title:it||`Ý ${inn||1}`,explicit_label:'',time_label:'',explanation:'',subitems:[]};sub.items.push(item);lastItem=ik;}
          item.explanation+=u;
        }else sub.explanation+=u;
      }else if(inn>0||it){
        const ik=keyOf(inn||1,it||`Ý ${inn||1}`);
        if(!item||ik!==lastItem){item={title:it||`Ý ${inn||1}`,explicit_label:'',time_label:'',explanation:'',subitems:[]};sec.items.push(item);lastItem=ik;}
        item.explanation+=u;
      }else sec.explanation+=u;
    }
    return sections;
  }

  async function buildFidelityLesson(sourceText,mode,targetTitle,accuracyNotes=[]){
    const exact=String(sourceText??'');
    if(!exact.trim())throw new Error('Không đọc được nội dung nguồn để tạo bài học.');
    const explicit=parseExplicitHierarchy(exact);
    let mainContent=[],o={};
    if(explicit){
      mainContent=explicit;
      o=await getOutline([exact],mode,targetTitle); // metadata only; hierarchy already comes from source headings.
    }else{
      const units=splitExactUnits(exact);
      if(!units.length)throw new Error('Nội dung nguồn bị rỗng.');
      const rebuilt=units.join('');if(rebuilt!==exact)throw new Error('Kiểm tra toàn vẹn nội dung thất bại.');
      o=await getOutline(units,mode,targetTitle);
      mainContent=reconstructHierarchy(units,Array.isArray(o.placements)?o.placements:[]);
    }
    return {
      title:targetTitle||o.title||'Bài học thần học',
      subtitle:o.subtitle||'',
      scripture_reference:o.scripture_reference||'',
      key_verse_reference:o.key_verse_reference||'',
      key_verse_1925:o.key_verse_1925||'',
      teacher:o.teacher||'',
      summary:o.summary||'',
      introduction:'',background:'',transition_text:'',
      main_content:mainContent,
      application:o.application||'',reflection_questions:[],prayer:'',tags:[],
      accuracy_notes:[...(Array.isArray(accuracyNotes)?accuracyNotes:[]),...(Array.isArray(o.accuracy_notes)?o.accuracy_notes:[])],
      questions:[],source_transcript:mode==='audio'?'':exact,source_kind:mode,
      source_notes:'fidelity_import_v2'
    };
  }

  window.parseExplicitFidelityHierarchy=parseExplicitHierarchy;
  window.buildFidelityLessonV2=buildFidelityLesson;

  const oldStandardize=window.standardizeBaseLesson;
  window.standardizeBaseLesson=async function(base,sourceMode){
    if(/^fidelity_import_v\d+$/i.test(String(base?.source_notes||'')))return base;
    return typeof oldStandardize==='function'?oldStandardize(base,sourceMode):base;
  };
  try{standardizeBaseLesson=window.standardizeBaseLesson}catch{}

  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||'');
    const fd=init?.body instanceof FormData?init.body:null;
    if(fd){
      const mode=String(fd.get('mode')||''),kind=String(fd.get('content_kind')||'');
      if(url===PROCESS_CORE&&kind==='lesson'&&['text','pdf','images'].includes(mode)){
        try{
          const er=await beforeFidelity(EXTRACT,{method:'POST',headers:{'x-admin-pin':new Headers(init.headers||{}).get('x-admin-pin')||S.pin||''},body:fd});
          const raw=await er.text();let ej={};try{ej=raw?JSON.parse(raw):{}}catch{}
          if(!er.ok)throw new Error(ej?.error||ej?.message||`Không trích xuất được nguồn (HTTP ${er.status}).`);
          const targetTitle=String(fd.get('target_lesson_title')||'').trim();
          const lesson=await buildFidelityLesson(ej?.source_text||'',mode,targetTitle,ej?.accuracy_notes||[]);
          return new Response(JSON.stringify({lesson,fidelity_preserved:true,fidelity_version:2}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
        }catch(e){return new Response(JSON.stringify({error:e?.message||String(e)}),{status:500,headers:{'Content-Type':'application/json; charset=utf-8'}});}
      }
      if(url===AI&&mode==='text'&&String(fd.get('source_origin')||'')==='audio'){
        try{
          const transcript=String(fd.get('text')||''),targetTitle=String(fd.get('target_lesson_title')||'').trim();
          const lesson=await buildFidelityLesson(transcript,'audio',targetTitle,[]);
          return new Response(JSON.stringify({lesson,fidelity_preserved:true,fidelity_version:2,audio_direct:true}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
        }catch(e){return new Response(JSON.stringify({error:e?.message||String(e)}),{status:500,headers:{'Content-Type':'application/json; charset=utf-8'}});}
      }
    }
    return beforeFidelity(input,init);
  };
})();
