import msgpack from "./wasm/msgpack.wasm"

interface MsgpackWasm {
	outbuf: number;
	memory: WebAssembly.Memory;
	put(x: number): void
	packI32(n: number): void
	packI64(n: bigint): void
	packU64(n: bigint): void
	packFP(n: number): void
	beginRaw(size: number): void
	beginStr(size: number): void
	beginArray(size: number): void
	beginMap(size: number): void
	getpos(): number
	move(size: number): number
	flush(): void
}

let result: Uint8Array[] = [],
	exp: MsgpackWasm = new WebAssembly.Instance(new WebAssembly.Module(msgpack), {
		env: {
			output(len: number, ptr: number) {
				result.push(mem.slice(ptr, ptr + len));
			}
		}
	}).exports as any,
	mem = new Uint8Array(exp.memory.buffer),
	encodeStr = (str: string) => {
		let size = str.length,
			result = encoder.encodeInto(str + "", mem.subarray(outbuf, BUFSIZE - exp.getpos()));
		if (result.read == size) {
			beginStr(result.written);
			move(result.written);
			return;
		}
		let buf = encoder.encode(str.substring(result.read));
		beginStr(buf.length);
		flush();
		write(buf);
	}

const
	{ getpos, outbuf, beginStr, flush, move } = exp,
	encoder = new TextEncoder,
	decoder = new TextDecoder("utf-8", { fatal: true }),
	BUFSIZE = 48 << 10,
	write = (buf: Uint8Array) => {
		while (buf.length) {
			const pos = getpos(),
				chunk = Math.min(buf.length, BUFSIZE - pos);
			mem.set(buf.subarray(0, chunk), outbuf + pos);
			move(chunk);
			flush();
			buf = buf.subarray(chunk);
		}
	};

function pack(value: any) {
	const { put, beginArray, beginRaw, packI32, packI64, packU64, packFP, beginMap } = exp;
	switch (typeof value) {
		case 'string':
			encodeStr(value);
			break;
		case 'number':
			if (Math.floor(value) != value || !isFinite(value)) // float point
				packFP(value);
			else if (value == (value | 0))
				packI32(value);
			else
				(value < 2 ** 63 ? packI64 : packU64)(BigInt(value));
			break;
		case 'object':
			if (value === null)
				put(0xc0);
			else if (Array.isArray(value)) {
				beginArray(value.length);
				for (let x of value)
					pack(x);
			} else {
				if (ArrayBuffer.isView(value))
					value = value.buffer;
				if (value instanceof ArrayBuffer) {
					beginRaw(value.byteLength);
					write(new Uint8Array(value));
				} else {
					const keys: string[] = [];
					for (let key in value) {
						if (value[key] !== void 0 && typeof value[key] != 'function')
							keys.push(key);
					}
					beginMap(keys.length);
					for (let key of keys) {
						encodeStr(key);
						pack(value[key]);
					}
				}
			}
			break;
		case 'boolean':
			put(value ? 0xc3 : 0xc2);
			break;
		case 'undefined': // fixext 1 / undefined
			put(0xd4);
			put(0);
			put(0);
			break;
		default:
			throw new Error('Could not encode ' + typeof value);
	}
}

export function encode(...values: any[]) {
	for (const value of values)
		pack(value);
	flush();
	if (result.length == 1)
		return result.pop();

	let offset = 0;
	for (let arr of result)
		offset += arr.length;
	let buf = new Uint8Array(offset);
	offset = 0;
	for (let arr of result) {
		buf.set(arr, offset);
		offset += arr.length;
	}
	result = [];
	return buf;
}

