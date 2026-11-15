const precedence = {or:1,and:2,'>':3,'<':3,'>=':3,'<=':3,'==':3,'!=':3,'+':4,'-':4,'*':5,'/':5};
const ops=new Map(Object.entries(precedence));
const fields=['dayPct','candlePct','price','open','close'];
const fail=message=>{throw new Error(message)};

function expression(source,names){
  const tokens=source.match(/\d+(?:\.\d+)?|[A-Za-z_]\w*(?:\.\w+)?|>=|<=|==|!=|[()+*/<>-]|\S/g)||[];
  if(tokens.length>180)fail('Split this expression into shorter assignments.');
  let i=0;
  function parse(min=0){
    const t=tokens[i++];
    let node;
    if(t==='-'||t==='not'||t==='math.abs'){
      if(t==='math.abs'&&tokens[i]!=='(')fail('Use math.abs(value).');
      node={op:t==='-'?'neg':t,a:parse(t==='not'?3:6)};
    }else if(t==='('){
      node=parse();if(tokens[i++]!==')')fail('Missing closing parenthesis.');
    }else if(t && /^\d/.test(t)){node={value:Number(t)}}
    else if(names.has(t)){node={field:t}}
    else fail('Unsupported name or expression: '+(t??'end of line'));
    while(ops.has(tokens[i])&&ops.get(tokens[i])>=min){
      const op=tokens[i++];node={op,a:node,b:parse(ops.get(op)+1)};
    }
    return node;
  }
  const tree=parse();if(i!==tokens.length)fail('Unsupported token: '+tokens[i]);return tree;
}

function calc(n,env){
  if('value' in n)return n.value;
  if('field' in n)return env.get(n.field)??null;
  const a=calc(n.a,env);
  if(n.op==='not')return typeof a==='boolean'?!a:null;
  if(n.op==='neg'||n.op==='math.abs')return Number.isFinite(a)?(n.op==='neg'?-a:Math.abs(a)):null;
  const b=calc(n.b,env);
  if(n.op==='and'||n.op==='or'){
    if(n.op==='and'&&(a===false||b===false))return false;
    if(n.op==='or'&&(a===true||b===true))return true;
    return typeof a==='boolean'&&typeof b==='boolean'?(n.op==='and'?a&&b:a||b):null;
  }
  if(!Number.isFinite(a)||!Number.isFinite(b))return null;
  switch(n.op){
    case '>':return a>b;case '<':return a<b;case '>=':return a>=b;case '<=':return a<=b;
    case '==':return a===b;case '!=':return a!==b;
    case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return b===0?null:a/b;
  }
}

// Parse a small documented Pine expression subset. Nothing is executed as JavaScript.
export function compileIndicator(source){
  if(typeof source!=='string'||source.length>4000)fail('Use a rule of at most 4,000 characters.');
  const lines=source.split(/\r?\n/).map(l=>l.replace(/\/\/.*$/,'').trim()).filter(Boolean);
  if(!lines.length||lines.length>32)fail('Use 1–32 non-comment lines.');
  const names=new Set(fields),assignments=[];
  let condition;
  for(const line of lines){
    if(/^indicator\(\s*"[^"]*"\s*\)$/.test(line))continue;
    if(condition)fail('Use one final alert condition per rule.');
    const assignment=/^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/.exec(line);
    if(assignment){
      if(names.has(assignment[1])||['and','or','not'].includes(assignment[1]))fail('Choose a unique variable name.');
      assignments.push([assignment[1],expression(assignment[2],names)]);names.add(assignment[1]);continue;
    }
    const alert=/^alertcondition\(([^,]+?)(?:,\s*"[^"]*"(?:,\s*"[^"]*")?)?\)$/.exec(line);
    condition=expression(alert?alert[1]:line,names);
  }
  if(!condition)fail('Finish with a comparison or alertcondition(...).');
  const types=new Map(fields.map(f=>[f,'number']));
  function type(n){
    if('value' in n)return 'number';
    if('field' in n)return types.get(n.field);
    const logical=['not','and','or'].includes(n.op);
    const expected=logical?'boolean':'number';
    if(type(n.a)!==expected||(n.b&&type(n.b)!==expected))fail('Check the numeric and logical operands.');
    return logical||ops.get(n.op)===3?'boolean':'number';
  }
  for(const [name,tree] of assignments)types.set(name,type(tree));
  if(type(condition)!=='boolean')fail('The final result must be a comparison.');
  return values=>{
    const env=new Map(fields.map(f=>[f,Number.isFinite(values[f])?values[f]:null]));
    for(const [name,tree] of assignments)env.set(name,calc(tree,env));
    return calc(condition,env)===true;
  };
}
