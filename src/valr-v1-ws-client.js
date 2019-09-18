const signer = require('./valr-v1-signer.js');

const WebSocket = require('ws')
const EventEmitter = require('events')

class ValrV1WsClient extends EventEmitter {

    /**
     * 
     * @param {*} apiKey - the api key
     * @param {*} apiSecret - the api secret
     * @param {*} path - path to connect to, from ValrV1WsClient.WSPATHS
     * @param {*} baseUrl - web socket base url
     * @param {*} reconnectIntervalSeconds - delay between reconnects
     */
    constructor(apiKey, apiSecret, path, baseUrl = null, reconnectIntervalSeconds = 10) {
        super();

        this.baseUrl = baseUrl || 'wss://api.valr.com';
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.path = path;
        this.reconnectInterval = reconnectIntervalSeconds * 1000;
        this.pingInterval = 30 * 1000;
    }

    /**
     * connect to the web socket
     */
    connect() {
        this.disconnect();

        this.disconnected = false;
        this._connect(this.path);
    }

    disconnect() {
        this.disconnected = true;
        if (this.ws != null) {
            this.ws.close();
            this.ws = null;
            this.emit('close');
        }
    }

    /**
     * subscribe to a web socket event
     * @param {*} event 
     * @param {*} pairs 
     */
    subscribe(event, pairs) {
        if (!Array.isArray(pairs)) {
            pairs = [pairs];
        }
        this.ws.send(JSON.stringify({
            type: "SUBSCRIBE",
            subscriptions: [
                {
                    event,
                    pairs
                }
            ]
        }));
    }

    _connect(path) {
        // don't reconnect if disconnect() was called
        if (this.disconnected) {
            return;
        }

        var headers = this._authProvider(path)
        this.ws = new WebSocket(`${this.baseUrl}${path}`, {
            headers,
        });

        this.ws.on('open', () => {
            this.emit('connected');
            this._schedulePing();
        });
        this.ws.on('message', (data) => {
            data = JSON.parse(data);
            if (data.type == 'PONG') {
                this._schedulePing();
            }
            this.emit('message', data);
        })
        this.ws.on('error', (err => {
            this.emit('ws error', err);
        }))
        this.ws.on('close', (code, reason) => {
            console.log('ws close, reconnecting...', code, reason);
            this.emit('close', code, reason);

            if (!this.reconnectInterval > 0) {
                setTimeout(() => this._connect(path), this.reconnectInterval);
            }
        });
    };

    _authProvider(path) {
        var headers = new Object()
        var timestamp = (new Date()).getTime();
        var signature = signer.signRequest(this.apiSecret, timestamp, 'GET', path, '');

        headers['X-VALR-API-KEY'] = this.apiKey;
        headers["X-VALR-SIGNATURE"] = signature;
        headers['X-VALR-TIMESTAMP'] = timestamp;

        return headers
    }

    /**
     * keep the connection alive
     */
    _schedulePing() {
        setTimeout(() => {
            if (!this.disconnected) {
                this.ws.send(JSON.stringify({ type: 'PING' }))
            }
        }, this.pingInterval)
    }
}

ValrV1WsClient.WSPATHS = {
    ACCOUNT: '/ws/account',
    TRADE: '/ws/trade'
};

ValrV1WsClient.TRADE_SUBSCRIPTIONS = {
    AGGREGATED_ORDERBOOK_UPDATE: 'AGGREGATED_ORDERBOOK_UPDATE',
    MARKET_SUMMARY_UPDATE: 'MARKET_SUMMARY_UPDATE',
    NEW_TRADE_BUCKET: 'NEW_TRADE_BUCKET',
    NEW_TRADE: 'NEW_TRADE'
}

module.exports = ValrV1WsClient;