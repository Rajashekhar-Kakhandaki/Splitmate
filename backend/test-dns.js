const dns = require('dns');

dns.resolve4('aws-0-ap-northeast-2.pooler.supabase.com', (err, addresses) => {
  console.log('IPv4:', addresses, err ? err.message : '');
});

dns.resolve6('aws-0-ap-northeast-2.pooler.supabase.com', (err, addresses) => {
  console.log('IPv6:', addresses, err ? err.message : '');
});
