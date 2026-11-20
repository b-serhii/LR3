/**
 * Веблабораторія ОДУ №3, варіант №1. Чисте математичне ядро (ES-модулі).
 * Strategy: кожний чисельний метод має незалежну реалізацію step(f,x,y,h).
 * Додати метод = створити Strategy і зареєструвати в strategies; UI не змінюється.
 */
export const EPS=1e-14;
export const VARIANT={name:'Варіант № 1',fText:'y + exp(x)',exactText:'(x + 1) * exp(x)',x0:0,y0:1,xEnd:1,expected(x){return (x+1)*Math.exp(x)}};
export const STABILITY={name:'Тест стійкості',fText:'-20*y',exactText:'exp(-20*x)',x0:0,y0:1,xEnd:1,expected(x){return Math.exp(-20*x)}};

export class EulerStrategy {
  id='euler';name='Ейлер';order=1;
  step(f,x,y,h){const k1=f(x,y);return {next:y+h*k1,stage:{k1}};}
}
export class HeunStrategy {
  id='heun';name='Хойн';order=2;
  step(f,x,y,h){const k1=f(x,y), k2=f(x+h,y+h*k1);return {next:y+h*(k1+k2)/2,stage:{k1,k2}};}
}
export class RK4Strategy {
  id='rk4';name='Рунге–Кутта IV';order=4;
  step(f,x,y,h){
    const k1=f(x,y);
    const k2=f(x+h/2,y+h*k1/2);
    const k3=f(x+h/2,y+h*k2/2);
    const k4=f(x+h,y+h*k3);
    return {next:y+h*(k1+2*k2+2*k3+k4)/6,stage:{k1,k2,k3,k4}};
  }
}
/** Методи реєструються через спільний протокол, а не if/else усередині solve. */
export const strategies={euler:new EulerStrategy(),heun:new HeunStrategy(),rk4:new RK4Strategy()};
export const methodNames=Object.fromEntries(Object.entries(strategies).map(([id,s])=>[id,s.name]));
export function validateProblem({f,exact,x0,y0,xEnd,n}){
  if(typeof f!=='function')throw Error('Функція f(x,y) не задана.');
  if(exact!==null && exact!==undefined && typeof exact!=='function')throw Error('Точний розв’язок має бути функцією.');
  if (![x0,y0,xEnd].every(Number.isFinite))throw Error('Початкові дані мають бути скінченними.');
  if (!(xEnd>x0))throw Error('Кінець інтервалу має бути більшим за початок.');
  if(!Number.isInteger(n)||n<1||n>20000)throw Error('Кількість кроків має бути цілим числом від 1 до 20000.');
}
export function solveODE(problem,strategy){
  validateProblem(problem);
  if(!strategy||typeof strategy.step!=='function')throw Error('Невідома стратегія розв’язання.');
  const {f,exact=null,x0,y0,xEnd,n}=problem, h=(xEnd-x0)/n;
  const nodes=[{i:0,x:x0,y:y0,error:exact?Math.abs(y0-exact(x0)):null}],stages=[];
  let y=y0;
  for(let i=0;i<n;i++){
    const x=x0+i*h;
    const {next,stage}=strategy.step(f,x,y,h);
    if(!Number.isFinite(next)||!Object.values(stage||{}).every(Number.isFinite))throw Error(`Метод ${strategy.id}: переповнення на кроці ${i+1}.`);
    if(Math.abs(next)>1e250)throw Error('Числове переповнення результату.');
    const nextX=i===n-1?xEnd:x0+(i+1)*h;
    const ey=exact?exact(nextX):null;
    if(ey!==null&&!Number.isFinite(ey))throw Error('Точний розв’язок поза допустимим діапазоном.');
    nodes.push({i:i+1,x:nextX,y:next,error:exact?Math.abs(ey-next):null});
    stages.push({i:i+1,x,y,h,...stage});
    y=next;
  }
  const errors=nodes.filter(p=>p.error!==null).map(p=>p.error);
  const endError=errors.length?errors.at(-1):null;
  return {id:strategy.id,method:strategy.name,order:strategy.order,h,n,nodes,stages,
    maxError:errors.length?Math.max(...errors):null,endError};
}
export function solveAll(problem){return Object.fromEntries(Object.entries(strategies).map(([key,strategy])=>[key,solveODE(problem,strategy)]));}
export function benchmark(problem,rep=30){
  if(!Number.isInteger(rep)||rep<1)throw Error('Невірна кількість повторів.');
  // Median of 30 trials reduces timer noise; performance.now() available in modern Node/browser.
  const out={};
  for(const [key,strategy] of Object.entries(strategies)){
    const samples=[];let result;
    for(let j=0;j<rep;j++){
      const start=performance.now();result=solveODE(problem,strategy);samples.push(performance.now()-start);
    }
    samples.sort((a,b)=>a-b);out[key]={...result,elapsedMs:samples[Math.floor(samples.length/2)]};
  }
  return out;
}
export function convergenceStudy(spec){
  const data={};
  for(const n of [5,10,20])data[n]=solveAll({...spec,n});
  const ratios={};
  for(const key of Object.keys(strategies)){
    ratios[key]={"5→10":data[5][key].endError/data[10][key].endError,
      "10→20":data[10][key].endError/data[20][key].endError};
  }
  return {data,ratios};
}
export function stabilityStudy(){
  const data={};
  for(const n of [5,10,20])data[n]=solveODE({...STABILITY,f:(x,y)=>-20*y,exact:STABILITY.expected,n},strategies.euler);
  return data;
}
/** RK4 для двовимірної системи Лотки–Вольтерри (бонус). */
export function lotkaVolterra({alpha=1.5,beta=1,gamma=3,delta=1,x0=10,y0=5,tEnd=10,n=1200}={}){
  if([alpha,beta,gamma,delta,x0,y0,tEnd].some(v=>!Number.isFinite(v))||x0<=0||y0<=0||tEnd<=0||!Number.isInteger(n)||n<1||n>10000)throw Error('Неправильні параметри моделі хижак–жертва.');
  const f=(x,y)=>[alpha*x-beta*x*y,delta*x*y-gamma*y];
  const h=tEnd/n,pts=[{t:0,x:x0,y:y0}],adv=(v,k,q)=>[v[0]+q*k[0],v[1]+q*k[1]];
  let v=[x0,y0];
  for(let i=0;i<n;i++){
    const k1=f(...v), k2=f(...adv(v,k1,h/2)),k3=f(...adv(v,k2,h/2)),k4=f(...adv(v,k3,h));
    v=[v[0]+h*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,
       v[1]+h*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6];
    if(!v.every(Number.isFinite))throw Error('Модель Лотки–Вольтерри нестабільна для обраних параметрів.');
    pts.push({t:h*(i+1),x:v[0],y:v[1]});
  }
  return pts;
}
