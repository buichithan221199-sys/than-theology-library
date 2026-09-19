// Mobile production polish for the expanded navigation.
(function(){
  const s=document.createElement('style');
  s.id='mobile-production-polish';
  s.textContent=`
    @media(max-width:650px){
      .side{
        height:calc(90px + env(safe-area-inset-bottom))!important;
        overflow:hidden!important;
        padding:7px 6px calc(7px + env(safe-area-inset-bottom))!important;
        border-top:1px solid rgba(232,198,107,.28)!important;
        box-shadow:0 -10px 28px rgba(4,16,30,.22)!important
      }
      .side .nav{
        display:flex!important;
        grid-template-columns:none!important;
        gap:6px!important;
        margin:0!important;
        padding:0 2px!important;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        scroll-snap-type:x proximity;
        scrollbar-width:none;
        -webkit-overflow-scrolling:touch
      }
      .side .nav::-webkit-scrollbar{display:none}
      .side .nav button{
        flex:0 0 78px!important;
        min-width:78px!important;
        height:72px!important;
        padding:9px 6px 7px!important;
        border-radius:13px!important;
        text-align:center!important;
        white-space:normal!important;
        font-size:23px!important;
        line-height:1!important;
        scroll-snap-align:center;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:4px!important;
        touch-action:manipulation
      }
      .side .nav button span{
        display:block!important;
        width:100%!important;
        margin:0!important;
        font-size:10px!important;
        line-height:1.08!important;
        font-weight:800!important;
        letter-spacing:0!important;
        white-space:normal!important;
        color:inherit!important
      }
      .side .nav button.on{
        background:#173b68!important;
        box-shadow:inset 0 0 0 1px rgba(232,198,107,.38)!important;
        color:#fff!important
      }
      .side .nav button.on,.side .nav button:hover{transform:none!important}
      .answer-action{
        min-height:52px!important;
        padding:12px 14px!important;
        font-size:14px!important;
        line-height:1.25!important;
        touch-action:manipulation!important;
        -webkit-tap-highlight-color:transparent
      }
      .question>.answer-action{
        width:100%!important;
        margin-top:8px!important
      }
      .quiz-action-toolbar,.pdf-action-toolbar{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:10px!important
      }
      .quiz-action-toolbar .btn,.pdf-action-toolbar .btn{
        width:100%!important;
        min-height:52px!important;
        justify-content:center!important
      }
      .content{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}
      .top{gap:8px}.top h1{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .top>.btn{flex:0 0 auto;padding:10px 11px;font-size:12px}
      #installTheologyApp{bottom:calc(104px + env(safe-area-inset-bottom))!important;right:12px!important}
    }
  `;
  document.head.appendChild(s);
})();
