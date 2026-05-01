import { Bench } from "tinybench";
import { xdr, nativeToScVal, Keypair } from "@stellar/stellar-sdk";
import {
  decodeScVal,
  decodeString,
  decodeNumber,
  decodeBigInt,
  decodeAddress,
  decodeArray,
  decodeStruct,
  ContractDecoder,
} from "../src/decoders.js";

async function runBenchmarks() {
  const bench = new Bench({ time: 100 });

  // Sample data
  const sampleString = "Hello, Soroban!";
  const sampleNumber = 123456789; // Use integer
  const sampleBigInt = 98765432109876543210n;
  const sampleKeyPair = Keypair.random();
  const sampleAddress = sampleKeyPair.publicKey();
  const sampleContractAddress = "CA3D5KRYM6CB7OWY6TWY6TWY6TWY6TWY6TWY6TWY6TWY6TWY6TWY6TWY"; // Valid-looking contract ID
  const sampleBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  const scValString = nativeToScVal(sampleString);
  const scValNumber = nativeToScVal(sampleNumber);
  const scValBigInt = nativeToScVal(sampleBigInt);
  const scValAddress = nativeToScVal(sampleAddress, { type: "address" });

  const sampleArray = Array.from({ length: 100 }, (_, i) => i);
  const scValArray = nativeToScVal(sampleArray);

  const sampleEvent = {
    id: 1,
    theme: "Web3 Conference",
    organizer: sampleAddress,
    event_type: "Conference",
    total_tickets: 1000n,
    tickets_sold: 500n,
    ticket_price: 1000000000n,
    start_date: 1625097600,
    end_date: 1625184000,
    is_canceled: false,
    ticket_nft_addr: sampleContractAddress,
    payment_token: sampleContractAddress,
  };
  const scValEvent = nativeToScVal(sampleEvent);

  console.log("Starting benchmarks...");

  // Benchmarking Primitive Decoders (Direct JS)
  bench
    .add("primitive:decodeString", () => {
      decodeString(sampleString);
    })
    .add("primitive:decodeNumber", () => {
      decodeNumber(sampleNumber);
    })
    .add("primitive:decodeBigInt", () => {
      decodeBigInt(sampleBigInt);
    })
    .add("primitive:decodeAddress", () => {
      decodeAddress(sampleAddress);
    });

  // Benchmarking ScVal Decoding (scValToNative)
  bench
    .add("scval:decodeScVal(String)", () => {
      decodeScVal(scValString);
    })
    .add("scval:decodeScVal(BigInt)", () => {
      decodeScVal(scValBigInt);
    })
    .add("scval:decodeScVal(Array-100)", () => {
      decodeScVal(scValArray);
    })
    .add("scval:decodeScVal(Struct-Event)", () => {
      decodeScVal(scValEvent);
    });

  // Benchmarking Composite Decoders
  const arrayDecoder = decodeArray(decodeNumber);
  bench.add("composite:decodeArray(100)", () => {
    arrayDecoder(sampleArray);
  });

  const eventDecoder = ContractDecoder.event();
  bench.add("composite:ContractDecoder.event", () => {
    eventDecoder(sampleEvent);
  });

  // Complex Nested Benchmark
  const complexData = Array.from({ length: 10 }, () => ({
    ...sampleEvent,
    sub_items: sampleArray,
  }));
  const complexDecoder = decodeArray(
    decodeStruct({
      id: decodeNumber,
      theme: decodeString,
      organizer: decodeAddress,
      event_type: decodeString,
      total_tickets: decodeBigInt,
      tickets_sold: decodeBigInt,
      ticket_price: decodeBigInt,
      start_date: decodeNumber,
      end_date: decodeNumber,
      is_canceled: (v: any) => v,
      ticket_nft_addr: decodeAddress,
      payment_token: decodeAddress,
      sub_items: arrayDecoder,
    }),
  );

  bench.add("complex:NestedDecoding(10xEvent)", () => {
    complexDecoder(complexData);
  });

  await bench.run();

  console.log("\n--- Serialization/Deserialization Benchmarks ---");
  console.table(bench.table());

  // Additional check for ScVal encoding performance
  const encodingBench = new Bench({ time: 100 });
  encodingBench
    .add("encoding:nativeToScVal(String)", () => {
      nativeToScVal(sampleString);
    })
    .add("encoding:nativeToScVal(Event)", () => {
      nativeToScVal(sampleEvent);
    })
    .add("encoding:nativeToScVal(Array-100)", () => {
      nativeToScVal(sampleArray);
    });

  await encodingBench.run();
  console.log("\n--- Encoding Benchmarks ---");
  console.table(encodingBench.table());
}

runBenchmarks().catch(console.error);
