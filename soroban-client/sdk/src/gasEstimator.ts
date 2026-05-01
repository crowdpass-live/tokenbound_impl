import type { rpc } from "@stellar/stellar-sdk";
import type {
  GasCostBreakdown,
  GasDisplayOptions,
  GasEstimation,
  ResourceUsage,
} from "./types";

const STROOPS_PER_XLM = 10_000_000;
const DEFAULT_FEE_BUFFER = 1.2;

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value == null) {
    return 0;
  }

  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Extracts resource usage from a simulation response.
 */
function extractResourceUsage(
  simulation: rpc.Api.SimulateTransactionSuccessResponse,
): ResourceUsage {
  const txData = simulation.transactionData.build();
  const resources = txData.resources();
  const footprint = resources.footprint();
  const readOnly = footprint.readOnly();
  const readWrite = footprint.readWrite();

  return {
    instructions: toNumber(resources.instructions()),
    readBytes: toNumber(resources.diskReadBytes()),
    writeBytes: toNumber(resources.writeBytes()),
    entryReads: readOnly.length,
    entryWrites: readWrite.length,
    transactionSizeBytes: txData.toXDR().length,
    metadataSizeBytes: 0,
  };
}

/**
 * Extracts cost breakdown from a simulation response.
 */
function extractCostBreakdown(
  simulation: rpc.Api.SimulateTransactionSuccessResponse,
  baseFee: number,
  bufferMultiplier = DEFAULT_FEE_BUFFER,
): GasCostBreakdown {
  const txData = simulation.transactionData.build();
  const resourceFeeFromTxData = toNumber(txData.resourceFee());
  const minResourceFee = toNumber(simulation.minResourceFee);

  // Current RPC types expose only minResourceFee for simulation fees.
  const refundableFee = 0;

  // Calculate total resource fee (includes refundable portion)
  const resourceFee = minResourceFee || resourceFeeFromTxData;

  return {
    baseFee,
    resourceFee,
    refundableFee,
    totalFee: baseFee + resourceFee,
    maxFee: Math.ceil((baseFee + resourceFee) * bufferMultiplier),
  };
}

/**
 * Creates a human-readable summary of gas estimation.
 */
function createGasSummary(costs: GasCostBreakdown, resources: ResourceUsage): string {
  const totalXlm = (costs.totalFee / STROOPS_PER_XLM).toFixed(7);
  const maxXlm = (costs.maxFee / STROOPS_PER_XLM).toFixed(7);
  
  return (
    `Estimated gas: ${totalXlm} XLM (max: ${maxXlm} XLM). ` +
    `Resources: ${resources.instructions.toLocaleString()} instructions, ` +
    `${(resources.readBytes + resources.writeBytes).toLocaleString()} bytes I/O.`
  );
}

/**
 * Parses a successful simulation response into a structured gas estimation.
 * 
 * @param simulation - The simulation response from Soroban RPC
 * @param baseFee - The base fee for the transaction
 * @param bufferMultiplier - Multiplier for max fee calculation (default: 1.2)
 * @returns Structured gas estimation result
 */
export function parseSimulationForGas(
  simulation: rpc.Api.SimulateTransactionSuccessResponse,
  baseFee: number,
  bufferMultiplier?: number,
): GasEstimation {
  const resources = extractResourceUsage(simulation);
  const costs = extractCostBreakdown(simulation, baseFee, bufferMultiplier);
  const summary = createGasSummary(costs, resources);

  return {
    costs,
    resources,
    success: true,
    summary,
    rawSimulation: simulation,
  };
}

/**
 * Formats gas cost for display in a user-friendly way.
 * 
 * @param stroops - Amount in stroops
 * @param currency - Display currency ('XLM' or 'stroops')
 * @param decimals - Decimal places for XLM display
 * @returns Formatted string
 */
export function formatGasCost(
  stroops: number,
  currency: 'XLM' | 'stroops' = 'XLM',
  decimals = 7,
): string {
  if (currency === 'stroops') {
    return `${stroops.toLocaleString()} stroops`;
  }
  const xlm = stroops / STROOPS_PER_XLM;
  return `${xlm.toFixed(decimals)} XLM`;
}

/**
 * Formats a complete gas estimation for display.
 * 
 * @param estimation - Gas estimation result
 * @param options - Display formatting options
 * @returns Multi-line formatted string suitable for logging or UI display
 */
