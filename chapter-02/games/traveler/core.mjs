export const STORAGE_KEY = 'traveler-lab-session-v2';
export const PAGE_SIZE = 5;
export function freshState(lang='zh',now=Date.now()) {return {schema:2,lang,step:1,startedAt:now,noticeAccepted:false,permissionOpen:false,permissions:{answers:false,likes:false,friends:false},consentMs:0,answers:{},quizPage:0,events:[],instrumentId:null}}
const valid=(value,instrument)=>Number.isInteger(value)&&value>=instrument.min&&value<=instrument.max;
export function restoreState(raw,instrument,now=Date.now()) {
 try {const saved=JSON.parse(raw),s=freshState(saved?.lang==='en'?'en':'zh',now);if(saved.schema!==2||saved.instrumentId!==instrument.id)return s;
 s.startedAt=Number.isFinite(saved.startedAt)&&saved.startedAt<=now?saved.startedAt:now;s.noticeAccepted=saved.noticeAccepted===true;
 for(const key of Object.keys(s.permissions))s.permissions[key]=saved.permissions?.[key]===true;
 s.consentMs=Number.isFinite(saved.consentMs)&&saved.consentMs>=0?saved.consentMs:0;
 s.events=Array.isArray(saved.events)?saved.events.filter(e=>e&&typeof e.type==='string'&&Number.isFinite(e.ms)&&e.ms>=0).slice(-600):[];
 for(const q of instrument.items)if(valid(saved.answers?.[q.id],instrument))s.answers[q.id]=saved.answers[q.id];
 s.quizPage=Number.isInteger(saved.quizPage)?Math.max(0,Math.min(Math.ceil(instrument.items.length/PAGE_SIZE)-1,saved.quizPage)):0;
 s.instrumentId=instrument.id;s.step=Number.isInteger(saved.step)&&saved.step>=1&&saved.step<=5?saved.step:1;
 if(s.step>3&&!isComplete(s.answers,instrument))s.step=3;if(!s.noticeAccepted)s.step=1;
 s.permissionOpen=s.step===2&&saved.permissionOpen===true;return s;
 }catch{return freshState('zh',now)}
}
export function isComplete(answers,instrument){return instrument.verified===true&&instrument.items.length>0&&instrument.items.every(q=>valid(answers[q.id],instrument))}
export function scoreInstrument(answers,instrument){if(!isComplete(answers,instrument))throw new Error('INCOMPLETE');return Object.fromEntries(instrument.domains.map(d=>{const qs=instrument.items.filter(q=>q.domain===d.id);if(qs.length!==d.itemCount)throw new Error('INVALID_KEY');const sum=qs.reduce((n,q)=>n+(q.reverse?instrument.min+instrument.max-answers[q.id]:answers[q.id]),0);return [d.id,{sum,mean:sum/qs.length,count:qs.length}]}))}
export function pageComplete(answers,instrument,page){const qs=instrument.items.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);return qs.length>0&&qs.every(q=>valid(answers[q.id],instrument))}
export function event(s,type,detail={},now=Date.now()){s.events.push({type,ms:Math.max(0,now-s.startedAt),...detail});s.events=s.events.slice(-600)}
