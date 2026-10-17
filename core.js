export const BUILTINS = Object.freeze([
  {id:'main',name:'Основной смартфон (HUAWEI Pura 70 PRO)',device:'HUAWEI Pura 70 PRO',batch:'Test Strips 16 in 1 (партия не указана)',conditions:'Освещение: лампа с холодным светом. Фон: белый. Считывание: через 30 секунд после смачивания.',a:0.332148,b:-0.000832,r2:0.9812,min:0,max:100,builtin:true},
  {id:'second',name:'Второй смартфон (XIAOMI Redmi 13 Pro)',device:'XIAOMI Redmi 13 Pro',batch:'Test Strips 16 in 1 (партия не указана)',conditions:'Освещение: лампа с холодным светом. Фон: белый. Считывание: через 30 секунд после смачивания.',a:0.353782,b:-0.000957,r2:0.9784,min:0,max:100,builtin:true}
]);
export function number(value){
  if(typeof value==='number') return Number.isFinite(value)?value:NaN;
  if(typeof value!=='string'||!value.trim()) return NaN;
  const normalized=value.trim().replace(',','.');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)?Number(normalized):NaN;
}
export function normalizedG(r,g,b){
  if(![r,g,b].every(v=>Number.isFinite(v)&&v>=0&&v<=255)) throw Error('Каждый канал RGB должен быть числом от 0 до 255.');
  if(r+g+b===0) throw Error('Сумма RGB равна нулю. Выберите освещённую область или проверьте ввод.');
  return g/(r+g+b);
}
export function meanRGB(data){
  let r=0,g=0,b=0,n=0;
  for(let i=0;i<data.length;i+=4){if(data[i+3]===0)continue;r+=data[i];g+=data[i+1];b+=data[i+2];n++;}
  if(!n) throw Error('В выделенной области нет непрозрачных пикселей.');
  return {r:r/n,g:g/n,b:b/n,n};
}
export function regress(points){
  if(points.length<3)throw Error('Добавьте минимум 3 измерения с разными концентрациями.');
  if(!points.every(p=>Number.isFinite(p.c)&&p.c>=0&&p.c<=100&&Number.isFinite(p.y)&&p.y>=0&&p.y<=1))throw Error('Проверьте точки: C от 0 до 100; Gнорм от 0 до 1.');
  if(new Set(points.map(p=>p.c)).size<3)throw Error('Нужны минимум 3 разные концентрации стандартов.');
  const n=points.length,xc=points.reduce((s,p)=>s+p.c,0)/n,yc=points.reduce((s,p)=>s+p.y,0)/n;
  const xx=points.reduce((s,p)=>s+(p.c-xc)**2,0),xy=points.reduce((s,p)=>s+(p.c-xc)*(p.y-yc),0);
  const b=xy/xx,a=yc-b*xc,tss=points.reduce((s,p)=>s+(p.y-yc)**2,0),sse=points.reduce((s,p)=>s+(p.y-a-b*p.c)**2,0);
  if(!Number.isFinite(b)||b>=-1e-12||tss<1e-18)throw Error('Не получена убывающая зависимость. Проверьте стандарты, порядок измерений и выбранное поле полоски.');
  return {a,b,r2:Math.max(0,Math.min(1,1-sse/tss)),min:Math.min(...points.map(p=>p.c)),max:Math.max(...points.map(p=>p.c)),n};
}
export function concentration(y,p){
  if(!Number.isFinite(y)||y<0||y>1)throw Error('Gнорм должен быть числом от 0 до 1.');
  if(!p||!Number.isFinite(p.a)||!Number.isFinite(p.b)||p.b>=0||!(p.min>=0&&p.max>p.min&&p.max<=100))throw Error('Некорректный калибровочный профиль.');
  const c=(y-p.a)/p.b,tol=1e-8;
  if(c < p.min-tol || (p.min===0&&c<=tol)) return {kind:p.min===0?'low':'below',value:null};
  if(c>p.max+tol)return {kind:'above',value:null};
  return {kind:'value',value:Math.max(p.min,Math.min(p.max,c))};
}
export function validateProfile(p){
  if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!Array.isArray(p.points))throw Error('Файл не содержит корректного профиля AquaNO₃.');
  const points=p.points.map(t=>({c:number(t.c),y:number(t.y)}));
  const fit=regress(points);
  return {name:p.name.trim(),device:String(p.device||'').slice(0,150),batch:String(p.batch||'').slice(0,150),conditions:String(p.conditions||'').slice(0,1000),created:String(p.created||''),points,...fit};
}