export function formatGasDisplay(
  estimation: GasEstimation,
  options: GasDisplayOptions = {},
): string {
  const {
    currency = 'XLM',
    decimals = 7,
    showResources = true,
  } = options;

  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════════════');
  lines.push('          GAS ESTIMATION REPORT            ');
  lines.push('═══════════════════════════════════════════');
  lines.push('');

  // Cost Summary
  lines.push('💰 ESTIMATED COSTS');
  lines.push('───────────────────────────────────────────');
  lines.push(`  Base Fee:       ${formatGasCost(estimation.costs.baseFee, currency, decimals)}`);
  lines.push(`  Resource Fee:   ${formatGasCost(estimation.costs.resourceFee, currency, decimals)}`);
  lines.push(`  Refundable:     ${formatGasCost(estimation.costs.refundableFee, currency, decimals)}`);
  lines.push(`  ─────────────────────────────────────────`);
  lines.push(`  TOTAL:          ${formatGasCost(estimation.costs.totalFee, currency, decimals)}`);
  lines.push(`  Max (buffered): ${formatGasCost(estimation.costs.maxFee, currency, decimals)}`);
  lines.push('');

  // Resource Usage
  if (showResources) {
    lines.push('⚡ RESOURCE USAGE');
    lines.push('───────────────────────────────────────────');
    lines.push(`  Instructions:   ${estimation.resources.instructions.toLocaleString()}`);
    lines.push(`  Read Bytes:     ${estimation.resources.readBytes.toLocaleString()}`);
    lines.push(`  Write Bytes:    ${estimation.resources.writeBytes.toLocaleString()}`);
    lines.push(`  Entry Reads:    ${estimation.resources.entryReads.toLocaleString()}`);
    lines.push(`  Entry Writes:   ${estimation.resources.entryWrites.toLocaleString()}`);
    lines.push(`  Tx Size:        ${estimation.resources.transactionSizeBytes.toLocaleString()} bytes`);
    lines.push(`  Metadata Size:  ${estimation.resources.metadataSizeBytes.toLocaleString()} bytes`);
    lines.push('');
  }

  // Footer
  lines.push('═══════════════════════════════════════════');
  lines.push(estimation.summary);
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Calculates recommended fee bump for high-priority transactions.
 * 
 * @param gasEstimation - The gas estimation result
 * @param priority - Priority level ('low', 'normal', 'high')
 * @returns Recommended fee in stroops
 */
export function calculateRecommendedFee(
  gasEstimation: GasEstimation,
  priority: 'low' | 'normal' | 'high' = 'normal',
): number {
  const baseMaxFee = gasEstimation.costs.maxFee;
  
  const multipliers = {
    low: 1.0,
    normal: 1.1,
    high: 1.5,
  };

  return Math.ceil(baseMaxFee * multipliers[priority]);
}

/**
 * Checks if gas estimation indicates potential resource exhaustion.
 * 
 * @param estimation - Gas estimation result
 * @returns Object with warnings if any thresholds are exceeded
 */
export function checkResourceWarnings(
  estimation: GasEstimation,
): { hasWarnings: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const resources = estimation.resources;

  // Thresholds based on typical network limits (these are conservative estimates)
  const THRESHOLDS = {
    instructions: 100_000_000, // 100M instructions
    writeBytes: 10 * 1024 * 1024, // 10MB write
    entryWrites: 100,
  };

  if (resources.instructions > THRESHOLDS.instructions) {
    warnings.push(`High instruction count (${resources.instructions.toLocaleString()}). May exceed network limits.`);
  }

  if (resources.writeBytes > THRESHOLDS.writeBytes) {
    warnings.push(`High write bytes (${(resources.writeBytes / 1024 / 1024).toFixed(2)} MB). Large storage writes.`);
  }

  if (resources.entryWrites > THRESHOLDS.entryWrites) {
    warnings.push(`Many entry writes (${resources.entryWrites}). Consider batching operations.`);
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings,
  };
}

/**
 * Compares two gas estimations and returns the difference.
 * Useful for showing the impact of operation changes.
 * 
 * @param before - Original gas estimation
 * @param after - New gas estimation
 * @returns Comparison result with differences
 */
export function compareGasEstimations(
  before: GasEstimation,
  after: GasEstimation,
): {
  costDifference: number;
  resourceChanges: Partial<Record<keyof ResourceUsage, number>>;
  summary: string;
} {
  const costDifference = after.costs.totalFee - before.costs.totalFee;
  const resourceChanges: Partial<Record<keyof ResourceUsage, number>> = {};

  (Object.keys(before.resources) as Array<keyof ResourceUsage>).forEach((key) => {
    const diff = after.resources[key] - before.resources[key];
    if (diff !== 0) {
      resourceChanges[key] = diff;
    }
  });

  const direction = costDifference >= 0 ? 'increase' : 'decrease';
  const absDiff = Math.abs(costDifference);
  const xlmDiff = (absDiff / STROOPS_PER_XLM).toFixed(7);

  const summary = `Gas cost ${direction}: ${xlmDiff} XLM (${absDiff.toLocaleString()} stroops)`;

  return {
    costDifference,
    resourceChanges,
    summary,
  };
}
