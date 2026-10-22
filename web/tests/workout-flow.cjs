// Component-handler integration: no signed-in account or real workout is modified.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=process.cwd(), React=require('react');
const oldResolve=Module._resolveFilename;
Module._resolveFilename=function(n,...a){return oldResolve.call(this,n.startsWith('@/')?path.join(root,'src',n.slice(2)):n,...a)};
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
let scheduled=0, queued=0, failQueue=false, pushed='', uploaded=[];
const client={auth:{getUser:async()=>({data:{user:{id:'test'}}})},from:table=>({insert:rows=>{if(table==='set_logs'){uploaded=rows;return Promise.resolve({error:null})}return {select:()=>({single:async()=>({data:{id:'saved-session'}})})}}})};
const oldLoad=Module._load;
Module._load=function(n,...a){
 if(n==='next/navigation')return {useRouter:()=>({push:p=>{pushed=p},refresh(){}})};
 if(n==='@/lib/supabase/client')return {createClient:()=>client};
 if(n==='@/lib/pendingSessions')return {isOfflineError:()=>false,queuePendingSession:()=>{queued++;return failQueue?null:{id:'queued'}}};
 if(n==='@/lib/restAlert')return {cancelRestAlert(){},ensureRestNotifyPermission:async()=>{},scheduleRestAlert:async()=>{scheduled++},restSecondsLeft:()=>120};
 return oldLoad.call(this,n,...a);
};
const values=new Map();global.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};global.sessionStorage=global.localStorage;
global.window={setTimeout,location:{pathname:'/train/test/session'}};global.document={getElementById:()=>({scrollIntoView(){}})};
Object.defineProperty(global,'navigator',{value:{onLine:false},configurable:true});
const states=[],refs=[];let cursor=0,refCursor=0,transition;
React.useState=initial=>{const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]};
React.useEffect=()=>{};React.useMemo=f=>f();React.useRef=v=>{const i=refCursor++;return refs[i]??(refs[i]={current:v})};React.useTransition=()=>[false,f=>{transition=f()}];
const {WorkoutLogger}=require('../src/app/(app)/train/[dayId]/WorkoutLogger');
const props={dayId:'test',dayName:'NT Upper A',exercises:[{id:'a',name:'Pec Deck',muscle:'Chest',default_sets:1,working_rep_range:'8-12',sort_order:0},{id:'b',name:'Chest Press',muscle:'Chest',default_sets:1,working_rep_range:'8-12',sort_order:1}],previousByExercise:{'Pec Deck':[{weight:100,reps:10,rir:2}]}};
const flat=x=>!x||typeof x!=='object'?[]:Array.isArray(x)?x.flatMap(flat):[x,...flat(x.props?.children)];
const txt=x=>Array.isArray(x)?x.map(txt).join(''):typeof x==='string'||typeof x==='number'?String(x):x?.props?txt(x.props.children):'';
function render(){cursor=refCursor=0;return flat(WorkoutLogger(props))}
function button(n,label){const b=n.find(x=>x.type==='button'&&txt(x)===label);assert.ok(b,label);return b}
(async()=>{
 let n=render();n.find(x=>x.type==='button'&&txt(x).startsWith('Use target')).props.onClick();n=render();assert.ok(n.some(x=>x.type==='input'&&x.props.value==='11'),'target applied');
 n.find(x=>x.props?.['aria-label']==='Mark set done').props.onClick();await new Promise(r=>setImmediate(r));assert.equal(scheduled,1,'timer scheduled');n=render();
 n.find(x=>x.props?.['aria-label']===' 2 reps left').props.onClick();n=render();assert.equal(n.find(x=>x.props?.['aria-label']===' 2 reps left').props['aria-pressed'],true);
 button(n,'Next exercise →').props.onClick();n=render();button(n,'Previous').props.onClick();n=render();assert.ok(n.some(x=>x.type==='input'&&x.props.value==='11'),'values survive navigation');
 button(n,'Next exercise →').props.onClick();n=render();button(n,'Review & finish').props.onClick();n=render();
 const confirm=n.find(x=>x.type==='button'&&x.props.onClick?.name==='finish');assert.ok(confirm);failQueue=true;confirm.props.onClick();n=render();assert.ok(n.some(x=>txt(x).includes('Could not save offline')));assert.ok(!n.some(x=>x.type?.name==='WorkoutFinishSummary'));
 failQueue=false;confirm.props.onClick();n=render();const summary=n.find(x=>x.type?.name==='WorkoutFinishSummary');assert.equal(summary.props.queued,true);assert.equal(summary.props.lifts[0].sets[0].rir,2);summary.props.onContinue();assert.equal(pushed,'/train');
 // A fresh online session keeps the recorded RIR in uploaded rows and exposes history after check-in.
 states.length=refs.length=0;navigator.onLine=true;n=render();n.find(x=>x.props?.['aria-label']==='Mark set done').props.onClick();await new Promise(r=>setImmediate(r));n=render();n.find(x=>x.props?.['aria-label']===' 2 reps left').props.onClick();n=render();button(n,'Next exercise →').props.onClick();n=render();button(n,'Review & finish').props.onClick();n=render();n.find(x=>x.type==='button'&&x.props.onClick?.name==='finish').props.onClick();await transition;n=render();assert.equal(uploaded[0].rir,2);n.find(x=>x.type?.name==='WorkoutFinishSummary').props.onContinue();n=render();button(n,'Skip').props.onClick();assert.equal(pushed,'/train/history/saved-session?fresh=1');
 states.length=refs.length=0;n=render();n.find(x=>x.props?.['aria-label']==='Swap exercise').props.onClick();n=render();n.find(x=>x.type?.name==='SwapExerciseSheet').props.onSwapHere('Cable Fly');n=render();assert.ok(n.some(x=>x.type==='h2'&&txt(x)==='Cable Fly'),'swap updates displayed exercise');assert.ok(!n.some(x=>x.type==='button'&&txt(x).startsWith('Use target')),'swap without history does not reuse old target');
 console.log('PASS: exercise swap, apply target, log set, RIR, rest scheduling, navigation, failed/successful offline finish, online upload, recap navigation');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>setTimeout(()=>process.exit(process.exitCode||0),0));
