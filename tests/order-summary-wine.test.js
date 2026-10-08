const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function buildSummarySheet(perFileResults){');
const end=html.indexOf('function buildSPHSummarySheet(perFileResults){',start);
const summaryFunction=html.slice(start,end);

function buildSummary(flatRows){
  const context={SPECIAL_IDS:['3823309765342266082','10000908591826'],isComboSpec:()=>false};
  return vm.runInNewContext(`${summaryFunction}; buildSummarySheet([{flatRows:${JSON.stringify(flatRows)}}])`,context);
}

function productRow(id,spec,box,amount){
  return {id,spec,box,amount:String(amount),totalAmount:String(amount)};
}

test('抖音酒类商品优先按商品ID归入白葡萄酒、山葡萄酒和白桦酒',()=>{
  const summary=buildSummary([
    productRow('3844332672436535791','规格信息缺失',2,240),
    productRow('3844334104942346341','名称可能变化',3,360),
    productRow('3844334227407634451','180ml*6瓶(1箱)',4,480)
  ]);
  const rows=summary.rows;
  assert.deepEqual(Array.from(rows.find(row=>row[2]==='白葡萄酒')),['果酒店','3844332672436535791','白葡萄酒',2,240]);
  assert.deepEqual(Array.from(rows.find(row=>row[2]==='山葡萄酒')),['果酒店','3844334104942346341','山葡萄酒',3,360]);
  assert.deepEqual(Array.from(rows.find(row=>row[2]==='白桦酒')),['果酒店','3844334227407634451','白桦酒',4,480]);
});

test('未知商品ID可按商品规格兜底识别酒类，旧玻璃瓶和罐装归类保留',()=>{
  const summary=buildSummary([
    productRow('wine-unknown','冰白葡萄酒1箱;180ml*6瓶',1,100),
    productRow('glass-old','山葡萄原汁1箱;320ml*6瓶',2,200),
    productRow('canned-old','山葡萄原汁1箱;320ml*12罐',3,300)
  ]);
  const rows=summary.rows;
  assert.deepEqual(Array.from(rows.find(row=>row[2]==='白葡萄酒')),['果酒店','wine-unknown','白葡萄酒',1,100]);
  assert.deepEqual(Array.from(rows.find(row=>row[2]==='山葡萄-玻璃瓶')),['饮品店','glass-old','山葡萄-玻璃瓶',2,200]);
  assert.deepEqual(Array.from(rows.find(row=>row[2]==='山葡萄-罐装')),['官方店','canned-old','山葡萄-罐装',3,300]);
});

test('抖音汇总按截图顺序排列品类且不包含泉阳泉12罐',()=>{
  const summary=buildSummary([]);
  assert.deepEqual(Array.from(summary.rows.slice(1),row=>row[2]),[
    '山葡萄-玻璃瓶',
    '冰白葡萄-玻璃瓶',
    '软枣-玻璃瓶',
    '蔓越莓-玻璃瓶',
    '白桦-玻璃瓶',
    '山梨-玻璃瓶',
    '山葡萄-罐装',
    '冰白葡萄-罐装',
    '软枣-罐装',
    '蔓越莓-罐装',
    '白桦-罐装',
    '山梨-罐装',
    '泉阳泉联名气泡水6罐',
    '泉阳泉联名气泡水24罐',
    '白桦酒',
    '白葡萄酒',
    '山葡萄酒'
  ]);
});
