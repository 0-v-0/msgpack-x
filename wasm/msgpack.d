module simpletpl;

version (WASI) {
	version (LDC) {
		pragma(LDC_alloca)
		void* alloca(size_t size) pure;
	}
}

import core.bitop;

struct OutputBuffer {
	void opOpAssign(string op : "~", T)(T rhs) {
		this ~= (cast(char*)&rhs)[0..T.sizeof];
	}

	void opOpAssign(string op : "~")(const(void)[] s) {
		import core.stdc.string;

		auto remain = pos + s.length;
		for (;;) {
			auto outlen = remain < outbuf.length ? remain : outbuf.length;
			outlen -= pos;
			memcpy(outbuf.ptr + pos, s.ptr, outlen);
			s = s[outlen..$];
			if (outlen+pos != outbuf.length) break;
			pos = 0;
			remain -= outbuf.length;
			output(outbuf[]);
		}
		pos = remain;
	}
}

OutputBuffer buf;

/**
 * MessagePack type-information format
 *
 * See_Also:
 *  $(LINK2 http://redmine.msgpack.org/projects/msgpack/wiki/FormatSpec, MessagePack Specificaton)
 */
enum Format : ubyte
{
	NONE,

	// unsinged integer
	UINT8  = 0xcc,  // ubyte
	UINT16 = 0xcd,  // ushort
	UINT32 = 0xce,  // uint
	UINT64 = 0xcf,  // ulong

	// signed integer
	INT8  = 0xd0,   // byte
	INT16 = 0xd1,   // short
	INT32 = 0xd2,   // int
	INT64 = 0xd3,   // long

	// floating point
	FLOAT  = 0xca,  // float
	DOUBLE = 0xcb,  // double

	// bin type
	BIN8  = 0xc4,
	BIN16 = 0xc5,
	BIN32 = 0xc6,

	// ext type
	EXT   = 0xd4,  // fixext 1/2/4/8/16
	EXT8  = 0xc7,
	EXT16 = 0xc8,
	EXT32 = 0xc9,

	// str type
	STR = 0xa0,
	STR8  = 0xd9,
	STR16 = 0xda,
	STR32 = 0xdb,

	// array
	ARRAY   = 0x90,
	ARRAY16 = 0xdc,
	ARRAY32 = 0xdd,

	// map
	MAP   = 0x80,
	MAP16 = 0xde,
	MAP32 = 0xdf,
}

T toBE(T)(in T value) @trusted if(T.sizeof > 1)
{
	version (LittleEndian) {
		static if (T.sizeof == 2)
			return byteswap(value);
		else static if (T.sizeof == 4)
			return bswap(cast(uint)value);
		else
			return bswap(value);
	} else
		return value;
}

extern(C):

export byte[48<<10] outbuf;
size_t pos;

private:

void begin(Format f, Format f16, size_t llen = 16)(size_t len) {
	if (len <= ushort.max) {
		static if (llen) {
			if (len < llen) {
				buf ~= cast(ubyte)(f | cast(ubyte)len);
				return;
			}
		}
		static if (f != Format.ARRAY && f != Format.MAP) {
			if (len <= ubyte.max) {
				buf ~= cast(Format)(f16 - 1);
				buf ~= cast(ubyte)len;
				return;
			}
		}
		buf ~= f16;
		buf ~= toBE(cast(ushort)len);
	} else {
		buf ~= cast(Format)(f16 + 1);
		buf ~= toBE(cast(uint)len);
	}
}

public void output(void[] buf);

export:
void put(ubyte value) {
	buf ~= value;
}

void packI32(int value){
	packI64(value);
}

void packI64(long value) {
	if (value < -(1 << 5)) {
		if (value < -(1 << 15)) {
			if (value < -(1L << 31)) {
				buf ~= Format.INT64;
				buf ~= toBE(cast(ulong)value);
				return;
			}
			buf ~= Format.INT32;
			buf ~= toBE(cast(uint)value);
		} else if (value < -(1 << 7)) {
			buf ~= Format.INT16;
			buf ~= toBE(cast(ushort)value);
		} else {
			buf ~= Format.INT8;
			buf ~= cast(ubyte)value;
		}
	} else if (value < (1 << 7)) {
		// fixnum
		buf ~= cast(ubyte)value;
	} else if (value < (1L << 16)) {
		if (value < (1L << 8)) {
			buf ~= Format.UINT8;
			buf ~= cast(ubyte)value;
		} else {
			buf ~= Format.UINT16;
			buf ~= toBE(cast(ushort)value);
		}
	} else if (value < (1L << 32)) {
		buf ~= Format.UINT32;
		buf ~= toBE(cast(uint)value);
	} else {
		packU64(cast(ulong)value);
	}
}

void packU64(ulong value) {
	buf ~= Format.UINT64;
	buf ~= toBE(cast(ulong) value);
}

void packFP(double value) {
	/**
	 * For float/double type (de)serialization
	 */
	union _f { float f; uint i; }

	union _d { double f; ulong i; }

	auto f = _f(cast(float)value);
	if (f.f != f.f || f.f == value) {
		buf ~= Format.FLOAT;
		buf ~= toBE(f.i);
	} else {
		buf ~= Format.DOUBLE;
		buf ~= toBE(_d(value).i);
	}
}

void beginRaw(size_t len) {
    begin!(Format.BIN8, Format.BIN16, 0)(len);
}

void beginStr(size_t len) {
	begin!(Format.STR, Format.STR16, 32)(len);
}

void beginArray(size_t len) {
	begin!(Format.ARRAY, Format.ARRAY16)(len);
}

void beginMap(size_t len) {
	begin!(Format.MAP, Format.MAP16)(len);
}

size_t getpos() {
	return pos;
}

void move(size_t n) {
	pos += n;
}

void flush() {
	if (pos) {
		output(outbuf[0 .. pos]);
		pos = 0;
	}
}

