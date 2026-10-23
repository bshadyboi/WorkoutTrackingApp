const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict'),React=require('react');
const resolve=Module._resolveFilename;Module._resolveFilename=function(n,...args){return resolve.call(this,n.startsWith('@/')?path.join(process.cwd(),'src',n.slice(2)):n,...args)};
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const load=Module._load;Module._load=function(n,...args){if(n==='@/lib/recentExercises')return {getRecentExercises:async()=>[]};return load.call(this,n,...args)};
const states=[];let cursor=0;React.useState=x=>{const i=cursor++;if(!(i in states))states[i]=typeof x==='function'?x():x;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]};React.useMemo=f=>f();React.useRef=x=>({current:x});React.useEffect=()=>{};
const {SwapExerciseSheet}=require('../src/components/SwapExerciseSheet');
let here='',all='';const props={currentName:'Pec Deck',muscle:'Chest',onClose(){},onSwapHere:n=>here=n,onSwapAll:n=>all=n};
const flat=x=>!x||typeof x!=='object'?[]:Array.isArray(x)?x.flatMap(flat):[x,...flat(x.props?.children)];const text=x=>Array.isArray(x)?x.map(text).join(''):typeof x==='string'||typeof x==='number'?String(x):x?.props?text(x.props.children):'';
const render=()=>{cursor=0;return flat(SwapExerciseSheet(props))};const button=(nodes,prefix)=>{const b=nodes.find(n=>n.type==='button'&&text(n).startsWith(prefix));assert.ok(b,prefix);return b};
(async()=>{
let n=render();const search=()=>n.find(x=>x.type==='input'&&x.props.placeholder==='Search exercises or equipment');
search().props.onChange({target:{value:'  My Gym Fly  '}});n=render();button(n,'+ Use custom exercise').props.onClick();n=render();button(n,'Replace with My Gym Fly').props.onClick();assert.equal(here,'My Gym Fly');
n.find(x=>x.type==='input'&&x.props.type==='radio'&&!x.props.checked).props.onChange();n=render();button(n,'Replace with My Gym Fly').props.onClick();assert.equal(all,'My Gym Fly');await Promise.resolve();n=render();
search().props.onChange({target:{value:'Pec Deck'}});n=render();assert.ok(!n.some(x=>x.type==='button'&&text(x).startsWith('+ Use custom exercise')));assert.equal(button(n,'Choose a replacement').props.disabled,true);
search().props.onChange({target:{value:'   '}});n=render();assert.ok(!n.some(x=>x.type==='button'&&text(x).startsWith('+ Use custom exercise')));
console.log('PASS: inline custom selection, trimmed name, session/plan callbacks, current-exercise duplicate prevention, blank input, stale selection reset');

})().catch(e=>{console.error(e);process.exitCode=1});
