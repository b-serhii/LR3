/** Захищений парсер математичних формул без eval(), Function() чи сторонніх залежностей. */
const funcs={sin:Math.sin,cos:Math.cos,tan:Math.tan,exp:Math.exp,log:Math.log,ln:Math.log,sqrt:Math.sqrt,abs:Math.abs,atan:Math.atan};
export function compileExpression(source,{allowY=true}={}){
  const text=String(source).trim();if(!text||text.length>180)throw Error('Вкажіть формулу (до 180 символів).');
  const tokens=[];let i=0;
  while(i<text.length){
    if(/\s/.test(text[i])){i++;continue;}
    const v=text.slice(i);
    const num=v.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if(num){tokens.push({type:'number',v:Number(num[0])});i+=num[0].length;continue;}
    const name=v.match(/^[a-zA-Z_][a-zA-Z_0-9]*/);
    if(name){tokens.push({type:'name',v:name[0].toLowerCase()});i+=name[0].length;continue;}
    if('()+-*/^'.includes(text[i])){tokens.push({type:text[i],v:text[i]});i++;continue;}
    throw Error(`Недопустимий символ «${text[i]}». Дозволено x, y, exp, sin, cos, числа та арифметичні операції.`);
  }
  if(tokens.length>120)throw Error('Формула надто складна.');
  let pos=0,depth=0;
  function peek(t){return tokens[pos]?.type===t;}
  function eat(t){if(!peek(t))throw Error(`Очікувався символ ${t}.`);return tokens[pos++];}
  function enter(fn){if(++depth>80)throw Error('Занадто складна вкладеність формули.');try{return fn();}finally{depth--;}}
  function primary(){return enter(()=>{
    if(peek('number'))return {t:'const',v:eat('number').v};
    if(peek('(')){eat('(');const v=sum();eat(')');return v;}
    if(peek('name')){
      const name=eat('name').v;
      if(name==='x'||(allowY&&name==='y'))return {t:'var',v:name};
      if(name==='pi'||name==='e')return {t:'const',v:name==='pi'?Math.PI:Math.E};
      if(Object.hasOwn(funcs,name)){
        eat('(');const arg=sum();eat(')');return {t:'call',v:name,arg};
      }
      throw Error(`Невідома змінна або функція: ${name}.`);
    }
    throw Error('Очікувалося число, змінна або дужки.');
  });}
  function power(){let a=primary();if(peek('^')){eat('^');a={t:'binary',v:'^',left:a,right:unary()};}return a;}
  function unary(){if(peek('-')||peek('+')){const op=tokens[pos++].type;return {t:'unary',v:op,arg:unary()};}return power();}
  function product(){let a=unary();while(peek('*')||peek('/')){const op=tokens[pos++].type;a={t:'binary',v:op,left:a,right:unary()};}return a;}
  function sum(){let a=product();while(peek('+')||peek('-')){const op=tokens[pos++].type;a={t:'binary',v:op,left:a,right:product()};}return a;}
  const tree=sum();if(pos!==tokens.length)throw Error('Зайві символи після формули.');
  const walk=(node,x,y)=>{
    if(node.t==='const')return node.v;
    if(node.t==='var')return node.v==='x'?x:y;
    if(node.t==='unary')return (node.v==='-'?-1:1)*walk(node.arg,x,y);
    if(node.t==='call')return funcs[node.v](walk(node.arg,x,y));
    const a=walk(node.left,x,y),b=walk(node.right,x,y);
    switch(node.v){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '^':return Math.pow(a,b);}
    throw Error('Непідтримувана операція.');
  };
  return (x,y)=>{const result=walk(tree,x,y);if(!Number.isFinite(result))throw Error(`Формула повернула некоректне значення при x=${x.toFixed(3)}.`);return result;};
}
