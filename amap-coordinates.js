// Data and browser GPS remain WGS84. Only map display uses converted GCJ-02.
// https://lbs.amap.com/api/javascript-api-v2/guide/transform/convertfrom
export function createAMapConverter(AMap,{setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=15000}={}){
 if(typeof AMap?.convertFrom!=='function')throw new TypeError('Map coordinate service unavailable');
 const cache=new Map(),valid=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;
 const keyOf=p=>p.lat+':'+p.lon;
 function batch(points){
  return new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error,result)=>{if(settled)return;settled=true;clearTimer(timer);if(error)reject(error);else resolve(result);};
   const timer=setTimer(()=>finish(new Error('Map coordinate conversion timed out')),timeoutMs);
   try{
    AMap.convertFrom(points.map(p=>[p.lon,p.lat]),'gps',(status,result)=>{
     if(settled)return;
     if(status!=='complete'||result?.info!=='ok'||!Array.isArray(result.locations)||result.locations.length!==points.length){finish(new Error('Map coordinate conversion failed'));return;}
     const coordinates=result.locations.map(p=>[p?.getLng?.()??p?.lng,p?.getLat?.()??p?.lat]);
     if(!coordinates.every(([lon,lat])=>valid(lat,lon))){finish(new Error('Map coordinate conversion returned invalid coordinates'));return;}
     finish(null,coordinates);
    });
   }catch{finish(new Error('Map coordinate conversion failed'));}
  });
 }
 async function convert(points,{remember=true}={}){
  if(!Array.isArray(points)||!points.every(p=>p&&valid(p.lat,p.lon)))throw new TypeError('Invalid map coordinates');
  const requested=points.map(p=>({lat:p.lat,lon:p.lon}));
  const unique=[...new Map(requested.map(p=>[keyOf(p),p])).values()];
  const missing=unique.filter(p=>!cache.has(keyOf(p))),staged=new Map();
  for(let start=0;start<missing.length;start+=40){
   const group=missing.slice(start,start+40),converted=await batch(group);
   group.forEach((p,index)=>staged.set(keyOf(p),converted[index]));
  }
  const output=requested.map(p=>[...(staged.get(keyOf(p))||cache.get(keyOf(p)))]);
  if(remember){
   for(const [key,value] of staged)cache.set(key,value);
   while(cache.size>512)cache.delete(cache.keys().next().value);
  }
  return output;
 }
 return {convert};
}
