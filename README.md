# valr-api-client
VALR Api REST and web-socket client

See [VALR API documentation](https://docs.valr.com) 

***valr-api-client*** is a node.js client for calling the VALR(https://www.valr.com) REST and WebSocket API.

# Examples

e.g.  To call a rest end-point
```js
const { ValrV1RestClient, ValrV1WsClient } = require('valr-api-client')

// N.B. keep these safe.  don't commit to source control etc...
var apiKey = '<your-api-key>',
var apiSecret = '<your-api-secret>',

const  valrClient = new ValrV1RestClient(apiKey.baseUrl, apiKey.apiKey, apiKey.apiSecret)
valrClient
    .account
    .getBalances()
        .then((balance) => console.log(balance))
```

e.g. To subscribe to the trade web socket events
```js
var valrWsTradeClient = new ValrV1WsClient(apiKey.wsUrl, apiKey.apiKey, apiKey.apiSecret, ValrV1WsClient.WSPATHS.TRADE)
valrWsTradeClient.connect();

valrWsTradeClient.on('connected', () => console.log('TRADE:', 'connected'));

valrWsTradeClient.on('message', (data) => {
    console.log('TRADE:', util.inspect(data, { depth: 99, colors: true }));
    if (data.type == 'AUTHENTICATED') {
        valrWsTradeClient.subscribe(ValrV1WsClient.TRADE_SUBSCRIPTIONS.AGGREGATED_ORDERBOOK_UPDATE, 'BTCZAR');
    }
});

valrWsTradeClient.on('error', (err) => console.log('TRADE:', err));
valrWsTradeClient.on('close', (code, reason) => console.log('TRADE:', code, reason));
valrWsTradeClient.on('disconnected', () => console.log('TRADE:', 'disconnected'));

```