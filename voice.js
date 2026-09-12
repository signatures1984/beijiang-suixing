import {distanceKm} from './model.js';

export function speechChunks(text, limit=100) {
  const sentences=String(text).match(/[^。！？；\n]+[。！？；\n]?/g)||[];
  return sentences.flatMap(s=>{const chars=Array.from(s.trim()),parts=[];for(let i=0;i<chars.length;i+=limit)parts.push(chars.slice(i,i+limit).join(''));return parts;}).filter(Boolean);
}
// Distance to each recorded shoreline/area outline; lakes need shoreline triggers, not a centre point.
export function distanceToLine(position, line) {
  if(!line?.length)return Infinity;
  if(line.length===1)return distanceKm(position,{lat:line[0][0],lon:line[0][1]})*1000;
  const scaleX=111320*Math.cos(position.lat*Math.PI/180),scaleY=111320;
  let best=Infinity;
  for(let i=1;i<line.length;i++) {
    const ax=(line[i-1][1]-position.lon)*scaleX,ay=(line[i-1][0]-position.lat)*scaleY;
    const bx=(line[i][1]-position.lon)*scaleX,by=(line[i][0]-position.lat)*scaleY;
    const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
    best=Math.min(best,Math.hypot(ax+t*dx,ay+t*dy));
  }
  return best;
}
export function insideRing(position, ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [yi,xi]=ring[i],[yj,xj]=ring[j];
    if(((yi>position.lat)!==(yj>position.lat)) && position.lon<(xj-xi)*(position.lat-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
export function nearbyNarration(data, areas, position, played, now=Date.now()) {
  if(!position||!Number.isFinite(position.accuracy)||position.accuracy>200||position.accuracy<0||!Number.isFinite(position.timestamp)||Math.abs(now-position.timestamp)>30000)return null;
  return data.points.filter(p=>p.category==='scenery'&&!played.has(p.id)).map(p=>{
    const area=areas?.[p.id];
    let meters=area?Math.min(...area.lines.map(line=>distanceToLine(position,line))):distanceKm(position,p.location||data.anchors[p.anchor])*1000;
    if(area?.filled&&area.lines.some(line=>insideRing(position,line)))meters=0;
    return {point:p,meters,radius:area?.radius||500};
  }).filter(c=>c.meters+position.accuracy<=c.radius).sort((a,b)=>a.meters-b.meters)[0]?.point||null;
}
export function createSpeaker({synthesis,Utterance,onStatus=()=>{},onBusy=()=>{},onFailure=()=>{}}) {
  let generation=0,current=null,busy=false,startTimer;
  const supported=!!(synthesis&&Utterance);
  function stop(message='已停止播报') {generation++;clearTimeout(startTimer);current=null;busy=false;synthesis?.cancel();onBusy(false);if(message)onStatus(message);}
  function speak(text,title,onComplete=()=>{}) {
    stop('');
    if(!supported){onStatus('此浏览器不支持语音，请直接阅读介绍');onFailure();return false;}
    const chunks=speechChunks(text),token=generation;
    if(!chunks.length)return false;
    busy=true;onBusy(true);onStatus('准备播报 · '+title);
    function next() {
      if(token!==generation)return;
      const part=chunks.shift();
      if(!part){current=null;busy=false;onBusy(false);onStatus('播报完毕 · '+title);onComplete();return;}
      current=new Utterance(part);current.lang='zh-CN';current.rate=.95;
      const voices=synthesis.getVoices();const chinese=voices.find(v=>/^zh[-_]CN/i.test(v.lang))||voices.find(v=>/^zh/i.test(v.lang));
      if(chinese)current.voice=chinese;
      current.onstart=()=>{if(token===generation){clearTimeout(startTimer);onStatus('正在播报 · '+title);}};
      current.onend=()=>{if(token===generation){clearTimeout(startTimer);next();}};
      current.onerror=()=>{if(token===generation){stop('语音未能播放，请检查手机中文语音设置后重试');onFailure();}};
      startTimer=setTimeout(()=>{if(token===generation){stop('语音未能启动，请检查手机中文语音设置后重试');onFailure();}},10000);
      try{synthesis.speak(current);}catch{stop('语音未能播放，请换用支持中文语音的浏览器');onFailure();}
    }
    next();return true;
  }
  return {speak,stop,supported,get busy(){return busy;}};
}
