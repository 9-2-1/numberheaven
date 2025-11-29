import http from 'http';

// Test invalid APPID
const postData1 = '0.64';
const options1 = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/post_update?name=loadavg&color=%2366ccff&order=1',
  method: 'POST',
  headers: {
    APPID: 'invalid',
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(postData1),
  },
};

const req1 = http.request(options1, res => {
  console.log(`Invalid APPID test - Status: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req1.on('error', e => {
  console.error(`Problem with request: ${e.message}`);
});

req1.write(postData1);
req1.end();

// Test valid APPID
setTimeout(() => {
  const postData2 = '0.64';
  const options2 = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/post_update?name=loadavg&color=%2366ccff&order=1',
    method: 'POST',
    headers: {
      APPID: 'poshiabby283951992abby',
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(postData2),
    },
  };

  const req2 = http.request(options2, res => {
    console.log(`\nValid APPID test - Status: ${res.statusCode}`);
    res.on('data', d => {
      process.stdout.write(d);
    });
  });

  req2.on('error', e => {
    console.error(`Problem with request: ${e.message}`);
  });

  req2.write(postData2);
  req2.end();
}, 1000);
