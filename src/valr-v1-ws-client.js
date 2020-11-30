const signer = require('./valr-v1-signer.js');

const WebSocket = require('ws')
const EventEmitter = require('events')

class ValrV1WsClient extends EventEmitter {

    /**
     * @param {*} path - path to connect to, from ValrV1WsClient.WSPATHS
     */
    constructor(path, options = {}) {

        const { baseUrl = 'wss://api.valr.com', apiKey, apiSecret, reconnectIntervalSeconds = 10, forceReconnectSeconds = 0 } = options;

        super();

        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.path = path;
        this.reconnectInterval = reconnectIntervalSeconds * 1000;
        this.pingIntervalSeconds = 30 * 1000;
        this.forceReconnectSeconds = forceReconnectSeconds * 1000;
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

        console.log(`WS Connecting to ${path}`);

        const headers = this._authProvider(path)
        this.ws = new WebSocket(`${this.baseUrl}${path}`, {
            headers,
        });

        // force a reconnect every so often
        if (this.forceReconnectSeconds > 0) {
            setTimeout(() => this.ws.close(1000, 'force reconnect'), this.forceReconnectSeconds);
        }

        this.ws.on('open', () => {
            this.emit('connected');
            this.open = true;
            this._schedulePing();
        });
        this.ws.on('message', (data) => {
            data = JSON.parse(data);
            if (data.type == 'PONG') {
                this._schedulePing();
            }
            this.emit('message', data);
        });
        this.ws.on('error', (err => {
            this.emit('ws error', err);
            this.ws.close(1000, err);
        }));
        this.ws.on('close', (code, reason) => {
            console.log('ws close', code, reason);
            this.open = false;
            this.emit('close', code, reason);

            if (code == 1000 && reason == 'force reconnect') {
                setTimeout(() => this._connect(path), 0);
            } else if (this.reconnectInterval > 0) {
                setTimeout(() => this._connect(path), this.reconnectInterval);
            }
        });
    };

    _authProvider(path) {
        if(this.apiKey && this.apiSecret) {
            const headers = new Object()
            const timestamp = (new Date()).getTime();
            const signature = signer.signRequest(this.apiSecret, timestamp, 'GET', path, '');

            headers['X-VALR-API-KEY'] = this.apiKey;
            headers["X-VALR-SIGNATURE"] = signature;
            headers['X-VALR-TIMESTAMP'] = timestamp;
            return headers
        } else {
            return {};
        }
    }

    /**
     * keep the connection alive
     */
    _schedulePing() {
        if (this.open) {
            setTimeout(() => {
                try {
                    if (this.open && !this.disconnected) {
                        this.ws.send(JSON.stringify({ type: 'PING' }))
                    }
                } catch(err) {
                    console.log('unable to send ping', err);
                }
            }, this.pingIntervalSeconds)
        };
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
