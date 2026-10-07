const {test}=require('node:test');
const assert=require('node:assert/strict');
const {analyze,buildAiSummary,date,number,summarizeProducts,productSummaryRows}=require('../qianchuan.js');
const headers=['日期','商品ID','商品名称','综合成本','净成交金额','综合营销ROI'];
const row=['2026-09-22','3823309765342266082','测试商品',100,250,2.5];
const file=(rows,extra={})=>({name:'账户_2026-09-22_乘方-商品-商品数据明细.xlsx',lastModified:1,rows:[headers,...rows],...extra});
test('千川 AI 摘要只发送当前商品汇总指标，不包含商品、账户或文件明细',()=>{
 const summary=buildAiSummary([
  {kind:'product',account:'敏感账户A',date:'2026-09-21',id:'sku-secret-a',name:'保密商品A',cost:100,sales:200,source:'private-a.xlsx'},
  {kind:'product',account:'敏感账户A',date:'2026-09-21',id:'sku-secret-b',name:'保密商品B',cost:50,sales:100,source:'private-a.xlsx'},
  {kind:'video',account:'敏感账户A',date:'2026-09-21',id:'video-secret',name:'保密素材',cost:900,sales:900,source:'private-a.xlsx'},
  {kind:'product',account:'敏感账户B',date:'2026-09-22',id:'sku-secret-c',name:'保密商品C',cost:70,sales:80,source:'private-b.xlsx'}
 ],{date:'all',account:'all',query:''});
 assert.deepEqual(summary,{
  selection:{date:'all',account:'all',searchApplied:false},
  totals:{productRows:3,uniqueProducts:3,cost:220,sales:380,roi:380/220},
  accounts:[
   {label:'账户 1',productRows:2,cost:150,sales:300,roi:2},
   {label:'账户 2',productRows:1,cost:70,sales:80,roi:80/70}
  ]
 });
 const serialized=JSON.stringify(summary);
 for(const privateValue of ['敏感账户','sku-secret','保密商品','private-','保密素材']) assert.equal(serialized.includes(privateValue),false);
});
test('千川 AI 摘要遵守当前日期、账户和搜索筛选',()=>{
 const records=[
  {kind:'product',account:'账户A',date:'2026-09-21',id:'a',name:'商品A',cost:10,sales:20},
  {kind:'product',account:'账户B',date:'2026-09-22',id:'b',name:'目标商品',cost:30,sales:60},
  {kind:'product',account:'账户B',date:'2026-09-22',id:'c',name:'其他商品',cost:100,sales:100}
 ];
 const summary=buildAiSummary(records,{date:'2026-09-22',account:'账户B',query:'目标'});
 assert.deepEqual(summary.totals,{productRows:1,uniqueProducts:1,cost:30,sales:60,roi:2});
 assert.deepEqual(summary.selection,{date:'2026-09-22',account:'single-account',searchApplied:true});
});
test('商品和视频独立、长 ID 保持文本、全部行排除',()=>{
 const video={name:'账户_2026-09-22_乘方-商品-素材-视频.xlsx',rows:[['日期','素材ID','素材视频名称','综合成本','净成交金额','综合营销ROI'],row]};
 const r=analyze([file([row,['全部',...row.slice(1)]]),video]);
 assert.equal(r.productCount,1);assert.equal(r.videoCount,1);assert.equal(r.ignoredAll,1);
 assert.equal(r.records[0].id,row[1]);assert.equal(r.records.filter(x=>x.kind==='product').reduce((s,x)=>s+x.cost,0),100);
});
test('按修改时间去重并提示冲突，账户和日期分开',()=>{
 const r=analyze([file([[...row.slice(0,3),200,600,3]],{lastModified:2}),file([row]),file([row],{name:'账户B_2026-09-22_乘方-商品-商品数据明细.xlsx'})]);
 assert.equal(r.productCount,2);assert.equal(r.records.find(x=>x.account==='账户').cost,200);assert.equal(r.warnings.length,1);
});
test('商品缺金额排除，视频缺金额保留为空',()=>{
 const bad=[...row];bad[3]='--';
 const r=analyze([file([bad]),{name:'账户_2026-09-22_乘方-商品-素材-视频.xlsx',rows:[['日期','素材ID','素材视频名称','综合成本','净成交金额','综合营销ROI'],bad]}]);
 assert.equal(r.productCount,0);assert.equal(r.videoCount,1);assert.equal(r.records[0].cost,null);assert.equal(r.ignoredRows,1);
});
test('无效文件、缺列、读取失败均提示',()=>{
 const r=analyze([{name:'wrong.xlsx'},file([]),file([row],{rows:[['日期'],['2026-09-22']]}),file([],{error:'损坏'})]);
 assert.equal(r.records.length,0);assert.equal(r.warnings.length,5);
});
test('日期、数字、零成本及不安全数字 ID',()=>{
 assert.equal(date('2026/9/22'),'2026-09-22');assert.equal(date('2026-02-30'),'');assert.equal(date(46287),'2026-09-22');
 assert.equal(number('1,234.50'),1234.5);assert.equal(number('--'),null);assert.equal(number('1oops'),null);
 const zero=[...row];zero[3]=0;assert.equal(analyze([file([zero])]).records[0].cost,0);
 const bad=[...row];bad[1]=3823309765342266082;assert.equal(analyze([file([bad])]).records.length,0);
});

