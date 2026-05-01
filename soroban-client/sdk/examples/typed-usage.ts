import {
  createTokenboundSdk,
  TypeValidator,
  validateCreateEventInput,
  createCallBuilder,
} from "../src";

const sdk = createTokenboundSdk({
  horizonUrl: "https://horizon-testnet.stellar.org",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  contracts: {
    eventManager: "CONTRACT_ID_HERE",
  },
});

async function exampleTypedUsage() {
  const eventInput = {
    organizer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    theme: "Web3 Conference 2024",
    eventType: "Conference",
    startDate: Date.now() + 86400000,
    endDate: Date.now() + 172800000,
    ticketPrice: 100n,
    totalTickets: 1000n,
    paymentToken: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  };

  validateCreateEventInput(eventInput);

  const result = await sdk.eventManager.createEvent(eventInput, {
    signTransaction: async (xdr, opts) => {
      return xdr;
    },
  });

  console.log("Event created:", result);
}

async function exampleWithBuilder() {
  const builder = createCallBuilder<
    {
      organizer: string;
      theme: string;
      eventType: string;
      startDate: number;
      endDate: number;
      ticketPrice: bigint;
      totalTickets: bigint;
      paymentToken: string;
    },
    unknown
  >();

  builder
    .withInput({
      organizer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      theme: "Web3 Conference 2024",
      eventType: "Conference",
      startDate: Date.now() + 86400000,
      endDate: Date.now() + 172800000,
      ticketPrice: 100n,
      totalTickets: 1000n,
      paymentToken: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    })
    .withValidator((input) => {
      TypeValidator.validateAddress(input.organizer, "organizer");
      TypeValidator.validatePositiveBigInt(input.ticketPrice, "ticketPrice");
    })
    .withOptions({
      signTransaction: async (xdr) => xdr,
    });

  const call = builder.build();
  console.log("Built call:", call);
}

async function exampleTypeValidation() {
  const address = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

  if (TypeValidator.isAddress(address)) {
    console.log("Valid address");
  }

  try {
    TypeValidator.validatePositiveBigInt(100n, "ticketPrice");
    console.log("Valid ticket price");
  } catch (error) {
    console.error("Validation failed:", error);
  }

  const ticketPrice = 100n;
  TypeValidator.validateRange(ticketPrice, 1n, 1000000n, "ticketPrice");
}

async function exampleReadMethods() {
  const eventId = 1;

  const event = await sdk.eventManager.getEvent(eventId);
  console.log("Event:", event);

  const eventCount = await sdk.eventManager.getEventCount();
  console.log("Total events:", eventCount);

  const allEvents = await sdk.eventManager.getAllEvents();
  console.log("All events:", allEvents);
}

async function exampleTypedClient() {
  const methods = sdk.eventManager.listMethods?.();
  console.log("Available methods:", methods);

  const readMethods = sdk.eventManager.listReadMethods?.();
  console.log("Read-only methods:", readMethods);

  const writeMethods = sdk.eventManager.listWriteMethods?.();
  console.log("Write methods:", writeMethods);
}
