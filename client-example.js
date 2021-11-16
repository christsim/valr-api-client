const {ValrV1RestClient, ValrV1WsClient} = require('./index.js')
const util = require('util')

// N.B. keep these safe.  don't commit to source control etc...
const apiKey = process.env.VALR_API_KEY;         //'<your-api-key>',
const apiSecret = process.env.VALR_API_SECRET;   //'<your-api-secret>',

var valrClient = new ValrV1RestClient({
    apiKey,
    apiSecret
})
valrClient.account.getBalances().then((balance) => console.log(balance))

// account
const valrWsAccountClient = new ValrV1WsClient(ValrV1WsClient.WSPATHS.ACCOUNT, {apiKey, apiSecret})
valrWsAccountClient.connect();
valrWsAccountClient.on('connected', () => console.log('ACCOUNT:', 'connected'));
valrWsAccountClient.on('message', (data) => console.log('ACCOUNT:', data));
valrWsAccountClient.on('error', (err) => console.log('ACCOUNT:', err));
valrWsAccountClient.on('close', (code, reason) => console.log('ACCOUNT:', code, reason));
valrWsAccountClient.on('disconnected', () => console.log('ACCOUNT:', 'disconnected'));

//trade
const valrWsTradeClient = new ValrV1WsClient(ValrV1WsClient.WSPATHS.TRADE, {apiKey, apiSecret})
valrWsTradeClient.connect();

valrWsTradeClient.on('connected', () => console.log('TRADE:', 'connected'));
valrWsTradeClient.on('message', (data) => {
    console.log('TRADE:', util.inspect(data, {depth: 99, colors: true}));
    if (data.type === 'AUTHENTICATED') {
        valrWsTradeClient.subscribe(ValrV1WsClient.TRADE_SUBSCRIPTIONS.AGGREGATED_ORDERBOOK_UPDATE, 'BTCZAR');
    }
});
valrWsTradeClient.on('error', (err) => console.log('TRADE:', err));
valrWsTradeClient.on('close', (code, reason) => console.log('TRADE:', code, reason));
valrWsTradeClient.on('disconnected', () => console.log('TRADE:', 'disconnected'));

