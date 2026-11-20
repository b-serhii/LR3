import {writeFileSync} from 'node:fs';
import {VARIANT,STABILITY,solveAll,stabilityStudy,lotkaVolterra} from '../src/solver.js';
const p={...VARIANT,f:(x,y)=>y+Math.exp(x),exact:VARIANT.expected};
const samples={};for(const n of [5,10,20])samples[n]=solveAll({...p,n});
writeFileSync(new URL('../docs/samples.json',import.meta.url),JSON.stringify({samples,stability:stabilityStudy(),phase:lotkaVolterra()},null,2)+'\n');
