import {createSpeaker} from './voice.js';
export function createNarrator({synthesis,Utterance,AudioClass=globalThis.Audio,onStatus=()=>{},onBusy=()=>{},onFailure=()=>{}}){
  let generation=0,audioBusy=false,timer,mode='natural';
  const audio=AudioClass?new AudioClass():null;
  if(audio)audio.preload='none';
  const system=createSpeaker({synthesis,Utterance,onStatus,onBusy,onFailure});
  function stop(message='已停止播报'){
    generation++;clearTimeout(timer);audioBusy=false;
    if(audio){audio.onended=null;audio.onerror=null;audio.onplaying=null;audio.ontimeupdate=null;audio.pause();audio.removeAttribute('src');audio.load();}
    system.stop('');onBusy(false);if(message)onStatus(message);
  }
  function speak(text,title,onComplete=()=>{},source=null,endAt=null){
    stop('');
    if(mode==='system'||!source||!audio)return system.speak(text,title,onComplete);
    const token=generation;audioBusy=true;onBusy(true);onStatus('正在准备自然女声 · '+title);
    let completed=false;
    function finish(){if(token!==generation||completed)return;completed=true;clearTimeout(timer);audio.pause();audioBusy=false;onBusy(false);onStatus('播报完毕 · '+title);onComplete();}
    function fail(){if(token!==generation||completed)return;stop('语音暂时无法播放，请重试或选择手机中文声音');onFailure();}
    audio.onplaying=()=>{if(token===generation){clearTimeout(timer);onStatus('正在播报 · '+title+' · AI 自然女声');}};
    audio.onended=finish;audio.onerror=fail;
    if(Number.isFinite(endAt)&&endAt>0)audio.ontimeupdate=()=>{if(audio.currentTime>=endAt)finish();};
    audio.src=source;timer=setTimeout(fail,20000);
    try{Promise.resolve(audio.play()).catch(fail);}catch{fail();return false;}
    return true;
  }
  return {speak,stop,setMode(value){stop('');mode=value==='system'?'system':'natural';},get supported(){return !!audio||system.supported;},get busy(){return audioBusy||system.busy;}};
}
