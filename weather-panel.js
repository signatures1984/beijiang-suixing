import {weatherPlaces,beijingDate,temperatureText,weatherText,fetchForecast,validCache} from './weather.js';
const CACHE_KEY='beijiang-weather-v1';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountWeather(data) {
  const grid=document.getElementById('weather-days'),status=document.getElementById('weather-status'),button=document.getElementById('refresh-weather');
  let forecast=null,busy=false,failed=false,selectedDay=0;
  try{const saved=JSON.parse(localStorage.getItem(CACHE_KEY));if(validCache(saved))forecast=saved;}catch{}
  function render(day=selectedDay) {
    selectedDay=day;
    const today=beijingDate(),stamp=forecast?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(forecast.updatedAt)):'';
    const stale=forecast&&Date.now()-forecast.updatedAt>3600000;
    status.textContent=busy?'正在同步沿途气温…':forecast?(failed?'更新失败，显示上次数据 · ':stale?'上次数据 · ':'已同步 · ')+stamp+'（北京时间）':failed?'天气暂时无法获取，请稍后点刷新重试。':'等待同步天气';
    button.disabled=busy;
    grid.innerHTML=data.days.filter(d=>!day||d.day===day).map(d=>'<article class="weather-day"><h3>D'+d.day+' · '+d.date.slice(5).replace('-','月')+'日</h3>'+weatherPlaces[d.day-1].map(id=>{
      const reading=forecast?.locations[id]?.[d.date],complete=Number.isFinite(reading?.low)&&Number.isFinite(reading?.high);
      const past=d.date<today;
      const label=complete?(past?'过去日期 · 模型数据':weatherText(reading.code)):(past?'过去日期暂无数据':Date.parse(d.date)-Date.parse(today)>15*86400000?'尚未进入预报范围':'预报暂缺');
      return '<div class="weather-location"><span>'+escape(data.anchors[id].name)+(d.day===6&&id!=='sayram'?'<small>住宿备选</small>':'')+'</span><span class="temperature">'+temperatureText(reading)+'<small>'+label+'</small></span></div>';
    }).join('')+'</article>').join('');
  }
  async function refresh(){
    if(busy)return;busy=true;failed=false;render();
    try{forecast=await fetchForecast(data);try{localStorage.setItem(CACHE_KEY,JSON.stringify(forecast));}catch{}}
    catch{failed=true;}finally{busy=false;render();}
  }
  button.onclick=refresh;
  const interval=setInterval(()=>{if(!document.hidden&&(!forecast||Date.now()-forecast.updatedAt>3600000))refresh();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(!forecast||Date.now()-forecast.updatedAt>3600000))refresh();});
  window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
  render();refresh();return {render};
}
