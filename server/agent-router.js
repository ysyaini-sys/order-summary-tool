function routeTask(input = '') {
  const text = String(input).toLowerCase();
  if (/商品详情|详情页|product detail/.test(text)) return 'product-detail';
  if (/千川|投放|消耗|roi/.test(text)) return 'qianchuan-analysis';
  if (/订单|order/.test(text)) return 'order-summary';
  return 'general';
}

module.exports = { routeTask };
