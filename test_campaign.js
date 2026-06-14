const axios = require('axios');
const { io } = require('socket.io-client');

async function test() {
  // 1. Create a campaign
  const res = await axios.post('http://localhost:5000/api/campaigns', {
    name: 'Test Campaign',
    segmentQuery: {
      sql: `SELECT id, name, email, city FROM customers LIMIT 100`,
      params: [],
      segmentName: 'Test'
    },
    messageTemplate: 'Hello {name}',
    channels: ['SMS']
  });

  const campaignId = res.data.data.campaignId;
  console.log('Created campaign:', campaignId);

  // 2. Connect socket
  const socket = io('http://localhost:5000');
  socket.emit('join-campaign', campaignId);

  socket.on('metrics-update', (metrics) => {
    console.log('Update:', JSON.stringify(metrics));
  });

  // wait 15 seconds
  await new Promise(r => setTimeout(r, 15000));
  socket.disconnect();
}

test();
