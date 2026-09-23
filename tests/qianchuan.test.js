const {test}=require('node:test');
const assert=require('node:assert/strict');
const {analyze,date,number}=require('../qianchuan.js');
const headers=['日期','商品ID','商品名称','综合成本','净成交金额','综合营销ROI'];
const row=['2026-09-22','3823309765342266082','测试商品',100,250,2.5];
const file=(rows,extra={})=>({name:'账户_2026-09-22_乘方-商品-商品数据明细.xlsx',lastModified:1,rows:[headers,...rows],...extra});
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
