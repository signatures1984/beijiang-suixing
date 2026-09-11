import {createSpeaker,nearbyNarration} from './voice.js';
export function mountVoice(data,areas,requestLocation) {
  const toggle=document.getElementById('auto-voice'),status=document.getElementById('voice-status'),dock=document.getElementById('voice-dock');
  const played=new Set();let enabled=false,lastAutoAt=-Infinity,latestPosition=null;
  function showStatus(message){status.textContent=message;document.getElementById('dock-status').textContent=message;document.getElementById('dialog-voice-status').textContent=message;}
  function updateControls(){toggle.textContent=enabled?'到点播报已开启':'开启到点播报';toggle.setAttribute('aria-pressed',String(enabled));dock.hidden=!enabled&&!speaker.busy;}
  const speaker=createSpeaker({synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,onStatus:showStatus,onBusy:()=>updateControls(),onFailure:()=>{enabled=false;updateControls();}});
  function stop(message='已停止播报，自动播报已关闭'){enabled=false;speaker.stop(message);updateControls();}
  document.querySelectorAll('[data-stop-voice]').forEach(b=>b.onclick=()=>stop());
  function read(point,full=true){
    enabled=false;updateControls();
    speaker.speak([point.name,point.summary,full?point.body:'',...(full?(point.details||[]).map(s=>s.title+'。'+s.text):[]),full?point.tip:''].filter(Boolean).join('。'),point.name);
  }
  toggle.onclick=()=>{
    if(enabled){stop();return;}
    if(!speaker.supported){showStatus('此浏览器不支持语音，请直接阅读介绍');return;}
    if(!navigator.geolocation||!window.isSecureContext){showStatus('请用 HTTPS 网页打开，并允许定位');return;}
    if(!areas){showStatus('到点范围未能加载，请刷新页面；仍可手动听介绍');return;}
    enabled=true;updateControls();
    // A user gesture starts speech before asynchronous location permission completes.
    speaker.speak('到点播报已开启。请允许定位，并保持网页在前台。','到点播报',()=>{if(enabled){showStatus('等待靠近景点 · 每处本次打开只自动播报一次');if(latestPosition)onPosition(latestPosition);}});
    requestLocation();
  };
  function onPosition(position){
    latestPosition=position;
    if(!enabled||speaker.busy||document.hidden||Date.now()-lastAutoAt<90000)return;
    if(position.accuracy>200){showStatus('定位精度较低，正在等待更准确的位置');return;}
    const point=nearbyNarration(data,areas,position,played);
    if(!point)return;
    lastAutoAt=Date.now();
    const started=speaker.speak([point.name,point.summary,point.body,...(point.details||[]).map(s=>s.text),point.tip].filter(Boolean).join('。'),point.name,()=>{if(enabled)showStatus('播报完毕 · 继续靠近下一处景点');});
    if(started)played.add(point.id);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(enabled||speaker.busy))stop('离开页面，播报已停止；返回后可重新开启');});
  window.addEventListener('pagehide',()=>stop(''));
  updateControls();return {read,onPosition,locationError:()=>{if(enabled)stop('定位不可用，自动播报已关闭；仍可手动听介绍');}};
}
