import {VARIANT,STABILITY,solveAll,benchmark,convergenceStudy,lotkaVolterra,strategies} from './solver.js';
import {compileExpression} from './expression.js';
import {renderPlot,renderPhase} from './chart.js';
const $=s=>document.querySelector(s);
const state={n:5,method:'all',problem:null,results:null,animationId:0,animatedStep:null,source:'variant'};
const fmt=(n,d=6)=>Number.isFinite(n)?(n===0?'0':Math.abs(n)<.001?n.toExponential(3):Number(n.toFixed(d)).toLocaleString('uk-UA',{maximumFractionDigits:d})):'—';
function showError(err){$('#form-error').textContent=err?.message||String(err||'');}
function saveForm(p){$('#fx').value=p.fText;$('#exact').value=p.exactText;$('#x0').value=p.x0;$('#y0').value=p.y0;$('#xend').value=p.xEnd;$('#exact-on').checked=true;}
function readProblem(){
  const fText=$('#fx').value.trim(),exactText=$('#exact').value.trim();
  const x0=Number($('#x0').value),y0=Number($('#y0').value),xEnd=Number($('#xend').value);
  if(!['#x0','#y0','#xend'].every(s=>$(s).value.trim()!==''))throw Error('Вкажіть початкову умову та межі інтервалу.');
  const f=compileExpression(fText),exact=$('#exact-on').checked?compileExpression(exactText,{allowY:false}):null;
  const p={f,exact,x0,y0,xEnd,n:state.n,fText,exactText};
  solveAll(p); // Перевірка до заміни поточного стану; повідомлення про невірні дані.
  return p;
}
function pickPreset(key){
  state.source=key;
  saveForm(key==='stability'?STABILITY:VARIANT);
  recalc();
}
function cancelAnimation(){state.animationId++;state.animatedStep=null;$('#animation-status').textContent='Готово до дослідження';}
function getForN(n){return solveAll({...state.problem,n});}
function updateMetrics(){
  $('#stat-n').textContent=String(state.n);
  $('#stat-h').textContent=fmt((state.problem.xEnd-state.problem.x0)/state.n,4);
  $('#stat-euler').textContent=fmt(state.results.euler.endError);
  $('#stat-rk4').textContent=fmt(state.results.rk4.endError);
  $('#formula-current').textContent=`y′ = ${state.problem.fText},  y(${fmt(state.problem.x0)}) = ${fmt(state.problem.y0)}`;
  $('#stability-note').hidden=state.source!=='stability';
}
function plotMain(){
  const limit=state.animatedStep;
  renderPlot($('#main-graph'),state.results,{exact:state.problem.exact,method:state.method,limit,x0:state.problem.x0,xEnd:state.problem.xEnd});
  if(state.method==='rk4' && limit!==null && limit>0){
    const stage=state.results.rk4.stages[limit-1];
    $('#stage-panel').hidden=false;
    $('#stage-k1').textContent=fmt(stage.k1);$('#stage-k2').textContent=fmt(stage.k2);
    $('#stage-k3').textContent=fmt(stage.k3);$('#stage-k4').textContent=fmt(stage.k4);
    $('#stage-title').textContent=`РК4 — крок ${limit} із ${state.n}`;
  } else $('#stage-panel').hidden=true;
}
function drawMinis(){
  $('#six-graphs').innerHTML='';
  for(const n of [5,10,20]){
    const results=getForN(n);
    for(const kind of ['solution','error']){
      const card=document.createElement('article');card.className='mini-card';
      card.innerHTML=`<div class="mini-head"><span class="mini-label">${kind==='solution'?'Розв’язок':'Абсолютна похибка'}</span><strong>${n} кроків</strong></div><div class="mini-graph"></div>`;
      $('#six-graphs').appendChild(card);
      renderPlot(card.querySelector('.mini-graph'),results,{kind,small:true,exact:state.problem.exact,x0:state.problem.x0,xEnd:state.problem.xEnd});
    }
  }
}
function drawTables(){
  const rows=[];for(const n of [5,10,20]){
    const data=benchmark({...state.problem,n},25);
    for(const method of ['euler','heun','rk4']){
      const v=data[method];rows.push(`<tr class="${n===state.n?'selected':''}"><td>${n}</td><td>${v.method}</td><td>${fmt(v.maxError)}</td><td>${fmt(v.endError)}</td><td>${fmt(v.elapsedMs,5)}</td></tr>`);
    }
  }
  $('#comparison-body').innerHTML=rows.join('');
  if(state.problem.exact){
    const study=convergenceStudy(state.problem);let str='';
    for(const [id,s] of Object.entries(strategies)){
      const pair=study.ratios[id];
      str+=`<tr><td>${s.name}</td><td>${fmt(pair['5→10'],3)}</td><td>${fmt(pair['10→20'],3)}</td><td>${2**s.order}</td></tr>`;
    }
    $('#order-body').innerHTML=str;
    $('#order-note').textContent='Відношення обчислено за похибкою у кінцевій точці. Для достатньо малого h воно наближається до 2ᵖ.';
  } else {
    $('#order-body').innerHTML='<tr><td colspan="4">Потрібен точний розв’язок для розрахунку порядку.</td></tr>';
    $('#order-note').textContent='Для власної функції можна ввести відомий аналітичний розв’язок.';
  }
  const stable=[5,10,20].map(n=>{const h=1/n,z=1-20*h;return `<tr><td>${n}</td><td>${fmt(h,2)}</td><td>${fmt(z,0)}</td><td>${fmt(z**n,0)}</td><td>${Math.abs(z)>1?'Розбіжність':Math.abs(z)===1?'Осциляції':'Стійкий'}</td></tr>`;});
  $('#stability-body').innerHTML=stable.join('');
}
function recalc(){
  try{
    const newProblem=readProblem();cancelAnimation();state.problem=newProblem;state.results=solveAll(newProblem);
    showError('');updateMetrics();plotMain();drawMinis();drawTables();$('#main-title').textContent=`Основний графік · ${state.n} кроків`;
    $('#preset-label').textContent=state.source==='variant'?'Варіант № 1':state.source==='stability'?'Тест стійкості':'Власне рівняння';
  }catch(e){showError(e);}
}
function animate(){
  if(!state.problem)return;
  cancelAnimation();const id=state.animationId,start=performance.now(),duration=state.n*250+200;
  state.animatedStep=0;
  function frame(t){
    if(state.animationId!==id)return;
    const n=Math.min(state.n,Math.floor(Math.max(0,t-start)/250));
    if(state.animatedStep!==n){
      state.animatedStep=n;plotMain();$('#animation-status').textContent=`Крок ${n} із ${state.n}`;
    }
    if(t-start<duration)requestAnimationFrame(frame);
    else {state.animatedStep=state.n;plotMain();$('#animation-status').textContent='Анімацію завершено';}
  }
  requestAnimationFrame(frame);
}
function serializeCSV(){
  const list=[];
  list.push('Метод;Номер кроку;x;Чисельне y;Точне y;Абсолютна похибка');
  for(const [id,result] of Object.entries(state.results))for(const p of result.nodes){
    const exact=state.problem.exact?state.problem.exact(p.x):null;
    list.push([id,p.i,p.x,p.y,exact??'',p.error??''].join(';'));
  }
  const blob=new Blob(['\ufeff'+list.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`LR3_ODE_${state.n}_steps.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function initPhase(){
  try{const pts=lotkaVolterra();renderPhase($('#phase-graph'),pts);$('#phase-status').textContent='РК4 · 1200 кроків · 10 одиниць часу';}
  catch(e){$('#phase-status').textContent=e.message;}
}
function setSize(n){state.n=n;document.querySelectorAll('button[data-n]').forEach(b=>{const active=Number(b.dataset.n)===n;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});recalc();}
document.querySelectorAll('button[data-n]').forEach(b=>b.addEventListener('click',()=>setSize(Number(b.dataset.n))));
document.querySelectorAll('button[data-method]').forEach(b=>b.addEventListener('click',()=>{
  state.method=b.dataset.method;document.querySelectorAll('button[data-method]').forEach(x=>{const yes=x.dataset.method===state.method;x.classList.toggle('active',yes);x.setAttribute('aria-pressed',String(yes));});cancelAnimation();plotMain();
}));
$('#preset-variant').addEventListener('click',()=>pickPreset('variant'));
$('#preset-stability').addEventListener('click',()=>pickPreset('stability'));
$('#apply').addEventListener('click',()=>{state.source='custom';recalc();});
$('#fx').addEventListener('input',()=>{if(state.source!=='custom'){$('#exact-on').checked=false;state.source='custom';}});
$('#animate').addEventListener('click',animate);
$('#stop').addEventListener('click',()=>{cancelAnimation();plotMain();});
$('#csv').addEventListener('click',()=>{if(state.results)serializeCSV();});
$('#export-json').addEventListener('click',()=>{
  const obj={f:$('#fx').value,exact:$('#exact').value,useExact:$('#exact-on').checked,x0:Number($('#x0').value),y0:Number($('#y0').value),xEnd:Number($('#xend').value),n:state.n};
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lr3_problem.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
$('#file-json').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>100000)throw Error('Файл JSON завеликий.');
    const data=JSON.parse(await file.text());
    if(typeof data.f!=='string'||![data.x0,data.y0,data.xEnd].every(Number.isFinite))throw Error('JSON повинен містити f, x0, y0, xEnd.');
    $('#fx').value=data.f;$('#exact').value=typeof data.exact==='string'?data.exact:'';$('#exact-on').checked=!!data.useExact;
    $('#x0').value=data.x0;$('#y0').value=data.y0;$('#xend').value=data.xEnd;
    state.source='custom';if([5,10,20].includes(data.n))setSize(data.n);else recalc();
  }catch(err){showError(err);}finally{e.target.value='';}
});
initPhase();pickPreset('variant');
