import { copyFile, lstat, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { ArtifactReference, RunReport } from "./run-report-contract";
import type { LocalRedactor } from "./run-report-redaction";
import { validate_run_site } from "./run-report-validator";
const allowed = new Set(["text/plain", "application/json", "image/png", "image/jpeg", "image/webp"]);
const safe_name = (id: string) => `${id.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"item"}-${createHash("sha256").update(id).digest("hex").slice(0,12)}`;
const json=(v:unknown)=>JSON.stringify(v,null,2)+"\n"; const safe=(p:string)=>p.length>0&&!p.startsWith("/")&&!p.split("/").includes("..");
export async function materialize_run_site(runDir:string,report:RunReport,redactor:LocalRedactor):Promise<void>{
 const site=join(runDir,"site"),categories=join(site,"categories"),suitesDir=join(site,"suites"),casesDir=join(site,"cases"),artifactsDir=join(site,"artifacts");await Promise.all([mkdir(categories,{recursive:true}),mkdir(suitesDir,{recursive:true}),mkdir(casesDir,{recursive:true}),mkdir(artifactsDir,{recursive:true})]);
 const used=new Set<string>();const claim=(name:string)=>{if(used.has(name))throw new Error(`MATERIALIZATION_COLLISION:${name}`);used.add(name);return name};let publicBytes=0,publicCount=0;const perCase=new Map<string,number>();
 const admit=async(a:ArtifactReference,owner:string):Promise<ArtifactReference|undefined>=>{if(!allowed.has(a.mediaType)||!safe(a.path))return;const source=resolve(runDir,a.path);if(!source.startsWith(resolve(runDir)+"/"))return;const stat=await lstat(source);const limit=a.mediaType==="text/plain"?256*1024:2*1024*1024,ownerCount=perCase.get(owner)??0;if(stat.isSymbolicLink()||!stat.isFile()||stat.size>limit||publicBytes+stat.size>32*1024*1024||publicCount>=32||ownerCount>=8)return;const path=claim(`artifacts/${safe_name(`${owner}:${a.name}`)}`);await copyFile(source,join(site,path));publicBytes+=stat.size;publicCount++;perCase.set(owner,ownerCount+1);return {...a,name:redactor.text(a.name,1024).value,path,bytes:stat.size}};
 const cats=new Map<string,{id:string;suites:string[];file:string}>(),suiteRefs:{id:string;file:string}[]=[];
 for(const suite of report.suites){const cat=cats.get(suite.category)??{id:suite.category,suites:[],file:claim(`categories/${safe_name(suite.category)}.json`)};cat.suites.push(suite.id);cats.set(suite.category,cat);const suiteFile=claim(`suites/${safe_name(suite.id)}.json`),caseRefs:{id:string;file:string}[]=[];
  for(const c of suite.cases){const file=claim(`cases/${safe_name(`${suite.id}:${c.id}`)}.json`);caseRefs.push({id:c.id,file});const artifacts=(await Promise.all(c.artifacts.map(a=>admit(a,`${suite.id}:${c.id}`)))).filter((a):a is ArtifactReference=>a!==undefined);const diagnostics=c.diagnostics.map(d=>({...d,message:redactor.text(d.message).value,...(d.stack?{stack:redactor.text(d.stack,32*1024).value}:{}),...(d.expected?{expected:redactor.text(d.expected,32*1024).value}:{}),...(d.actual?{actual:redactor.text(d.actual,32*1024).value}:{})}));await writeFile(join(site,file),json({...c,diagnostics,artifacts}));}
  await writeFile(join(site,suiteFile),json({...suite,cases:caseRefs,artifacts:(await Promise.all(suite.artifacts.map(a=>admit(a,suite.id)))).filter(Boolean)}));suiteRefs.push({id:suite.id,file:suiteFile});}
 for(const c of cats.values())await writeFile(join(site,c.file),json(c));await writeFile(join(site,"index.json"),json({id:report.id,status:report.status,totals:report.totals,categories:[...cats.values()].map(c=>({id:c.id,file:c.file})),suites:suiteRefs}));await validate_run_site(runDir);
}
