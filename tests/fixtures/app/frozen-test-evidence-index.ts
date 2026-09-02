export const FROZEN_TEST_EVIDENCE_RUN_ID = "123e4567-e89b-42d3-a456-426614174000";
export const FROZEN_TEST_EVIDENCE_ROOT = `/test-evidence/${FROZEN_TEST_EVIDENCE_RUN_ID}`;
const startedAt="2026-09-02T12:00:00.000Z",endedAt="2026-09-02T12:00:01.000Z";
const timing=(durationMs:number)=>({startedAt,endedAt,durationMs});
const empty=():Record<string,number>=>({pass:0,fail:0,skip:0,unsupported:0,cancelled:0,error:0,cases:0,suites:0});
const file=(folder:string,id:string)=>`${folder}/${id.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.json`;
const caseSpec=(id:string,title:string,status:string,diagnostics:any[]=[],artifacts:any[]=[])=>({id,title,status,...timing(4),diagnostics,artifacts});
export function frozen_test_evidence_package_fixture(){
 const artifacts=new Map<string,string>();
 const specs=[
  {id:"transform/direct-report",title:"Direct report client",category:"transform",status:"fail",cases:[caseSpec("loads-index","loads index","pass"),caseSpec("assertion-failure","reports assertion failure","fail",[{kind:"assertion",message:"expected direct report",expected:"pass",actual:"fail",truncated:false}])]},
  {id:"unit/skipped",title:"Skipped environment",category:"unit",status:"skip",cases:[caseSpec("not-selected","not selected","skip")]},
  {id:"livehost/unsupported-runtime",title:"Unsupported runtime",category:"livehost",status:"unsupported",cases:[caseSpec("runtime","runtime unavailable","unsupported",[{kind:"environment",message:"runtime is unsupported",truncated:false}])]},
  {id:"browser/cancelled-navigation",title:"Cancelled navigation",category:"browser",status:"cancelled",cases:[caseSpec("cancelled","cancelled case","cancelled",[{kind:"cancellation",message:"run cancelled by operator",truncated:false}])]},
  {id:"infrastructure/worker",title:"Infrastructure worker",category:"infrastructure",status:"error",cases:[caseSpec("startup","worker startup","error",[{kind:"infrastructure",message:"worker failed to start",truncated:false},{kind:"artifact",message:"private attachment omitted by publication boundary",truncated:false},{kind:"stderr",message:"bounded diagnostic…",truncated:true}],[{name:"public log",mediaType:"text/plain",path:"artifacts/public-log.txt",bytes:12,truncated:false}])]},
 ];
 const add=(target:Record<string,number>,key:string,value=1)=>{target[key]=(target[key]??0)+value;};
 const categoryMap=new Map<string,any[]>();
 for(const suite of specs){const caseRefs=suite.cases.map(testCase=>{const caseFile=file("cases",`${suite.id}-${testCase.id}`);artifacts.set(caseFile,JSON.stringify(testCase));return {id:testCase.id,title:testCase.title,status:testCase.status,...timing(testCase.durationMs),file:caseFile};});const totals=empty();for(const item of suite.cases){add(totals,item.status);add(totals,"cases");}const suiteFile=file("suites",suite.id);artifacts.set(suiteFile,JSON.stringify({...suite,...timing(10),totals,diagnostics:suite.status==="error"?[{kind:"infrastructure",message:"suite infrastructure error",truncated:false}]:[],artifacts:[],cases:caseRefs}));const summary={id:suite.id,title:suite.title,category:suite.category,status:suite.status,...timing(10),totals,file:suiteFile};categoryMap.set(suite.category,[...(categoryMap.get(suite.category)??[]),summary]);}
 const categories=[] as any[];const overall=empty();for(const [id,suites] of categoryMap){const totals=empty();for(const suite of suites)for(const key of Object.keys(totals))add(totals,key,suite.totals[key]??0);totals.suites=suites.length;const categoryFile=file("categories",id);artifacts.set(categoryFile,JSON.stringify({id,suites}));categories.push({id,file:categoryFile,status:suites[0].status,totals});for(const key of Object.keys(overall))add(overall,key,totals[key]??0);}
 artifacts.set("artifacts/public-log.txt","public log\n");
 const index={runId:FROZEN_TEST_EVIDENCE_RUN_ID,status:"error",...timing(1000),repositories:[{name:"hson-demo2",revision:"4f9e7b26ade102e43aa2c14505bd74afdc19130b",dirty:true},{name:"hson-live",revision:null,dirty:null}],totals:overall,diagnostics:[{kind:"infrastructure",message:"run completed with infrastructure error",truncated:false}],artifacts:[],categories,suites:specs.map(suite=>({id:suite.id,file:file("suites",suite.id)}))};
 return {index,artifacts,suites:[...categoryMap.values()].flat()};
}
