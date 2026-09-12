export const weatherPlaces = [
  ['urumqi'], ['tianchi','altay'], ['altay','hemu'], ['hemu','kanas','urho'],
  ['devil','sayram'], ['sayram','dushanzi','kuitun'], ['canyon','kenswat','urumqi'], ['urumqi']
];
export function beijingDate(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');
}
export function forecastDates(count,now=new Date()) {
  if(![3,7,14].includes(Number(count)))return [];
  const start=Date.parse(beijingDate(now)+'T00:00:00Z');
  return Array.from({length:Number(count)},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
}
export function forecastUrl(data, now = new Date()) {
  const ids = [...new Set(weatherPlaces.flat())];
  const past = Math.max(0, Math.min(92, Math.floor((Date.parse(beijingDate(now))-Date.parse(data.startDate))/86400000)));
  const params = new URLSearchParams({latitude:ids.map(k=>data.anchors[k].lat).join(','),longitude:ids.map(k=>data.anchors[k].lon).join(','),daily:'temperature_2m_max,temperature_2m_min,weather_code',timezone:'Asia/Shanghai',forecast_days:'16',past_days:String(past)});
  return {ids, url:'https://api.open-meteo.com/v1/forecast?'+params};
}
export function normalizeForecast(raw, ids) {
  const entries = Array.isArray(raw)?raw:[raw];
  if(entries.length!==ids.length) throw Error('天气地点数量不匹配');
  const locations = {};
  entries.forEach((entry,n)=>{
    if(!Array.isArray(entry.daily?.time)) throw Error('天气数据不完整');
    locations[ids[n]] = Object.fromEntries(entry.daily.time.map((date,i)=>[date,{
      low:validTemp(entry.daily.temperature_2m_min?.[i]),high:validTemp(entry.daily.temperature_2m_max?.[i]),
      code:Number.isFinite(entry.daily.weather_code?.[i])?entry.daily.weather_code[i]:null
    }]));
  });
  return locations;
}
function validTemp(t) { return Number.isFinite(t)?t:null; }
export function temperatureText(day) {
  const format=t=>Number.isFinite(t)?Math.round(t)+'°':'—';
  return format(day?.low)+' / '+format(day?.high);
}
export function weatherText(code) {
  if(code===0)return '晴'; if([1,2].includes(code))return '晴间多云'; if(code===3)return '阴';
  if([45,48].includes(code))return '雾'; if([51,53,55,56,57].includes(code))return '毛毛雨';
  if([61,63,65,66,67,80,81,82].includes(code))return '有雨'; if([71,73,75,77,85,86].includes(code))return '有雪';
  if([95,96,99].includes(code))return '雷雨'; return '天气暂缺';
}
export async function fetchForecast(data, {fetcher=fetch, now=new Date()}={}) {
  const {ids,url}=forecastUrl(data,now);
  const response=await fetcher(url,{signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw Error('天气服务暂不可用');
  return {updatedAt:Date.now(),locations:normalizeForecast(await response.json(),ids)};
}
export function validCache(cache) {
  return cache && Number.isFinite(cache.updatedAt) && cache.updatedAt<=Date.now()+60000 && cache.locations && typeof cache.locations==='object';
}
