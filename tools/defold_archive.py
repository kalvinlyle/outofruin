"""Extract a Defold game.arcd archive. Usage: defold_extract.py <arci> <arcd> <dmanifest> <outdir>"""
import sys, os, struct

MAX_HASH = 64
XTEA_KEY = b"aQj8CScgNP4VsfXK"
DELTA = 0x9E3779B9
MASK = 0xFFFFFFFF


def xtea_encipher(v0, v1, key):
    total = 0
    for _ in range(32):
        v0 = (v0 + ((((v1 << 4) ^ (v1 >> 5)) + v1) ^ (total + key[total & 3]))) & MASK
        total = (total + DELTA) & MASK
        v1 = (v1 + ((((v0 << 4) ^ (v0 >> 5)) + v0) ^ (total + key[(total >> 11) & 3]))) & MASK
    return v0, v1


def xtea_ctr(data, endian='>'):
    """Defold EncryptXTeaCTR: keystream = XTEA(counter) big-endian, XORed over the data."""
    key = struct.unpack(endian + '4I', XTEA_KEY)
    out = bytearray(data)
    counter = 0
    i = 0
    n = len(data)
    while i < n:
        c0, c1 = (counter >> 32) & MASK, counter & MASK
        k0, k1 = xtea_encipher(c0, c1, key)
        ks = struct.pack(endian + 'II', k0, k1)
        for j in range(8):
            if i >= n:
                break
            out[i] ^= ks[j]
            i += 1
        counter += 1
    return bytes(out)


def lz4_block_decompress(src, expected):
    """Pure-python LZ4 block format decoder."""
    dst = bytearray()
    i = 0
    n = len(src)
    while i < n:
        token = src[i]; i += 1
        lit = token >> 4
        if lit == 15:
            while True:
                b = src[i]; i += 1
                lit += b
                if b != 255:
                    break
        dst += src[i:i + lit]; i += lit
        if i >= n:
            break
        offset = src[i] | (src[i + 1] << 8); i += 2
        mlen = token & 0x0F
        if mlen == 15:
            while True:
                b = src[i]; i += 1
                mlen += b
                if b != 255:
                    break
        mlen += 4
        start = len(dst) - offset
        for k in range(mlen):
            dst.append(dst[start + k])
    if expected is not None and len(dst) != expected:
        raise ValueError("lz4 size mismatch %d != %d" % (len(dst), expected))
    return bytes(dst)


def read_varint(buf, i):
    r = 0; s = 0
    while True:
        b = buf[i]; i += 1
        r |= (b & 0x7F) << s
        if not (b & 0x80):
            return r, i
        s += 7


def pb_fields(buf):
    """Yield (field_number, wire_type, value) for a protobuf message."""
    i = 0
    n = len(buf)
    while i < n:
        key, i = read_varint(buf, i)
        fn, wt = key >> 3, key & 7
        if wt == 0:
            v, i = read_varint(buf, i)
        elif wt == 2:
            ln, i = read_varint(buf, i)
            v = buf[i:i + ln]; i += ln
        elif wt == 5:
            v = buf[i:i + 4]; i += 4
        elif wt == 1:
            v = buf[i:i + 8]; i += 8
        else:
            raise ValueError("wiretype %d" % wt)
        yield fn, wt, v


def parse_manifest(path):
    """ManifestFile.data(1) -> ManifestData.resources(3) -> ResourceEntry{url(1), hash(3)}"""
    raw = open(path, 'rb').read()
    data = None
    for fn, wt, v in pb_fields(raw):
        if fn == 1 and wt == 2:
            data = v
            break
    out = {}
    for fn, wt, v in pb_fields(data):
        if fn != 3 or wt != 2:
            continue
        url = None; digest = None
        for efn, ewt, ev in pb_fields(v):
            if efn == 1 and ewt == 2:
                url = ev.decode('utf-8', 'replace')
            elif efn == 3 and ewt == 2:
                for hfn, hwt, hv in pb_fields(ev):
                    if hfn == 1 and hwt == 2:
                        digest = hv
        if url and digest:
            out[digest[:20]] = url
    return out


def main():
    arci_p, arcd_p, man_p, outdir = sys.argv[1:5]
    arci = open(arci_p, 'rb').read()
    arcd = open(arcd_p, 'rb').read()
    by_hash = parse_manifest(man_p)

    ver, pad, userdata, count, entry_off, hash_off, hash_len = struct.unpack_from('>IIQIIII', arci, 0)
    stats = dict(total=count, named=0, compressed=0, encrypted=0, failed=0)
    for i in range(count):
        h = arci[hash_off + i * MAX_HASH: hash_off + i * MAX_HASH + hash_len]
        d_off, size, csize, flags = struct.unpack_from('>IIII', arci, entry_off + i * 16)
        url = by_hash.get(h)
        if url is None:
            url = "/_unnamed/%03d_%s.bin" % (i, h[:6].hex())
        else:
            stats['named'] += 1

        if csize != 0xFFFFFFFF:
            blob = arcd[d_off:d_off + csize]
            stats['compressed'] += 1
        else:
            blob = arcd[d_off:d_off + size]

        if flags & 1:
            blob = xtea_ctr(blob)
            stats['encrypted'] += 1

        if csize != 0xFFFFFFFF:
            try:
                blob = lz4_block_decompress(blob, size)
            except Exception as e:
                stats['failed'] += 1
                print("FAIL %s: %s" % (url, e), file=sys.stderr)
                continue

        dest = os.path.join(outdir, url.lstrip('/'))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
            f.write(blob)
    print(stats)


if __name__ == '__main__':
    main()
