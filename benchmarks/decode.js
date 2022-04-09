const notepack = require('../');
const msgpackJs = require('msgpack-js');
const msgpackLite = require('msgpack-lite');
const ymsgpack = require('@ygoe/msgpack');
const msgpack = require('@msgpack/msgpack');
const data = require('./data');

const Benchtable = require('benchtable');

const suite = new Benchtable;

suite
	.addFunction('msgpack-x', (m, js, node, json) => { notepack.decode(m); })
	.addFunction('msgpack-js', (m, js, node, json) => { msgpackJs.decode(js); })
	.addFunction('msgpack-lite', (m, js, node, json) => { msgpackLite.decode(m); })
	.addFunction('@ygoe/msgpack', (m, js, node, json) => { ymsgpack.decode(m); })
	.addFunction('@msgpack/msgpack', (m, js, node, json) => { msgpack.decode(m); })
	// Note: JSON encodes buffers as arrays
	.addFunction('JSON.parse (from Buffer)', (m, js, node, json) => { JSON.parse(json.toString()); })

	.addInput('tiny', [notepack.encode(data.tiny), msgpackJs.encode(data.tiny), msgpackLite.encode(data.tiny), Buffer.from(JSON.stringify(data.tiny))])
	.addInput('small', [notepack.encode(data.small), msgpackJs.encode(data.small), msgpackLite.encode(data.small), Buffer.from(JSON.stringify(data.small))])
	.addInput('medium', [notepack.encode(data.medium), msgpackJs.encode(data.medium), msgpackLite.encode(data.medium), Buffer.from(JSON.stringify(data.medium))])
	.addInput('large', [notepack.encode(data.large), msgpackJs.encode(data.large), msgpackLite.encode(data.large), Buffer.from(JSON.stringify(data.large))])

	.on('complete', function () {
		console.log(this.table.toString());
	})
	.run({ async: true });
