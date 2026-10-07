/* Browser-local parser; also exported for dependency-free Node tests. */
(function(root) {
  'use strict';
  const pattern = /^(.+?)_(\d{4}-\d{2}-\d{2})(?:至\d{4}-\d{2}-\d{2})?_乘方-商品-(商品数据明细|素材-视频)\.xlsx$/i;
  const text = v => String(v ?? '').trim();
  function number(v) {
    const s = text(v).replace(/,/g, '');
    return s && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s) && Number.isFinite(Number(s)) ? Number(s) : null;
  }
  function date(v) {
    const s = text(v);
    if (/^\d+(?:\.\d+)?$/.test(s) && +s > 40000 && +s < 80000)
      return new Date(Date.UTC(1899,11,30) + Math.floor(+s)*86400000).toISOString().slice(0,10);
    const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?: \d{2}:\d{2}:\d{2})?$/);
    if (!m) return '';
    const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
    return d.getUTCFullYear()===+m[1] && d.getUTCMonth()===+m[2]-1 && d.getUTCDate()===+m[3] ? d.toISOString().slice(0,10) : '';
  }
  function analyze(files) {
    const report = {generatedAt:new Date().toLocaleString('zh-CN'), inputFolder:'浏览器选择的本地文件', fileCount:0, productCount:0, videoCount:0, ignoredAll:0, ignoredRows:0, warnings:[], records:[]};
    const map = new Map();
    for (const file of [...files].sort((a,b)=>(a.lastModified||0)-(b.lastModified||0)||a.name.localeCompare(b.name,'zh-CN'))) {
      const m = file.name.match(pattern);
      if (!m) {report.warnings.push(`文件名不符合乘方导出格式，已跳过：${file.name}`);continue;}
      if (file.error) {report.warnings.push(`无法读取 ${file.name}：${file.error}`);continue;}
      const rows = file.rows || [];
      if (rows.length<2) {report.warnings.push(`没有明细行：${file.name}`);continue;}
      const kind = m[3]==='商品数据明细'?'product':'video';
      const idCol = kind==='product'?'商品ID':'素材ID', nameCol=kind==='product'?'商品名称':'素材视频名称';
      const headers = rows[0].map(text);
      // 兼容列名：优先"整体消耗"，回退"综合成本"
      const costCol = headers.includes('整体消耗') ? '整体消耗' : (headers.includes('综合成本') ? '综合成本' : null);
      const roiCol = headers.includes('整体消耗ROI') ? '整体消耗ROI' : (headers.includes('综合营销ROI') ? '综合营销ROI' : null);
      const missing = ['日期','净成交金额',idCol,nameCol].filter(h=>!headers.includes(h));
      if (!costCol) missing.push('整体消耗');
      if (!roiCol) missing.push('ROI');
      if (missing.length) {report.warnings.push(`字段不完整：${file.name}；缺少 ${missing.join('、')}`);continue;}
      report.fileCount++;
      for (const row of rows.slice(1)) {
        const get = h => row[headers.indexOf(h)];
        if (text(get('日期'))==='全部') {report.ignoredAll++;continue;}
        const day=date(get('日期')), rawId=get(idCol), id=text(rawId);
        if (!day || !id) {report.ignoredRows++;continue;}
        if (typeof rawId==='number' && !Number.isSafeInteger(rawId)) {report.warnings.push(`ID 超出数字精度，已跳过；请将源 ID 保存为文本：${file.name} / ${day}`);report.ignoredRows++;continue;}
        const cost=number(get(costCol)), sales=number(get('净成交金额'));
        if (cost===null || sales===null) {
          report.warnings.push(`金额缺失：${file.name} / ${day} / ${id}；${kind==='product'?'商品行已排除':'素材相关指标不可用'}`);
          if (kind==='product') {report.ignoredRows++;continue;}
        }
        const record={kind,account:m[1],date:day,id,name:text(get(nameCol)),created:kind==='video'?text(get('素材创建时间')):'',cost,sales,sourceRoi:number(get(roiCol)),source:file.name};
        const key=JSON.stringify([kind,m[1],day,id]), old=map.get(key);
        if (old && (old.cost!==cost || old.sales!==sales)) report.warnings.push(`重复数据数值不同，采用较新文件（修改时间相同则按文件名及行顺序）：${m[1]} / ${day} / ${id}`);
        map.set(key,record);
      }
    }
    report.records=[...map.values()].sort((a,b)=>a.kind.localeCompare(b.kind)||a.account.localeCompare(b.account,'zh-CN')||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
    report.productCount=report.records.filter(r=>r.kind==='product').length;
    report.videoCount=report.records.length-report.productCount;
    if (!report.records.length) report.warnings.push('没有可用的日期明细行；请检查文件名、字段和日期。');
    return report;
  }

  function summarizeProducts(files, options={}) {
    const report={generatedAt:new Date().toLocaleString('zh-CN'),fileCount:0,recordCount:0,productCount:0,ignoredAll:0,totalCost:0,products:[],warnings:[],aborted:false,previousDayComparison:null};
    const records=[];
    let missingOrderColumn=false;
    let missingOrderValue=false;
    const aliases={
      date:['日期'],id:['商品ID'],name:['商品名称'],cost:['整体消耗'],netSales:['净成交金额'],grossSales:['整体成交金额'],combinedCost:['综合成本'],refundOrders:['1小时内退款订单数','1小时内退款订单','一小时内退款订单数'],
      orders:['整体成交订单数','整体成交订单','整体成交订单量','成交订单数','成交订单量','成交订单','支付订单数','支付订单量','支付订单']
    };
    const findColumn=(headers,names)=>headers.findIndex(header=>names.includes(header));
    const from=options.from||'';
    const to=options.to||'';
    const exact=options.date||'';

    for(const file of files){
      const filename=String(file.name||'');
      const match=filename.match(pattern);
      if(!match||match[3]!=='商品数据明细') continue;
      if(file.error){report.warnings.push(`无法读取 ${filename}：${file.error}`);continue;}
      const rows=file.rows||[];
      if(rows.length<2){report.warnings.push(`没有明细行：${filename}`);continue;}
      const headers=rows[0].map(text);
      const columns=Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,findColumn(headers,names)]));
      const required=['date','id','name','cost','netSales','grossSales','combinedCost','refundOrders'];
      const missing=required.filter(key=>columns[key]<0).map(key=>aliases[key][0]);
      if(missing.length){report.warnings.push(`字段不完整：${filename}；缺少 ${missing.join('、')}`);continue;}

      const dataRows=rows.slice(1).filter(row=>text(row[columns.date])!=='全部');
      report.ignoredAll+=rows.length-1-dataRows.length;
      report.fileCount++;
      const seen=new Set();
      for(const row of dataRows){
        const id=text(row[columns.id]);
        if(!id) continue;
        if(seen.has(id)){
          report.aborted=true;
          report.warnings.push(`单文件内商品ID重复，汇总已终止，请核对源文件：${filename} / ${id}`);
          report.products=[];report.productCount=0;report.recordCount=0;report.totalCost=0;
          return report;
        }
        seen.add(id);
      }

      if(columns.orders<0){
        missingOrderColumn=true;
        report.warnings.push(`缺少总成交订单字段，无法重算1小时内退款率：${filename}`);
      }
      for(const row of dataRows){
        const day=date(row[columns.date]);
        const id=text(row[columns.id]);
        if(!day||!id){report.warnings.push(`日期或商品ID无效，已跳过：${filename}`);continue;}
        const values={
          cost:number(row[columns.cost]),netSales:number(row[columns.netSales]),grossSales:number(row[columns.grossSales]),
          combinedCost:number(row[columns.combinedCost]),refundOrders:number(row[columns.refundOrders]),orders:columns.orders<0?null:number(row[columns.orders])
        };
        if(values.orders===null&&columns.orders>=0){missingOrderValue=true;report.warnings.push(`总成交订单数缺失，相关商品退款率无法计算：${filename} / ${id}`);}
        const invalid=Object.entries(values).filter(([key,value])=>key!=='orders'&&value===null).map(([key])=>key);
        if(invalid.length){report.warnings.push(`指标缺失，已跳过：${filename} / ${id}`);continue;}
        const record={id,name:text(row[columns.name]),date:day,account:match[1],source:filename,...values};
        records.push(record);
      }
    }

    const selected=records.filter(record=>(!exact||record.date===exact)&&(!from||record.date>=from)&&(!to||record.date<=to));
    report.recordCount=selected.length;
    const grouped=new Map();
    for(const record of selected){
      const key=JSON.stringify([record.id,record.name]);
      const product=grouped.get(key)||{id:record.id,name:record.name,cost:0,netSales:0,grossSales:0,refundOrders:0,combinedCost:0,orders:0};
      product.cost+=record.cost;product.netSales+=record.netSales;product.grossSales+=record.grossSales;
      product.refundOrders+=record.refundOrders;product.combinedCost+=record.combinedCost;
      if(record.orders!==null) product.orders+=record.orders;
      grouped.set(key,product);
    }
    report.products=[...grouped.values()].map(product=>({
      ...product,
      packaging:/320\s*ml\s*[x×*]\s*6\s*瓶装/i.test(product.name)?'瓶装':'罐装',
      roi:product.cost>0?product.netSales/product.cost:null,
      refundRate:missingOrderColumn||missingOrderValue?null:(product.orders>0?product.refundOrders/product.orders:0)
    })).sort((a,b)=>((a.packaging==='罐装'?0:1)-(b.packaging==='罐装'?0:1))||b.cost-a.cost||a.id.localeCompare(b.id,'zh-CN'));
    report.productCount=report.products.length;
    report.totalCost=report.products.reduce((sum,product)=>sum+product.cost,0);
    if(report.totalCost===0) report.warnings.push('汇总总消耗为0，请检查数据。');
    if(report.totalCost>0){
      for(const product of report.products) if(product.cost/report.totalCost>0.8) report.warnings.push(`商品消耗占总消耗超过80%：${product.name||product.id}`);
    }
    if(exact){
      const target=new Date(`${exact}T00:00:00Z`);
      if(!Number.isNaN(target.getTime())){
        target.setUTCDate(target.getUTCDate()-1);
        const previousDate=target.toISOString().slice(0,10);
        const previousTotal=records.filter(record=>record.date===previousDate).reduce((sum,record)=>sum+record.cost,0);
        if(previousTotal>0){
          const change=(report.totalCost-previousTotal)/previousTotal;
          report.previousDayComparison={date:previousDate,totalCost:previousTotal,change};
          if(Math.abs(change)>0.5) report.warnings.push(`总消耗较前一日波动超过50%：${(change*100).toFixed(1)}%`);
        }
      }
    }
    return report;
  }

  function productSummaryRows(summary) {
    const rows=[['包装','商品ID','商品名称','整体消耗','净成交金额','整体成交金额','1小时内退款订单数','综合成本','综合营销ROI','1小时内退款率']];
    for(const product of summary.products||[]) rows.push([
      product.packaging,product.id,product.name,product.cost,product.netSales,product.grossSales,
      product.refundOrders,product.combinedCost,product.roi===null?'—':product.roi,
      product.refundRate===null?'—':product.refundRate
    ]);
    return rows;
  }

  function buildAiSummary(records, {date: selectedDate='all', account='all', query=''} = {}) {
    const search = String(query).trim().toLocaleLowerCase();
    const products = (records || []).filter(record => record.kind === 'product'
      && (selectedDate === 'all' || record.date === selectedDate)
      && (account === 'all' || record.account === account)
      && (!search || `${record.name} ${record.id} ${record.account}`.toLocaleLowerCase().includes(search)));
    const total = products.reduce((sum, record) => ({
      cost: sum.cost + (Number(record.cost) || 0),
      sales: sum.sales + (Number(record.sales) || 0)
    }), {cost:0,sales:0});
    const accountTotals = new Map();
    for (const record of products) {
      const value = accountTotals.get(record.account) || {productRows:0,cost:0,sales:0};
      value.productRows++;
      value.cost += Number(record.cost) || 0;
      value.sales += Number(record.sales) || 0;
      accountTotals.set(record.account,value);
    }
    const accounts = [...accountTotals.values()].sort((a,b)=>b.cost-a.cost).map((value,index)=>({
      label:`账户 ${index+1}`,
      productRows:value.productRows,
      cost:value.cost,
      sales:value.sales,
      roi:value.cost>0?value.sales/value.cost:null
    }));
    return {
      selection:{date:selectedDate,account:account==='all'?'all':'single-account',searchApplied:Boolean(search)},
      totals:{productRows:products.length,uniqueProducts:new Set(products.map(record=>record.id)).size,cost:total.cost,sales:total.sales,roi:total.cost>0?total.sales/total.cost:null},
      accounts
    };
  }

  root.Qianchuan={analyze,buildAiSummary,number,date,summarizeProducts,productSummaryRows};
  if (typeof module!=='undefined') module.exports=root.Qianchuan;
})(typeof globalThis!=='undefined'?globalThis:this);