export class Decoder {
	offset: number;
	buffer: Uint8Array;
	view: DataView;
	constructor(buffer: ArrayBuffer) {
		this.offset = 0;
		this.buffer = new Uint8Array(buffer);
		this.view = new DataView(this.buffer.buffer);
	}
	array(length: number) {
		const value = Array(length);
		for (let i = 0; i < length; i++)
			value[i] = this.decode();
		return value;
	}
	map(length: number) {
		let key: string, value = {};
		for (let i = 0; i < length; i++) {
			key = this.decode();
			value[key] = this.decode();
		}
		return value;
	}
	str(length: number) {
		return decoder.decode(this.buffer.subarray(this.offset, this.offset += length));
	}
	bin(length: number) {
		return this.buffer.subarray(this.offset, this.offset += length);
	}
	decode(): any {
		const prefix = this.buffer[this.offset++];
		let value: number, length: number, type: number;

		// positive fixint
		if (prefix < 0x80) {
			return prefix;
		}
		// fixmap
		if (prefix < 0x90) {
			return this.map(prefix & 0x0f);
		}
		// fixarray
		if (prefix < 0xa0) {
			return this.array(prefix & 0x0f);
		}
		// fixstr
		if (prefix < 0xc0) {
			return this.str(prefix & 0x1f);
		}
		// negative fixint
		if (prefix > 0xdf) {
			return -(0xff - prefix + 1);
		}

		switch (prefix) {
			case 0xc0: return null;
			case 0xc2: return false;
			case 0xc3: return true;

			// bin
			case 0xc4:
				length = this.view.getUint8(this.offset);
				this.offset += 1;
				return this.bin(length);
			case 0xc5:
				length = this.view.getUint16(this.offset);
				this.offset += 2;
				return this.bin(length);
			case 0xc6:
				length = this.view.getUint32(this.offset);
				this.offset += 4;
				return this.bin(length);

			// ext
			case 0xc7:
				length = this.view.getUint8(this.offset);
				type = this.view.getInt8(this.offset + 1);
				this.offset += 2;
				return [type, this.bin(length)];
			case 0xc8:
				length = this.view.getUint16(this.offset);
				type = this.view.getInt8(this.offset + 2);
				this.offset += 3;
				return [type, this.bin(length)];
			case 0xc9:
				length = this.view.getUint32(this.offset);
				type = this.view.getInt8(this.offset + 4);
				this.offset += 5;
				return [type, this.bin(length)];

			// float
			case 0xca:
				value = this.view.getFloat32(this.offset);
				this.offset += 4;
				return value;
			case 0xcb:
				value = this.view.getFloat64(this.offset);
				this.offset += 8;
				return value;

			// uint
			case 0xcc:
				value = this.view.getUint8(this.offset);
				this.offset += 1;
				return value;
			case 0xcd:
				value = this.view.getUint16(this.offset);
				this.offset += 2;
				return value;
			case 0xce:
				value = this.view.getUint32(this.offset);
				this.offset += 4;
				return value;
			case 0xcf:
				value = this.view.getUint32(this.offset) * 2 ** 32 + this.view.getUint32(this.offset + 4);
				this.offset += 8;
				return value;

			// int
			case 0xd0:
				value = this.view.getInt8(this.offset);
				this.offset += 1;
				return value;
			case 0xd1:
				value = this.view.getInt16(this.offset);
				this.offset += 2;
				return value;
			case 0xd2:
				value = this.view.getInt32(this.offset);
				this.offset += 4;
				return value;
			case 0xd3:
				value = this.view.getInt32(this.offset) * 2 ** 32 + this.view.getUint32(this.offset + 4);
				this.offset += 8;
				return value;

			// fixext
			case 0xd4:
				type = this.view.getInt8(this.offset++);
				if (type == 0x00) {
					this.offset++;
					return void 0;
				}
				return [type, this.bin(1)];
			case 0xd5: return [this.view.getInt8(this.offset++), this.bin(2)];
			case 0xd6: return [this.view.getInt8(this.offset++), this.bin(4)];
			case 0xd7: return [this.view.getInt8(this.offset++), this.bin(8)];
			case 0xd8: return [this.view.getInt8(this.offset++), this.bin(16)];

			// str
			case 0xd9:
				return this.str(this.view.getUint8(this.offset++));
			case 0xda:
				length = this.view.getUint16(this.offset);
				this.offset += 2;
				return this.str(length);
			case 0xdb:
				length = this.view.getUint32(this.offset);
				this.offset += 4;
				return this.str(length);

			// array
			case 0xdc:
				length = this.view.getUint16(this.offset);
				this.offset += 2;
				return this.array(length);
			case 0xdd:
				length = this.view.getUint32(this.offset);
				this.offset += 4;
				return this.array(length);

			// map
			case 0xde:
				length = this.view.getUint16(this.offset);
				this.offset += 2;
				return this.map(length);
			case 0xdf:
				length = this.view.getUint32(this.offset);
				this.offset += 4;
				return this.map(length);
		}

		throw new Error('Could not parse ' + prefix);
	}
}

export function decode(buffer: ArrayBuffer) {
	const decoder = new Decoder(buffer);
	return decoder.decode();
}