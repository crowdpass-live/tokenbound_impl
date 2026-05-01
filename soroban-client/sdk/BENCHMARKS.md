# Serialization Performance Benchmarks

This document outlines the performance of serialization and deserialization paths in the Soroban SDK.

## Summary

Benchmarks were conducted using `tinybench` on Node.js. The suite covers primitive decoders, `ScVal` to Native conversions, and complex contract-specific structures.

### Environment
- **Node.js Version**: v20+
- **Platform**: linux
- **SDK Version**: 0.1.0 (based on @stellar/stellar-sdk ^14.6.1)

## Benchmark Results

### Serialization/Deserialization (ops/s)

| Task Name | Ops/sec (Avg) | Latency (Avg) |
|-----------|---------------|---------------|
| `primitive:decodeString` | 4,102,393 | 276 ns |
| `primitive:decodeNumber` | 4,732,281 | 239 ns |
| `primitive:decodeBigInt` | 4,240,356 | 253 ns |
| `primitive:decodeAddress` | 4,165,283 | 272 ns |
| `scval:decodeScVal(String)` | 1,133,707 | 943 ns |
| `scval:decodeScVal(BigInt)` | 210,042 | 5,192 ns |
| `scval:decodeScVal(Array-100)` | 87,491 | 12,143 ns |
| `scval:decodeScVal(Struct-Event)` | 44,509 | 24,052 ns |
| `composite:decodeArray(100)` | 1,012,172 | 1,081 ns |
| `composite:ContractDecoder.event` | 177,067 | 6,145 ns |
| `complex:NestedDecoding(10xEvent)` | 10,110 | 106,862 ns |

### Encoding (Native to ScVal)

| Task Name | Ops/sec (Avg) | Latency (Avg) |
|-----------|---------------|---------------|
| `encoding:nativeToScVal(String)` | 2,419,483 | 465 ns |
| `encoding:nativeToScVal(Event)` | 14,153 | 77,581 ns |
| `encoding:nativeToScVal(Array-100)` | 2,079 | 519,301 ns |

## Bottlenecks & Insights

### 1. BigInt Conversion Overhead
`decodeScVal(BigInt)` is ~5x slower than `decodeScVal(String)`. This is due to the complexity of handling 64-bit and 128-bit integers in the XDR layer, which requires multiple BigInt operations and buffer management.

### 2. Struct vs. Primitive Performance
Decoding a struct like `Event` (12 fields) is ~25x slower than decoding a single string `ScVal`. This is expected but highlights that complex contract states will have a significant impact on application performance if fetched frequently.

### 3. Encoding is the Main Bottleneck
`nativeToScVal(Event)` takes ~77μs, while decoding the same event takes only ~24μs. Encoding large arrays is even slower (~519μs for 100 elements). Applications that frequently build large transactions or simulate complex calls should be aware of this overhead.

### 4. Typed Decoders Efficiency
The typed decoders in `decoders.ts` (e.g., `ContractDecoder.event`) are relatively efficient but add overhead on top of the raw JS object parsing. However, the safety they provide (type validation) is generally worth the ~6μs latency.

## How to Run Benchmarks

```bash
cd soroban-client
npm run benchmark
```
