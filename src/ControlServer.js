const TorPool = require('./TorPool');
const SOCKSServer = require('./SOCKSServer');
const DNSServer = require('./DNSServer');
const HTTPServer = require('./HTTPServer');
const rpc = require('jrpc2');

class ControlServer {
	constructor(logger) {
		this.torPool = this.torPool = new TorPool(null, null, logger);
		this.logger = logger;

		let server = this.server = new rpc.Server();
		server.expose('createTorPool', this.createTorPool.bind(this));
		server.expose('createSOCKSServer', this.createSOCKSServer.bind(this));
		server.expose('createDNSServer', this.createDNSServer.bind(this));
		server.expose('createHTTPServer', this.createHTTPServer.bind(this));

		server.expose('queryInstances', (function () {
			return new Promise((resolve, reject) => {
				if (!this.torPool)
					return reject({ message: 'No pool created' });

				resolve(this.torPool.instances.map((i) => ( { dns_port: i.dns_port, socks_port: i.socks_port, process_id: i.process.pid } )) );		
			});
		}).bind(this));

		server.expose('createInstances', (function (instances) {
			return new Promise((resolve, reject) => {
				this.torPool.create(instances, (error, instances) => {
					if (error) reject(error);
					else resolve();
				}); 
			});
		}).bind(this) );

		server.expose('removeInstances', (function (instances) {
			return new Promise((resolve, reject) => {
				this.torPool.remove(instances, (error) => {
					if (error) reject(error);
					else resolve();
				}); 
			});
		}).bind(this) );

		server.expose('newIps', (function() {
			this.torPool.new_ips();
			return Promise.resolve();
		}).bind(this) );

		server.expose('nextInstance', (function () {
			this.torPool.next();
			return Promise.resolve();
		}).bind(this) );

		server.expose('closeInstances', (function ()  {
			this.torPool.exit();
			return Promise.resolve();
		}).bind(this) );

	}

	listen(port, callback) {  
		this.tcpTransport = new rpc.tcpTransport({ port });
		this.tcpTransport.listen(this.server);
		callback();
	}

	close() { 
		return this.tcpTransport.tcpServer.close();
	}

	createTorPool(options) {
		this.torPool = new TorPool(null, options, this.logger);
		this.torPool;
		return Promise.resolve();
	}

	createSOCKSServer(port) {
		this.socksServer = new SOCKSServer(this.torPool, this.logger);
		this.socksServer.listen(port || 9050);
		this.logger && this.logger.info(`[socks]: Listening on ${port}`);
		this.socksServer;
		return Promise.resolve();
	}

	createHTTPServer(port) {
		this.httpServer = new HTTPServer(this.torPool, this.logger);
		this.httpServer.listen(port || 9080);
		this.logger && this.logger.info(`[http]: Listening on ${port}`);
		this.httpServer;
		return Promise.resolve();
	}

	createDNSServer(port) {
		this.dnsServer = new DNSServer(this.torPool, this.logger);
		this.dnsServer.serve(port || 9053);
		this.logger && this.logger.info(`[dns]: Listening on ${port}`);
		this.dnsServer;
		return Promise.resolve();
	}
};

module.exports = ControlServer;
