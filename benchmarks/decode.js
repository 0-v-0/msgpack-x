import { encode, decode } from '../dist/index.js';
import msgpackJs from 'msgpack-js';
import msgpackLite from 'msgpack-lite';
import ymsgpack from '@ygoe/msgpack';
import msgpack from '@msgpack/msgpack';
import { tiny, small, medium, large } from './data.js';

import Benchtable from 'benchtable';

const suite = new Benchtable;

suite
	.addFunction('msgpack-x', (m) => { decode(m); })
	.addFunction('msgpack-js', (m, js, node, json) => { msgpackJs.decode(js); })
	.addFunction('msgpack-lite', (m, js, node) => { msgpackLite.decode(node); })
	.addFunction('@ygoe/msgpack', (m) => { ymsgpack.decode(m); })
	.addFunction('@msgpack/msgpack', (m) => { msgpack.decode(m); })
	// Note: JSON encodes buffers as arrays
	.addFunction('JSON.parse (from Buffer)', (m, js, node, json) => { JSON.parse(json.toString()); })

	.addInput('tiny', [encode(tiny), msgpackJs.encode(tiny), msgpackLite.encode(tiny), Buffer.from(JSON.stringify(tiny))])
	.addInput('small', [encode(small), msgpackJs.encode(small), msgpackLite.encode(small), Buffer.from(JSON.stringify(small))])
	.addInput('medium', [encode(medium), msgpackJs.encode(medium), msgpackLite.encode(medium), Buffer.from(JSON.stringify(medium))])
	.addInput('large', [encode(large), msgpackJs.encode(large), msgpackLite.encode(large), Buffer.from(JSON.stringify(large))])

	.on('complete', function () {
		console.log(this.table.toString());
	})
	.run({ async: true });