const summaryHeaders=['日期','商品ID','商品名称','整体消耗','净成交金额','整体成交金额','综合成本','1小时内退款订单数','整体成交订单数'];
const summaryRow=(id='123',name='测试罐装',cost=100,net=250,gross=300,combined=110,refunds=2,orders=10,day='2026-09-28')=>[day,id,name,cost,net,gross,combined,refunds,orders];
const summaryFile=(account,rows,extra={})=>({name:`${account}_2026-09-28_乘方-商品-商品数据明细.xlsx`,rows:[summaryHeaders,...rows],...extra});

test('千川商品汇总先排除全部行，再允许跨账户同商品聚合并重算比率',()=>{
 const files=[
  summaryFile('账户A',[summaryRow('123','测试罐装',100,250,300,110,2,10),summaryRow('123','测试罐装',999,999,999,999,99,99,'全部')]),
  summaryFile('账户B',[summaryRow('123','测试罐装',50,100,120,55,1,5)])
 ];
 const report=summarizeProducts(files,{date:'2026-09-28'});
 assert.equal(report.aborted,false);assert.equal(report.fileCount,2);assert.equal(report.recordCount,2);assert.equal(report.productCount,1);
 assert.equal(report.totalCost,150);assert.equal(report.products[0].netSales,350);assert.equal(report.products[0].grossSales,420);
 assert.equal(report.products[0].refundOrders,3);assert.equal(report.products[0].combinedCost,165);
 assert.equal(report.products[0].roi,350/150);assert.equal(report.products[0].refundRate,3/15);
 assert.equal(report.ignoredAll,1);
 assert.equal(productSummaryRows(report)[0].length,10);assert.equal(productSummaryRows(report)[1][1],'123');
});

test('千川商品汇总同一文件商品ID重复时终止，不误判跨文件商品ID',()=>{
 const duplicate=summaryFile('账户A',[summaryRow('123'),summaryRow('123','测试罐装',10,20,30,5,0,1,'2026-09-29')]);
 const report=summarizeProducts([duplicate,summaryFile('账户B',[summaryRow('123')])],{date:'2026-09-28'});
 assert.equal(report.aborted,true);assert.equal(report.products.length,0);assert.ok(report.warnings.some(w=>w.includes('账户A')&&w.includes('重复')));
});

test('千川商品汇总标记包装、按分类和消耗排序并触发质量告警',()=>{
 const report=summarizeProducts([
  summaryFile('罐装低',[summaryRow('1','小罐装',10,1,2,3,0,1)]),
  summaryFile('瓶装',[summaryRow('2','葡萄汁320ml*6瓶装',20,1,2,3,0,1)]),
  summaryFile('罐装高',[summaryRow('3','大罐装',150,1,2,3,0,1)])
 ],{date:'2026-09-28'});
 assert.deepEqual(report.products.map(p=>p.packaging),['罐装','罐装','瓶装']);
 assert.equal(report.products[0].id,'3');assert.ok(report.warnings.some(w=>w.includes('80%')));
});

test('退款率缺少总成交订单分母时保持不可计算，零订单时按0处理',()=>{
 const missing=summaryFile('缺列',[summaryRow()]);missing.rows[0]=summaryHeaders.slice(0,-1);
 missing.rows[1]=summaryRow().slice(0,-1);
 const report=summarizeProducts([missing],{date:'2026-09-28'});
 assert.equal(report.products[0].refundRate,null);assert.ok(report.warnings.some(w=>w.includes('退款率')&&w.includes('总成交订单')));
 const noOrders=summarizeProducts([summaryFile('零订单',[summaryRow('0','零成本商品',0,0,0,0,0,0)])],{date:'2026-09-28'});
 assert.equal(noOrders.products[0].roi,null);assert.equal(noOrders.products[0].refundRate,0);
});
