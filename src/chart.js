/** Динамічні SVG: межі X/Y з усіх показуваних кривих, без ручних значень. */
const COLORS={euler:'#EA865B',heun:'#169CA1',rk4:'#8066D9',exact:'#1F3151'};
const chartFmt=(v)=>{if(!Number.isFinite(v))return '—';if(v!==0&&(Math.abs(v)>1e5||Math.abs(v)<1e-3))return v.toExponential(2);return Number(v.toFixed(3)).toLocaleString('uk-UA');};
function bounds(values){
  const a=values.filter(Number.isFinite);if(!a.length)return [-1,1];
  let mn=Math.min(...a),mx=Math.max(...a);
  const span=mx-mn||Math.max(0.01,Math.abs(mx)*.12);
  return [mn-span*.1,mx+span*.1];
}
const curve=(points,tx,ty)=>points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map((p,i)=>(i?'L':'M')+tx(p.x).toFixed(2)+' '+ty(p.y).toFixed(2)).join(' ');
function paint(node,lines,{small=false,xLabel='x',yLabel='y',dot=true}={}){
  const W=small?560:1000,H=small?265:395;
  const pad={left:small?69:91,right:small?19:35,top:small?23:28,bottom:small?38:50};
  const all=lines.flatMap(l=>l.points);
  const [xmin,xmax]=bounds(all.map(p=>p.x)),[ymin,ymax]=bounds(all.map(p=>p.y));
  const wd=W-pad.left-pad.right,ht=H-pad.top-pad.bottom;
  const tx=x=>pad.left+(x-xmin)/(xmax-xmin)*wd,ty=y=>pad.top+(ymax-y)/(ymax-ymin)*ht;
  let str='';
  for(let i=0;i<=5;i++){
    const y=pad.top+i*ht/5,val=ymax-i*(ymax-ymin)/5;
    str+=`<line x1="${pad.left}" x2="${W-pad.right}" y1="${y}" y2="${y}" stroke="#E5EAF2" stroke-dasharray="3 5"/><text x="${pad.left-10}" y="${y+4}" text-anchor="end" class="tick">${chartFmt(val)}</text>`;
    const x=pad.left+i*wd/5,xx=xmin+i*(xmax-xmin)/5;
    str+=`<line x1="${x}" x2="${x}" y1="${pad.top}" y2="${H-pad.bottom}" stroke="#E5EAF2" stroke-dasharray="3 5"/><text x="${x}" y="${H-pad.bottom+20}" text-anchor="middle" class="tick">${chartFmt(xx)}</text>`;
  }
  str+=`<text x="${W-pad.right-3}" y="${H-5}" text-anchor="end" class="axis">${xLabel}</text><text x="14" y="${pad.top-7}" class="axis">${yLabel}</text>`;
  lines.forEach(l=>{
    const d=curve(l.points,tx,ty);
    if(d)str+=`<path d="${d}" fill="none" stroke="${l.color||COLORS[l.id]||'#000'}" stroke-width="${small?2.4:3.2}" stroke-dasharray="${l.dash?'7 5':'none'}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if(dot && !l.noDots){
      const step=l.points.length>80?Math.ceil(l.points.length/80):1;
      l.points.filter((p,i)=>i%step===0).forEach(p=>str+=`<circle cx="${tx(p.x)}" cy="${ty(p.y)}" r="${small?3:4.5}" fill="${l.color||COLORS[l.id]||'#000'}" stroke="#fff" stroke-width="1.4"><title>x=${chartFmt(p.x)}, y=${chartFmt(p.y)}</title></circle>`);
    }
  });
  node.innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="graph-svg" role="img" aria-label="Динамічний чисельний графік" xmlns="http://www.w3.org/2000/svg">${str}</svg>`;
}
export function renderPlot(node,results,{kind='solution',exact=null,method='all',limit=null,small=false,x0=0,xEnd=1}={}){
  const lines=[];
  if(kind==='solution' && exact){
    const samples=Array.from({length:301},(_,i)=>{const x=x0+(xEnd-x0)*i/300;return {x,y:exact(x)};});
    lines.push({id:'exact',points:samples,noDots:true,dash:true});
  }
  for(const [key,v] of Object.entries(results)){
    if(method!=='all' && key!==method)continue;
    let points=v.nodes;
    if(limit!==null)points=points.slice(0,Math.max(1,limit+1));
    const arr=points.map(p=>({x:p.x,y:kind==='solution'?p.y:p.error})).filter(p=>p.y!==null && Number.isFinite(p.y));
    if(arr.length)lines.push({id:key,points:arr});
  }
  if(!lines.length){node.innerHTML='<div class="empty-state">Для графіка похибки потрібен відомий точний розв’язок.</div>';return;}
  paint(node,lines,{small,yLabel:kind==='solution'?'y':'|e|'});
}
export function renderPhase(node,trajectory){
  paint(node,[{id:'rk4',points:trajectory.map(p=>({x:p.x,y:p.y})),noDots:true}],{xLabel:'жертви',yLabel:'хижаки',dot:false});
}
