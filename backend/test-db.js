const net = require('net');

const HOST = 'aws-0-ap-northeast-2.pooler.supabase.com';

function testPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      console.log(`SUCCESS: Connected to ${HOST} on port ${port}`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`TIMEOUT: Could not connect to ${HOST} on port ${port}`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`ERROR: Failed on port ${port} - ${err.message}`);
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, HOST);
  });
}

async function run() {
  console.log(`Testing network connectivity to Supabase...`);
  await testPort(443);
  await testPort(5432);
  await testPort(6543);
}

run();
