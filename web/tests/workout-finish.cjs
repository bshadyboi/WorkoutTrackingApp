const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
function load(path, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    { exports, require: n => { if (!(n in mocks)) throw Error(n); return mocks[n]; }, ...globals });
  return exports;
}
const overload = load('src/lib/overload.ts');
const { summarizeLift } = load('src/lib/workoutFinish.ts', {'./overload':overload, './ntCoaching':{NT_RIR_TARGET:1}});
const base = { sets:[{weight:100,reps:12,rir:2},{weight:100,reps:12,rir:1}], previous:[{weight:100,reps:11}], best:{weight:100,reps:11}, expectedSets:2, repRange:'8-12', increment:5, nt:true };
let r = summarizeLift(base);
assert.equal(r.pr,true); assert.equal(r.improved,true); assert.match(r.next[0].label,/105/);
assert.equal(summarizeLift({...base,best:undefined}).pr,false, 'first log is not a PR');
assert.equal(summarizeLift({...base,sets:[{weight:105,reps:8,rir:2}]}).pr,false, 'different rep range is not automatically a PR');
assert.match(summarizeLift({...base,sets:[{weight:100,reps:12}]}).next[0].label,/100/,'missing RIR holds');
assert.match(summarizeLift({...base,sets:base.sets.slice(0,1)}).next[0].label,/100/,'incomplete session holds load');
assert.match(summarizeLift({...base,noLoadIncrease:true}).next[0].label,/100/,'restriction holds');
assert.equal(summarizeLift({...base,sets:[{weight:NaN,reps:10}]}).sets.length,0);
const data = new Map(); let fail = false;
const localStorage = { getItem:k=>data.get(k)??null, setItem:(k,v)=>{if(fail) throw Error('full');data.set(k,v)},removeItem:k=>data.delete(k)};
const window = {localStorage,dispatchEvent(){}};
const draft = load('src/lib/sessionDraft.ts',{}, {window,localStorage});
assert.equal(draft.saveDraft({dayId:'a'}),true);
fail=true; assert.equal(draft.saveDraft({dayId:'a'}),false); fail=false;
let reject = true, inserts = 0;
const client = { auth:{getUser:async()=>({data:{user:{id:'u'}}})},from:()=>({insert:()=>{inserts++;return {select:()=>({single:async()=>reject ? {error:{message:'rejected'}} : {data:{id:'s'}}})}}}) };
const pending=load('src/lib/pendingSessions.ts',{'@/lib/supabase/client':{createClient:()=>client}}, {window,navigator:{onLine:true},crypto:{randomUUID:()=>String(Date.now())},Event:class{}});
(async()=>{
 fail=true;assert.equal(pending.queuePendingSession({session:{},sets:[]}),null);fail=false;
 pending.queuePendingSession({session:{},sets:[]});
 await pending.flushPendingSessions();assert.equal(pending.listPendingSessions().length,1,'rejected upload retained');
 reject=false;const before=inserts;await Promise.all([pending.flushPendingSessions(),pending.flushPendingSessions()]);
 assert.equal(inserts-before,1,'parallel flush uses one upload');assert.equal(pending.listPendingSessions().length,0);
 console.log('PASS: finish comparisons, conservative targets, storage failures, retained rejected uploads, concurrent sync');
})().catch(e=>{console.error(e);process.exitCode=1});
