import {writeFileSync} from 'node:fs';
import {VARIANT,STABILITY,benchmark,convergenceStudy,stabilityStudy} from '../src/solver.js';
const problem={...VARIANT,f:(x,y)=>y+Math.exp(x),exact:VARIANT.expected};
const study=convergenceStudy(problem),metrics=[];
for(const n of [5,10,20]){
  const all=benchmark({...problem,n},220);
  for(const key of ['euler','heun','rk4']){
    const r=all[key];metrics.push({n,method:key,h:r.h,maxError:r.maxError,endError:r.endError,timeMs:r.elapsedMs});
  }
}
const stability=Object.fromEntries(Object.entries(stabilityStudy()).map(([k,v])=>[k,{q:1-20/Number(k),endpoint:v.nodes.at(-1).y,exact:STABILITY.expected(1),nodes:v.nodes}]));
const doc={variant:VARIANT.name,formula:VARIANT.fText,exact:VARIANT.exactText,metrics,ratios:study.ratios,stability,note:'Час — медіана 220 повторів на цьому середовищі, значення залежать від апаратури.'};
if(process.argv.includes('--save'))writeFileSync(new URL('../docs/analysis.json',import.meta.url),JSON.stringify(doc,null,2)+'\n','utf8');
console.log('Метод | n | max error | end error | median time ms');
for(const r of metrics)console.log(`${r.method} | ${r.n} | ${r.maxError.toExponential(5)} | ${r.endError.toExponential(5)} | ${r.timeMs.toFixed(5)}`);
console.log('ratios:',JSON.stringify(study.ratios));
console.log('stability endpoint:',Object.fromEntries(Object.entries(stability).map(([n,v])=>[n,v.endpoint])));
