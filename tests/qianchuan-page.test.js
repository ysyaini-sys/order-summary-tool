const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../qianchuan.html'),'utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
const renderer=scripts.find(m=>m[2].includes('function renderReport()'))[2];
function render(records, extra={}) {
 const nodes={};
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]={textContent:'',innerHTML:'',value:''};
 nodes['report-data'].textContent=JSON.stringify({records,warnings:['<unsafe>'],ignoredRows:2,...extra});
 const context={document:{getElementById:id=>nodes[id],querySelectorAll:()=>[]}};
 vm.runInNewContext(renderer,context);
 return nodes;
}
const record={kind:'product',account:'账户',id:'123',date:'2026-09-22',name:'<img src=x onerror=alert(1)>',cost:100,sales:250};
test('千川 AI 解读只使用当前筛选的脱敏汇总，且不进入离线导出报告',()=>{
 assert.match(html,/id="explain-qianchuan-ai"/);
 assert.match(html,/id="qianchuan-ai-output"/);
 assert.match(html,/Qianchuan\.buildAiSummary\(records/);
 assert.match(html,/project:\{reportType:'qianchuan-summary',summary\}/);
 assert.match(html,/doc\.querySelector\('#qianchuan-ai-panel'\)\?\.remove\(\)/);
 assert.match(html,/不发送商品名、ID、账户名或原始明细/);
});
test('报告商品总额排除视频；用户输入转义；筛选重新汇总',()=>{
 const nodes=render([record,{...record,kind:'video',cost:999,sales:999}]);
 assert.equal(nodes['kpi-cost'].textContent,'100.00');assert.equal(nodes['kpi-roi'].textContent,'2.50');
 assert.ok(nodes['product-table'].innerHTML.includes('&lt;img'));assert.ok(!nodes['product-table'].innerHTML.includes('<img'));
 assert.ok(nodes.warnings.innerHTML.includes('&lt;unsafe&gt;'));
 nodes['search-filter'].oninput({target:{value:'不存在'}});assert.equal(nodes['kpi-cost'].textContent,'0.00');
 nodes['search-filter'].oninput({target:{value:'123'}});assert.equal(nodes['kpi-cost'].textContent,'100.00');
 nodes['account-filter'].onchange({target:{value:'其他账户'}});assert.equal(nodes['kpi-roi'].textContent,'—');
});

test('商品汇总页显示质量统计、缺失分母提示和重算后的比率',()=>{
 const summary={fileCount:5,recordCount:23,productCount:12,totalCost:19544.48,products:[{packaging:'罐装',id:'123',name:'测试商品',cost:100,netSales:250,grossSales:300,refundOrders:1,combinedCost:110,roi:2.5,refundRate:0.1}],warnings:['缺少总成交订单字段，无法重算1小时内退款率：账户.xlsx']};
 const nodes=render([],{productSummary:summary});
 assert.equal(nodes['summary-files'].textContent,5);assert.equal(nodes['summary-records'].textContent,23);assert.equal(nodes['summary-products'].textContent,12);
 assert.ok(nodes['summary-table'].innerHTML.includes('2.50'));assert.ok(nodes['summary-table'].innerHTML.includes('10.00%'));
 assert.ok(nodes['summary-warnings'].innerHTML.includes('缺少总成交订单字段'));
});
test('无数据、零成本、缺失素材金额不会显示虚构 ROI',()=>{
 assert.equal(render([])['kpi-roi'].textContent,'—');
 assert.equal(render([{...record,cost:0}])['kpi-roi'].textContent,'—');
 const nodes=render([{...record,kind:'video',cost:null}]);
 assert.ok(nodes['video-table'].innerHTML.includes('—'));assert.ok(nodes['video-top'].innerHTML.includes('—'));
});
test('所有内联脚本语法有效；导出数据转义可逆且阻止 script 结束标签',()=>{
 for(const m of scripts)if(!m[1].includes('application/json'))new vm.Script(m[2]);
 const source=scripts.find(m=>m[2].includes('doc.querySelector'))[2];
 const expression=source.split("doc.querySelector('#report-data').textContent=")[1].split(';')[0];
 const current={name:'</script><script>alert(1)</script>&'};
 const escaped=vm.runInNewContext(expression,{current});
 assert.ok(!escaped.includes('<'));assert.deepEqual(JSON.parse(escaped),current);
});
