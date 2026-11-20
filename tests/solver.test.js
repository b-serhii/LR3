import test from 'node:test';import assert from 'node:assert/strict';
import {EulerStrategy,HeunStrategy,RK4Strategy,strategies,solveODE,solveAll,convergenceStudy,stabilityStudy,lotkaVolterra,VARIANT,STABILITY} from '../src/solver.js';
const problem=n=>({...VARIANT,f:(x,y)=>y+Math.exp(x),exact:VARIANT.expected,n});
const close=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b} ± ${eps}`);
const run=(key,n)=>solveODE(problem(n),strategies[key]);
for(const n of [5,10,20]){
 for(const key of ['euler','heun','rk4']){
  test(`${key}: n=${n}, n+1 вузлів, точний початок`,()=>{
   const r=run(key,n);assert.equal(r.nodes.length,n+1);assert.equal(r.stages.length,n);
   close(r.nodes[0].y,1);close(r.nodes.at(-1).x,1);assert.ok(r.endError>=0);
   assert.ok(r.nodes.every(p=>Number.isFinite(p.y)));
  });
 }
 test(`n=${n}: краща точність при вищому порядку`,()=>{
  const m=solveAll(problem(n));assert.ok(m.rk4.endError<m.heun.endError);assert.ok(m.heun.endError<m.euler.endError);
 });
}
test('Точний розв’язок задовольняє рівняння та початкову умову',()=>{
 close(VARIANT.expected(0),1);
 for(const x of [0,0.2,0.5,1]){
  const dy=(x+2)*Math.exp(x);close(dy,VARIANT.expected(x)+Math.exp(x));
 }
});
test('Strategy: можна передати новий метод без зміни solveODE',()=>{
 const custom={id:'copy',name:'Тотожна стратегія',step:(f,x,y,h)=>({next:y,stage:{k1:0}})};
 const r=solveODE({f:()=>0,exact:()=>1,x0:0,y0:1,xEnd:1,n:5},custom);
 close(r.endError,0);
});
test('Порядок точності для Ейлера: відношення наближається до 2',()=>{
 const r=convergenceStudy(problem(5)).ratios.euler;assert.ok(r['5→10']>1.7&&r['5→10']<2.1);assert.ok(r['10→20']>1.8&&r['10→20']<2.1);
});
test('Порядок точності Хойна: відношення наближається до 4',()=>{
 const r=convergenceStudy(problem(5)).ratios.heun;assert.ok(r['5→10']>3.4&&r['5→10']<4.2);assert.ok(r['10→20']>3.7&&r['10→20']<4.2);
});
test('Обов’язковий тест РК4: відношення наближається до 16',()=>{
 const r=convergenceStudy(problem(5)).ratios.rk4;assert.ok(r['5→10']>14&&r['5→10']<17);assert.ok(r['10→20']>15&&r['10→20']<17);
});
test('Контроль типової помилки РК4: h замість h/2 руйнує 4-й порядок',()=>{
 const wrong={id:'broken-rk4',name:'Навмисно неправильний РК4',step(f,x,y,h){
  const k1=f(x,y),k2=f(x+h,y+h*k1),k3=f(x+h,y+h*k2),k4=f(x+h,y+h*k3);
  return {next:y+h*(k1+2*k2+2*k3+k4)/6,stage:{k1,k2,k3,k4}};
 }};
 const e5=solveODE(problem(5),wrong).endError,e10=solveODE(problem(10),wrong).endError;
 assert.ok(Math.abs(e5/e10-16)>5,`Очікувано дефектне відношення, отримано ${e5/e10}`);
});
test('Коефіцієнти RK4 на рівнянні y′=1, y(0)=0',()=>{
 const r=solveODE({f:()=>1,exact:x=>x,x0:0,y0:0,xEnd:1,n:5},new RK4Strategy());
 close(r.maxError,0);
 for(const st of r.stages)for(const k of ['k1','k2','k3','k4'])close(st[k],1);
});
test('Сталій розв’язок для всіх методів',()=>{
 const pr={f:()=>0,exact:()=>7,x0:0,y0:7,xEnd:1,n:20};
 for(const value of Object.values(solveAll(pr)))close(value.maxError,0);
});
test('Хойн точний для лінійного x на повному кроці',()=>{
 const p={f:(x)=>x,exact:x=>x*x/2,x0:0,y0:0,xEnd:1,n:5};
 close(solveODE(p,new HeunStrategy()).endError,0,1e-14);
});
test('Параметри РК4: k2/k3 у середині кроку',()=>{
 const f=(x,y)=>y+Math.exp(x);const h=.2;
 const step=new RK4Strategy().step(f,0,1,h);
 close(step.stage.k2,f(.1,1+.1*step.stage.k1));
 close(step.stage.k3,f(.1,1+.1*step.stage.k2));
 close(step.stage.k4,f(.2,1+.2*step.stage.k3));
});
test('Стійкість: n=5 вибух, n=10 незгасаючі осциляції, n=20 згасання',()=>{
 const z=stabilityStudy();close(z[5].nodes.at(-1).y,-243);
 close(z[10].nodes.at(-1).y,1);close(z[10].nodes[1].y,-1);
 close(z[20].nodes.at(-1).y,0);
});
test('Умова стійкості Ейлера |1-20h| для n=5,10,20',()=>{
 assert.ok(Math.abs(1-20/5)>1);close(Math.abs(1-20/10),1);assert.ok(Math.abs(1-20/20)<1);
});
test('Валідація: xEnd має бути більше x0',()=>{
 assert.throws(()=>solveODE({...problem(5),xEnd:0},new EulerStrategy()),/більшим/);
});
test('Валідація: лише ціла додатна кількість кроків',()=>{
 assert.throws(()=>solveODE({...problem(5),n:0},new HeunStrategy()),/кількість кроків/i);
 assert.throws(()=>solveODE({...problem(5),n:5.5},new HeunStrategy()),/кількість кроків/i);
});
test('Валідація: некоректні початкові значення',()=>{
 assert.throws(()=>solveODE({...problem(5),y0:Infinity},new HeunStrategy()),/скінченними/);
});
test('Обробка розбіжності та переповнення',()=>{
 assert.throws(()=>solveODE({f:()=>Infinity,exact:null,x0:0,y0:1,xEnd:1,n:5},new EulerStrategy()),/переповнення/);
});
test('Без аналітичної функції помилки відсутні, розв’язок обчислюється',()=>{
 const p={f:(x,y)=>y,exact:null,x0:0,y0:1,xEnd:1,n:10};const m=solveAll(p);
 assert.equal(m.euler.endError,null);assert.ok(m.rk4.nodes.at(-1).y>2.7);
});
test('Лотка–Вольтерра: 1200 кроків, невід’ємні популяції',()=>{
 const pts=lotkaVolterra();assert.equal(pts.length,1201);assert.ok(pts.every(p=>p.x>0&&p.y>0));
});
test('Лотка–Вольтерра: параметри валідуються',()=>{
 assert.throws(()=>lotkaVolterra({n:0}),/Неправильні/);
});
