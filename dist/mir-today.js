(function(root){
  'use strict';
  const dayKey=(value=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
  const cache=new Map();
  const cities=new Map();
  function locationKey(job){
    if(job?.latitude==null||job?.longitude==null||job.latitude===''||job.longitude==='')return null;
    const lat=Number(job.latitude),lon=Number(job.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    // Weather needs an area, never the employee's GPS or the exact job address.
    return {latitude:lat.toFixed(1),longitude:lon.toFixed(1)};
  }
  function weatherLabel(code){
    if(code===0)return 'Ciel dégagé';if([1,2,3].includes(code))return 'Ciel variable';
    if([45,48].includes(code))return 'Brouillard';if([51,53,55,56,57].includes(code))return 'Bruine';
    if([61,63,65,66,67,80,81,82].includes(code))return 'Pluie';
    if([71,73,75,77,85,86].includes(code))return 'Neige';if([95,96,99].includes(code))return 'Orages';return 'Conditions du jour';
  }
  function weather(job,onChange,options={}){
    const now=options.now||new Date(),day=dayKey(now),area=locationKey(job);
    if(job?.weather?.summary&&job.weather.date===day)return {status:'ready',label:job.weather.summary};
    const city=typeof job?.city==='string'?job.city.trim():'';
    if(!area&&!city)return {status:'unavailable',label:'Météo indisponible',reason:'Aucune ville ou zone météo n’est renseignée pour ce chantier.'};
    const key=day+':'+(area?area.latitude+':'+area.longitude:'city:'+city.toLocaleLowerCase('fr-CA')),old=cache.get(key);
    if(old&&Date.now()-old.fetchedAt<900000){if(old.status==='loading'&&onChange)old.listeners.add(onChange);return old;}
    const entry={status:'loading',label:'Météo en cours…',fetchedAt:Date.now(),listeners:new Set(onChange?[onChange]:[])};cache.set(key,entry);
    const fetcher=options.fetch||root.fetch.bind(root);
    const request=url=>fetcher(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(5000)});
    Promise.resolve().then(async()=>{
      let region=area||cities.get(city);
      if(!region){
        const response=await request('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:city,count:'10',language:'fr',countryCode:'CA'}));
        if(!response.ok)throw Error('city');const data=await response.json();
        const matches=(data.results||[]).filter(r=>r.country_code==='CA'&&String(r.name).localeCompare(city,'fr',{sensitivity:'base'})===0);
        if(matches.length!==1)throw Error('ambiguous-city');region=locationKey(matches[0]);if(!region)throw Error('city');cities.set(city,region);
      }
      const params=new URLSearchParams({...region,current:'temperature_2m,weather_code',timezone:'America/Toronto',forecast_days:'1'});
      return request('https://api.open-meteo.com/v1/forecast?'+params);
    }).then(async response=>{
      if(!response.ok)throw Error('weather');const data=await response.json(),current=data.current;
      if(!current||!String(current.time).startsWith(day)||!Number.isFinite(current.temperature_2m))throw Error('weather');
      Object.assign(entry,{status:'ready',label:Math.round(current.temperature_2m)+' °C · '+weatherLabel(current.weather_code)});
    }).catch(error=>Object.assign(entry,{status:'unavailable',label:'Météo indisponible',reason:error?.message==='ambiguous-city'?'La ville correspond à plusieurs lieux. Le bureau doit préciser la zone.':root.navigator?.onLine===false?'Hors ligne : la météo ne peut pas être actualisée.':'Le service météo n’a pas répondu avec des données du jour.'})).finally(()=>{for(const listener of entry.listeners)listener(entry);entry.listeners.clear();});
    return entry;
  }
  function personalNotices(operations){return (operations?.notifications||[]).filter(n=>!n.read_at&&!n.readAt).slice(0,3);}
  function notificationTarget(notice,role,jobIds){
    const route=notice?.route||{},jid=route.jobId;
    if(jid)return jobIds.includes(jid)?{jobId:jid}:null;
    const allowed=role==='chef_equipe'?['lead-day','lead-job','lead-team','lead-more','punch-hours']:['day','plans','photos','account','material','messages','orders','punch-hours'];
    return allowed.includes(route.view)?{view:route.view}:null;
  }
  const api={dayKey,locationKey,weatherLabel,weather,personalNotices,notificationTarget};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRToday=Object.freeze(api);
})(globalThis);
