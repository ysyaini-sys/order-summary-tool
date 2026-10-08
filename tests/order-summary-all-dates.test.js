const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function buildDateOptions(');
const end=html.indexOf("['douyin','shipinhao','kuaishou'].forEach(tab=>",start);
const helperSource=html.slice(start,end);

function runHelper(name,args){
  const context={SPECIAL_IDS:['3823309765342266082','10000908591826']};
  const result=vm.runInNewContext(`${helperSource}; ${name}(...${JSON.stringify(args)})`,context);
  return JSON.parse(JSON.stringify(result));
}

test('抖音和视频号日期选项始终包含所有日期且默认最新单日',()=>{
  assert.deepEqual(runHelper('buildDateOptions',[["2026-10-06","2026-10-07"],"2026-10-07"]),[
    {value:'__all_dates__',label:'所有日期',selected:false},
    {value:'2026-10-06',label:'2026-10-06',selected:false},
    {value:'2026-10-07',label:'2026-10-07',selected:true}
  ]);
  assert.deepEqual(runHelper('buildDateOptions',[["2026-10-07"],"2026-10-07"]),[
    {value:'__all_dates__',label:'所有日期',selected:false},
    {value:'2026-10-07',label:'2026-10-07',selected:true}
  ]);
  assert.deepEqual(runHelper('buildDateOptions',[["2026-10-07"],"__all_dates__"]),[
    {value:'__all_dates__',label:'所有日期',selected:true},
    {value:'2026-10-07',label:'2026-10-07',selected:false}
  ]);
});

test('选择所有日期时包含各日期订单，单日选择仍只包含对应日期',()=>{
  assert.equal(runHelper('shouldIncludeOrderDate',['2026-10-06','__all_dates__']),true);
  assert.equal(runHelper('shouldIncludeOrderDate',['2026-10-06','2026-10-06']),true);
  assert.equal(runHelper('shouldIncludeOrderDate',['2026-10-07','2026-10-06']),false);
});

test('所有日期分别合并抖音和视频号各自跨文件的同商品数据',()=>{
  const douyin=runHelper('aggregateAllDateResults',['douyin',[
    {name:'10-06',rows:2,amount:150,flatRows:[
      {id:'sku-1',spec:'规格A',qty:1,actual:2,box:5,amount:'100.00',totalAmount:'150.00'},
      {id:'',spec:'规格B',qty:1,actual:3,box:'',amount:'50.00',totalAmount:''}
    ]},
    {name:'10-07',rows:2,amount:300,flatRows:[
      {id:'sku-1',spec:'规格A',qty:2,actual:4,box:8,amount:'200.00',totalAmount:'300.00'},
      {id:'',spec:'规格B',qty:1,actual:4,box:'',amount:'100.00',totalAmount:''}
    ]}
  ]]);
  assert.deepEqual(douyin,[{name:'所有日期',rows:4,amount:450,flatRows:[
    {id:'sku-1',spec:'规格A',qty:3,actual:6,box:13,amount:'300.00',totalAmount:'450.00'},
    {id:'',spec:'规格B',qty:2,actual:7,box:'',amount:'150.00',totalAmount:''}
  ]}]);

  const shipinhao=runHelper('aggregateAllDateResults',['shipinhao',[
    {name:'10-06',rows:1,amount:100,flatRows:[{id:'sku-2',spec:'规格B',name:'商品B',qty:1,bottleCount:6,multiplier:1,boxCount:2,box:2,amount:'100.00',totalAmount:'100.00'}]},
    {name:'10-07',rows:1,amount:200,flatRows:[{id:'sku-2',spec:'规格B',name:'商品B',qty:2,bottleCount:6,multiplier:1,boxCount:3,box:3,amount:'200.00',totalAmount:'200.00'}]}
  ]]);
  assert.deepEqual(shipinhao,[{name:'所有日期',rows:2,amount:300,flatRows:[{
    id:'sku-2',spec:'规格B',name:'商品B',qty:3,bottleCount:6,multiplier:1,boxCount:5,box:5,amount:'300.00',totalAmount:'300.00'
  }]}]);
});
