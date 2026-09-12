import {nearbyNarration} from './voice.js';
import {createNarrator} from './narrator.js';
import {narrationText} from './media.js';
export function mountVoice(data,areas,requestLocation) {
  const toggle=document.getElementById('auto-voice'),status=document.getElementById('voice-status'),dock=document.getElementById('voice-dock');
  const played=new Set();let enabled=false,lastAutoAt=-Infinity,latestPosition=null;
  function showStatus(message){status.textContent=message;document.getElementById('dock-status').textContent=message;document.getElementById('dialog-voice-status').textContent=message;}
  function updateControls(){toggle.textContent=enabled?'到点播报已开启':'开启到点播报';toggle.setAttribute('aria-pressed',String(enabled));dock.hidden=!enabled&&!speaker.busy;}
  const speaker=createNarrator({synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,onStatus:showStatus,onBusy:()=>updateControls(),onFailure:()=>{enabled=false;updateControls();}});
  function stop(message='已停止播报，自动播报已关闭'){enabled=false;speaker.stop(message);updateControls();}
  document.querySelectorAll('[data-stop-voice]').forEach(b=>b.onclick=()=>stop());
  function read(point,full=true){
    enabled=false;updateControls();
    speaker.speak(narrationText(point,full),point.name,()=>{},point.audio?.src,full?null:point.audio?.shortEnd);
  }
  document.getElementById('voice-mode').onchange=e=>{stop('已切换声音');speaker.setMode(e.target.value);};
  document.getElementById('preview-voice').onclick=()=>{enabled=false;speaker.speak('你好，这一路就由我陪你看看北疆。山水里的故事、当地人的生活，还有值得尝尝的味道，咱们路上慢慢聊。','声音试听',()=>{},'audio/welcome.mp3');};
  toggle.onclick=()=>{
    if(enabled){stop();return;}
    if(!speaker.supported){showStatus('此浏览器不支持语音，请直接阅读介绍');return;}
    if(!navigator.geolocation||!window.isSecureContext){showStatus('请用 HTTPS 网页打开，并允许定位');return;}
    if(!areas){showStatus('到点范围未能加载，请刷新页面；仍可手动听介绍');return;}
    enabled=true;updateControls();
    // A user gesture starts speech before asynchronous location permission completes.
    speaker.speak('到点播报已经开启。靠近景点时，我会为你讲一段这里的故事。记得允许定位，并让网页保持打开。','到点播报',()=>{if(enabled){showStatus('等待靠近景点 · 每处本次打开只自动播报一次');if(latestPosition)onPosition(latestPosition);}},'audio/enabled.mp3');
    requestLocation();
  };
  function onPosition(position){
    latestPosition=position;
    if(!enabled||speaker.busy||document.hidden||Date.now()-lastAutoAt<90000)return;
    if(position.accuracy>200){showStatus('定位精度较低，正在等待更准确的位置');return;}
    const point=nearbyNarration(data,areas,position,played);
    if(!point)return;
    lastAutoAt=Date.now();
    speaker.speak(narrationText(point,true),point.name,()=>{played.add(point.id);if(enabled)showStatus('播报完毕 · 继续靠近下一处景点');},point.audio?.src);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(enabled||speaker.busy))stop('离开页面，播报已停止；返回后可重新开启');});
  window.addEventListener('pagehide',()=>stop(''));
  updateControls();return {read,onPosition,locationError:()=>{if(enabled)stop('定位不可用，自动播报已关闭；仍可手动听介绍');}};
}
