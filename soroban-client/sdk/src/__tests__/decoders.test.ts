import {
  ContractDecoder,
  decodeAddress,
  decodeArray,
  decodeBigInt,
  decodeBoolean,
  decodeBytes,
  decodeBytesN,
  DecoderError,
  decodeEnum,
  decodeI128,
  decodeI32,
  decodeI64,
  decodeLiteral,
  decodeMap,
  decodeNumber,
  decodeOneOf,
  decodeOption,
  decodeString,
  decodeStruct,
  decodeSymbol,
  decodeTransform,
  decodeTuple,
  decodeU128,
  decodeU32,
  decodeU64,
  decodeValidate,
  decodeVec,
  decodeVoid,
  decodeWithDefault,
  safeDecode,
} from "../decoders";

describe("Decoders", () => {
  describe("Primitive Decoders", () => {
    describe("decodeString", () => {
      it("should decode string values", () => {
        expect(decodeString("hello")).toBe("hello");
        expect(decodeString("")).toBe("");
      });

      it("should throw on non-string values", () => {
        expect(() => decodeString(123)).toThrow(DecoderError);
        expect(() => decodeString(null)).toThrow(DecoderError);
        expect(() => decodeString(undefined)).toThrow(DecoderError);
      });
    });

    describe("decodeNumber", () => {
      it("should decode number values", () => {
        expect(decodeNumber(123)).toBe(123);
        expect(decodeNumber(0)).toBe(0);
        expect(decodeNumber(-456)).toBe(-456);
        expect(decodeNumber(3.14)).toBe(3.14);
      });

      it("should decode string numbers", () => {
        expect(decodeNumber("123")).toBe(123);
        expect(decodeNumber("3.14")).toBe(3.14);
      });

      it("should decode bigint to number", () => {
        expect(decodeNumber(123n)).toBe(123);
      });

      it("should throw on invalid values", () => {
        expect(() => decodeNumber("not a number")).toThrow(DecoderError);
        expect(() => decodeNumber(null)).toThrow(DecoderError);
      });
    });

    describe("decodeBigInt", () => {
      it("should decode bigint values", () => {
        expect(decodeBigInt(123n)).toBe(123n);
        expect(decodeBigInt(0n)).toBe(0n);
      });

      it("should decode number to bigint", () => {
        expect(decodeBigInt(123)).toBe(123n);
      });

      it("should decode string to bigint", () => {
        expect(decodeBigInt("123")).toBe(123n);
        expect(decodeBigInt("999999999999999999")).toBe(999999999999999999n);
      });

      it("should throw on invalid values", () => {
        expect(() => decodeBigInt("not a number")).toThrow(DecoderError);
        expect(() => decodeBigInt(null)).toThrow(DecoderError);
      });
    });

    describe("decodeBoolean", () => {
      it("should decode boolean values", () => {
        expect(decodeBoolean(true)).toBe(true);
        expect(decodeBoolean(false)).toBe(false);
      });

      it("should throw on non-boolean values", () => {
        expect(() => decodeBoolean(1)).toThrow(DecoderError);
        expect(() => decodeBoolean("true")).toThrow(DecoderError);
        expect(() => decodeBoolean(null)).toThrow(DecoderError);
      });
    });

    describe("decodeBytes", () => {
      it("should decode Uint8Array", () => {
        const bytes = new Uint8Array([1, 2, 3]);
        expect(decodeBytes(bytes)).toEqual(bytes);
      });

      it("should decode hex string", () => {
        const result = decodeBytes("0x010203");
        expect(result).toEqual(new Uint8Array([1, 2, 3]));
      });

      it("should decode hex string without 0x prefix", () => {
        const result = decodeBytes("010203");
        expect(result).toEqual(new Uint8Array([1, 2, 3]));
      });

      it("should throw on invalid values", () => {
        expect(() => decodeBytes("not hex")).toThrow(DecoderError);
        expect(() => decodeBytes(123)).toThrow(DecoderError);
      });
    });

    describe("decodeAddress", () => {
      it("should decode valid Stellar addresses", () => {
        const address =
          "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        expect(decodeAddress(address)).toBe(address);

        const contractAddress =
          "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        expect(decodeAddress(contractAddress)).toBe(contractAddress);
      });

      it("should throw on invalid addresses", () => {
        expect(() => decodeAddress("invalid")).toThrow(DecoderError);
        expect(() => decodeAddress("GXXX")).toThrow(DecoderError);
        expect(() => decodeAddress(123)).toThrow(DecoderError);
      });
    });

    describe("decodeSymbol", () => {
      it("should decode symbol as string", () => {
        expect(decodeSymbol("transfer")).toBe("transfer");
        expect(decodeSymbol("mint")).toBe("mint");
      });
    });
  });

  describe("Composite Decoders", () => {
    describe("decodeArray", () => {
      it("should decode array of numbers", () => {
        const decoder = decodeArray(decodeNumber);
        expect(decoder([1, 2, 3])).toEqual([1, 2, 3]);
      });

      it("should decode array of strings", () => {
        const decoder = decodeArray(decodeString);
        expect(decoder(["a", "b", "c"])).toEqual(["a", "b", "c"]);
      });

      it("should decode empty array", () => {
        const decoder = decodeArray(decodeNumber);
        expect(decoder([])).toEqual([]);
      });

      it("should throw on non-array", () => {
        const decoder = decodeArray(decodeNumber);
        expect(() => decoder("not array")).toThrow(DecoderError);
      });

      it("should throw on invalid element", () => {
        const decoder = decodeArray(decodeNumber);
        expect(() => decoder([1, "invalid", 3])).toThrow(DecoderError);
      });
    });

    describe("decodeVec", () => {
      it("should work like decodeArray", () => {
        const decoder = decodeVec(decodeNumber);
        expect(decoder([1, 2, 3])).toEqual([1, 2, 3]);
      });
    });

    describe("decodeOption", () => {
      it("should decode null as null", () => {
        const decoder = decodeOption(decodeNumber);
        expect(decoder(null)).toBeNull();
        expect(decoder(undefined)).toBeNull();
      });

      it("should decode Some wrapper", () => {
        const decoder = decodeOption(decodeNumber);
        expect(decoder({ Some: 123 })).toBe(123);
      });

      it("should decode direct value", () => {
        const decoder = decodeOption(decodeNumber);
        expect(decoder(123)).toBe(123);
      });

      it("should return null on decode failure", () => {
        const decoder = decodeOption(decodeNumber);
        expect(decoder("invalid")).toBeNull();
      });
    });

    describe("decodeTuple", () => {
      it("should decode tuple with mixed types", () => {
        const decoder = decodeTuple(decodeNumber, decodeString, decodeBoolean);
        expect(decoder([123, "hello", true])).toEqual([123, "hello", true]);
      });

      it("should throw on wrong length", () => {
        const decoder = decodeTuple(decodeNumber, decodeString);
        expect(() => decoder([123])).toThrow(DecoderError);
        expect(() => decoder([123, "hello", "extra"])).toThrow(DecoderError);
      });

      it("should throw on non-array", () => {
        const decoder = decodeTuple(decodeNumber);
        expect(() => decoder("not array")).toThrow(DecoderError);
      });
    });

    describe("decodeStruct", () => {
      it("should decode object with field decoders", () => {
        const decoder = decodeStruct({
          id: decodeNumber,
          name: decodeString,
          active: decodeBoolean,
        });

        expect(decoder({ id: 1, name: "test", active: true })).toEqual({
          id: 1,
          name: "test",
          active: true,
        });
      });

      it("should throw on missing field", () => {
        const decoder = decodeStruct({
          id: decodeNumber,
          name: decodeString,
        });

        expect(() => decoder({ id: 1 })).toThrow(DecoderError);
      });

      it("should throw on non-object", () => {
        const decoder = decodeStruct({ id: decodeNumber });
        expect(() => decoder("not object")).toThrow(DecoderError);
        expect(() => decoder(null)).toThrow(DecoderError);
      });
    });

    describe("decodeMap", () => {
      it("should decode map/record", () => {
        const decoder = decodeMap(decodeString, decodeNumber);
        expect(decoder({ a: 1, b: 2, c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
      });

      it("should throw on invalid value", () => {
        const decoder = decodeMap(decodeString, decodeNumber);
        expect(() => decoder({ a: "invalid" })).toThrow(DecoderError);
      });
    });
  });

  describe("Utility Decoders", () => {
    describe("decodeWithDefault", () => {
      it("should return decoded value on success", () => {
        const decoder = decodeWithDefault(decodeNumber, 0);
        expect(decoder(123)).toBe(123);
      });

      it("should return default on failure", () => {
        const decoder = decodeWithDefault(decodeNumber, 0);
        expect(decoder("invalid")).toBe(0);
      });
    });

    describe("decodeOneOf", () => {
      it("should try decoders in order", () => {
        const decoder = decodeOneOf(decodeNumber, decodeString);
        expect(decoder(123)).toBe(123);
        expect(decoder("hello")).toBe("hello");
      });

      it("should throw if all decoders fail", () => {
        const decoder = decodeOneOf(decodeNumber, decodeBoolean);
        expect(() => decoder("invalid")).toThrow(DecoderError);
      });
    });

    describe("decodeTransform", () => {
      it("should decode and transform value", () => {
        const decoder = decodeTransform(decodeNumber, (n) => n * 2);
        expect(decoder(5)).toBe(10);
      });

      it("should transform string to uppercase", () => {
        const decoder = decodeTransform(decodeString, (s) => s.toUpperCase());
        expect(decoder("hello")).toBe("HELLO");
      });
    });

    describe("decodeValidate", () => {
      it("should decode and validate value", () => {
        const decoder = decodeValidate(
          decodeNumber,
          (n) => n > 0,
          "Must be positive",
        );
        expect(decoder(5)).toBe(5);
      });

      it("should throw on validation failure", () => {
        const decoder = decodeValidate(
          decodeNumber,
          (n) => n > 0,
          "Must be positive",
        );
        expect(() => decoder(-5)).toThrow(DecoderError);
      });
    });

    describe("decodeLiteral", () => {
      it("should decode exact literal value", () => {
        const decoder = decodeLiteral("success");
        expect(decoder("success")).toBe("success");
      });

      it("should throw on different value", () => {
        const decoder = decodeLiteral("success");
        expect(() => decoder("failure")).toThrow(DecoderError);
      });

      it("should work with numbers", () => {
        const decoder = decodeLiteral(42);
        expect(decoder(42)).toBe(42);
        expect(() => decoder(43)).toThrow(DecoderError);
      });
    });

    describe("decodeEnum", () => {
      it("should decode valid enum value", () => {
        const decoder = decodeEnum(["red", "green", "blue"] as const);
        expect(decoder("red")).toBe("red");
        expect(decoder("green")).toBe("green");
      });

      it("should throw on invalid enum value", () => {
        const decoder = decodeEnum(["red", "green", "blue"] as const);
        expect(() => decoder("yellow")).toThrow(DecoderError);
      });
    });
  });

  describe("Soroban-Specific Decoders", () => {
    describe("decodeU32", () => {
      it("should decode valid u32 values", () => {
        expect(decodeU32(0)).toBe(0);
        expect(decodeU32(4294967295)).toBe(4294967295);
      });

      it("should throw on negative values", () => {
        expect(() => decodeU32(-1)).toThrow(DecoderError);
      });

      it("should throw on values > u32 max", () => {
        expect(() => decodeU32(4294967296)).toThrow(DecoderError);
      });

      it("should throw on non-integer", () => {
        expect(() => decodeU32(3.14)).toThrow(DecoderError);
      });
    });

    describe("decodeU64", () => {
      it("should decode valid u64 values", () => {
        expect(decodeU64(0)).toBe(0);
        expect(decodeU64(123456789)).toBe(123456789);
      });

      it("should throw on negative values", () => {
        expect(() => decodeU64(-1)).toThrow(DecoderError);
      });
    });

    describe("decodeU128", () => {
      it("should decode valid u128 values", () => {
        expect(decodeU128(0n)).toBe(0n);
        expect(decodeU128(123456789n)).toBe(123456789n);
      });

      it("should throw on negative values", () => {
        expect(() => decodeU128(-1n)).toThrow(DecoderError);
      });
    });

    describe("decodeI32", () => {
      it("should decode valid i32 values", () => {
        expect(decodeI32(-2147483648)).toBe(-2147483648);
        expect(decodeI32(2147483647)).toBe(2147483647);
        expect(decodeI32(0)).toBe(0);
      });

      it("should throw on out of range values", () => {
        expect(() => decodeI32(-2147483649)).toThrow(DecoderError);
        expect(() => decodeI32(2147483648)).toThrow(DecoderError);
      });
    });

    describe("decodeI64", () => {
      it("should decode valid i64 values", () => {
        expect(decodeI64(-123)).toBe(-123);
        expect(decodeI64(123)).toBe(123);
      });
    });

    describe("decodeI128", () => {
      it("should decode valid i128 values", () => {
        expect(decodeI128(-123n)).toBe(-123n);
        expect(decodeI128(123n)).toBe(123n);
      });
    });

    describe("decodeBytesN", () => {
      it("should decode fixed-size bytes", () => {
        const decoder = decodeBytesN(3);
        const bytes = new Uint8Array([1, 2, 3]);
        expect(decoder(bytes)).toEqual(bytes);
      });

      it("should throw on wrong size", () => {
        const decoder = decodeBytesN(3);
        const bytes = new Uint8Array([1, 2]);
        expect(() => decoder(bytes)).toThrow(DecoderError);
      });
    });

    describe("decodeVoid", () => {
      it("should decode void/unit", () => {
        expect(decodeVoid(undefined)).toBeUndefined();
        expect(decodeVoid(null)).toBeUndefined();
      });

      it("should throw on non-void values", () => {
        expect(() => decodeVoid(123)).toThrow(DecoderError);
        expect(() => decodeVoid("hello")).toThrow(DecoderError);
      });
    });
  });

  describe("ContractDecoder", () => {
    describe("event", () => {
      it("should decode Event struct", () => {
        const decoder = ContractDecoder.event();
        const event = {
          id: 1,
          theme: "Web3 Conference",
          organizer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          event_type: "Conference",
          total_tickets: 100n,
          tickets_sold: 50n,
          ticket_price: 1000000000n,
          start_date: 1234567890,
          end_date: 1234567900,
          is_canceled: false,
          ticket_nft_addr:
            "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          payment_token:
            "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        };

        expect(decoder(event)).toEqual(event);
      });
    });

    describe("ticketTier", () => {
      it("should decode TicketTier struct", () => {
        const decoder = ContractDecoder.ticketTier();
        const tier = {
          name: "VIP",
          price: 5000000000n,
          total_quantity: 50n,
          sold_quantity: 25n,
        };

        expect(decoder(tier)).toEqual(tier);
      });
    });

    describe("buyerPurchase", () => {
      it("should decode BuyerPurchase struct", () => {
        const decoder = ContractDecoder.buyerPurchase();
        const purchase = {
          quantity: 2n,
          total_paid: 2000000000n,
        };

        expect(decoder(purchase)).toEqual(purchase);
      });
    });

    describe("tbaToken", () => {
      it("should decode TBA token tuple", () => {
        const decoder = ContractDecoder.tbaToken();
        const token = [
          1,
          "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          123n,
        ];

        expect(decoder(token)).toEqual(token);
      });
    });
  });

  describe("safeDecode", () => {
    it("should return success result on valid decode", () => {
      const result = safeDecode(decodeNumber, 123);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(123);
      }
    });

    it("should return error result on invalid decode", () => {
      const result = safeDecode(decodeNumber, "invalid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(DecoderError);
      }
    });
  });

  describe("DecoderError", () => {
    it("should contain error details", () => {
      const error = new DecoderError("Test error", 123, "string");
      expect(error.message).toBe("Test error");
      expect(error.value).toBe(123);
      expect(error.expectedType).toBe("string");
      expect(error.name).toBe("DecoderError");
    });
  });
});
