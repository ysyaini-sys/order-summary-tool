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
  root.Qianchuan={analyze,number,date};
  if (typeof module!=='undefined') module.exports=root.Qianchuan;
})(typeof globalThis!=='undefined'?globalThis:this);
