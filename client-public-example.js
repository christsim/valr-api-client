const { ValrV1RestClient, ValrV1WsClient } = require('./index.js')
const util = require('util')


const valrClient = new ValrV1RestClient()
valrClient.public.getOrderBook('btczar').then((orderbook) => console.log(orderbook))


//trade ws
const valrWsTradeClient = new ValrV1WsClient('/ws/trade');
valrWsTradeClient.connect();

valrWsTradeClient.on('connected', () => {
    console.log('TRADE:', 'connected');
    valrWsTradeClient.subscribe(ValrV1WsClient.TRADE_SUBSCRIPTIONS.AGGREGATED_ORDERBOOK_UPDATE, 'BTCZAR');
});
valrWsTradeClient.on('message', (data) => {
    console.log('TRADE:', util.inspect(data, { depth: 99, colors: true }));
});
valrWsTradeClient.on('error', (err) => console.log('TRADE:', err));
valrWsTradeClient.on('close', (code, reason) => console.log('TRADE:', code, reason));
valrWsTradeClient.on('disconnected', () => console.log('TRADE:', 'disconnected'));
