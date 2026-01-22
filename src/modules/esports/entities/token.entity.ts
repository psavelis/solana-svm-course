import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * # Supported Token Type
 *
 * Enumeration of supported token types for esports platform.
 *
 * ## Token Categories
 *
 * | Category | Tokens | Use Case |
 * |----------|--------|----------|
 * | Native | SOL | Low-fee transactions |
 * | Stablecoins | USDC, USDT, PYUSD | Price stability |
 * | Wrapped | WSOL | SPL Token compatibility |
 *
 * ## Stablecoin Benefits
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │              WHY STABLECOINS FOR ESPORTS?                   │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  1. PRICE STABILITY                                         │
 * │     • Entry fees have predictable USD value                 │
 * │     • Prize pools don't fluctuate during match              │
 * │     • Players know exact value of winnings                  │
 * │                                                             │
 * │  2. REGULATORY COMPLIANCE                                   │
 * │     • Easier tax reporting (USD-denominated)                │
 * │     • Clearer financial records                             │
 * │     • Simplified accounting for platform                    │
 * │                                                             │
 * │  3. PLAYER EXPERIENCE                                       │
 * │     • Familiar USD pricing                                  │
 * │     • No conversion anxiety                                 │
 * │     • Transparent prize values                              │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * @example
 * ```typescript
 * // Create match with USDC entry fee
 * {
 *   tokenType: SupportedToken.USDC,
 *   entryFee: '5000000', // 5 USDC (6 decimals)
 * }
 *
 * // Create tournament with SOL entry fee
 * {
 *   tokenType: SupportedToken.SOL,
 *   entryFee: '1000000000', // 1 SOL (9 decimals)
 * }
 * ```
 */
export enum SupportedToken {
  /** Native Solana token (9 decimals) */
  SOL = 'SOL',
  /** USD Coin - Circle (6 decimals) */
  USDC = 'USDC',
  /** Tether USD (6 decimals) */
  USDT = 'USDT',
  /** PayPal USD (6 decimals) */
  PYUSD = 'PYUSD',
  /** Wrapped SOL - SPL Token (9 decimals) */
  WSOL = 'WSOL',
}

/**
 * # Token Configuration
 *
 * Configuration for supported SPL tokens on the platform.
 *
 * ## Mainnet Token Addresses
 *
 * | Token | Mint Address | Decimals |
 * |-------|--------------|----------|
 * | USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 6 |
 * | USDT | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB | 6 |
 * | PYUSD | 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo | 6 |
 * | WSOL | So11111111111111111111111111111111111111112 | 9 |
 *
 * ## Security Considerations
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                TOKEN SECURITY CHECKLIST                     │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  ✓ MINT ADDRESS VERIFICATION                                │
 * │    • Hardcoded official mint addresses                      │
 * │    • No dynamic token addition without audit                │
 * │    • Separate mainnet/devnet configurations                 │
 * │                                                             │
 * │  ✓ DECIMAL HANDLING                                         │
 * │    • Always use BigInt for amounts                          │
 * │    • Store amounts in base units (no decimals)              │
 * │    • UI conversion only at display layer                    │
 * │                                                             │
 * │  ✓ ATA (Associated Token Account) MANAGEMENT                │
 * │    • Create ATAs before first deposit                       │
 * │    • Validate ATA ownership before transfers                │
 * │    • Handle rent-exempt requirements                        │
 * │                                                             │
 * │  ✓ TRANSFER VALIDATION                                      │
 * │    • Verify token mint matches expected                     │
 * │    • Check sufficient balance before transfer               │
 * │    • Validate recipient ATA exists                          │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */
export const TOKEN_CONFIG: Record<
  SupportedToken,
  {
    name: string;
    symbol: string;
    decimals: number;
    mintAddress: {
      mainnet: string;
      devnet: string;
    };
    isStablecoin: boolean;
    isNative: boolean;
    minEntryFee: string;
    maxEntryFee: string;
    displayPrecision: number;
  }
> = {
  [SupportedToken.SOL]: {
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    mintAddress: {
      mainnet: 'So11111111111111111111111111111111111111112',
      devnet: 'So11111111111111111111111111111111111111112',
    },
    isStablecoin: false,
    isNative: true,
    minEntryFee: '1000000', // 0.001 SOL
    maxEntryFee: '100000000000', // 100 SOL
    displayPrecision: 4,
  },
  [SupportedToken.USDC]: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    mintAddress: {
      mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    },
    isStablecoin: true,
    isNative: false,
    minEntryFee: '100000', // 0.10 USDC
    maxEntryFee: '100000000000', // 100,000 USDC
    displayPrecision: 2,
  },
  [SupportedToken.USDT]: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    mintAddress: {
      mainnet: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      devnet: 'BQcdHdAQW1hczDbBi9hiegXAR7A98Q9jx3X3sXBaSpms',
    },
    isStablecoin: true,
    isNative: false,
    minEntryFee: '100000', // 0.10 USDT
    maxEntryFee: '100000000000', // 100,000 USDT
    displayPrecision: 2,
  },
  [SupportedToken.PYUSD]: {
    name: 'PayPal USD',
    symbol: 'PYUSD',
    decimals: 6,
    mintAddress: {
      mainnet: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
      devnet: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
    },
    isStablecoin: true,
    isNative: false,
    minEntryFee: '100000', // 0.10 PYUSD
    maxEntryFee: '100000000000', // 100,000 PYUSD
    displayPrecision: 2,
  },
  [SupportedToken.WSOL]: {
    name: 'Wrapped SOL',
    symbol: 'WSOL',
    decimals: 9,
    mintAddress: {
      mainnet: 'So11111111111111111111111111111111111111112',
      devnet: 'So11111111111111111111111111111111111111112',
    },
    isStablecoin: false,
    isNative: false,
    minEntryFee: '1000000', // 0.001 WSOL
    maxEntryFee: '100000000000', // 100 WSOL
    displayPrecision: 4,
  },
};

/**
 * # Token Balance Entity
 *
 * Per-token balance tracking for player wallets.
 *
 * ## Overview
 *
 * Each player wallet can hold multiple token balances:
 * - SOL for gas fees and native transactions
 * - USDC/USDT/PYUSD for stable-value gaming
 *
 * ## Multi-Token Wallet Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                   PLAYER WALLET                             │
 * │                   (MPC 2-of-3)                               │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │   Main Account (Solana Pubkey)                              │
 * │   ├── SOL Balance (native)                                  │
 * │   │                                                         │
 * │   ├── USDC ATA (Associated Token Account)                   │
 * │   │   └── TokenBalance { token: USDC, available: X }        │
 * │   │                                                         │
 * │   ├── USDT ATA (Associated Token Account)                   │
 * │   │   └── TokenBalance { token: USDT, available: Y }        │
 * │   │                                                         │
 * │   └── PYUSD ATA (Associated Token Account)                  │
 * │       └── TokenBalance { token: PYUSD, available: Z }       │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Balance Segregation
 *
 * | Field | Description | Use Case |
 * |-------|-------------|----------|
 * | availableBalance | Spendable funds | Entry fees, withdrawals |
 * | lockedBalance | Reserved funds | Active match escrows |
 * | totalDeposited | Lifetime deposits | Analytics |
 * | totalWithdrawn | Lifetime withdrawals | Analytics |
 * | totalWinnings | Prize earnings | Tax reporting |
 *
 * ## Security: Balance Isolation
 *
 * ```
 * CRITICAL: Token balances are isolated per token type.
 * A match requiring 10 USDC cannot use SOL balance.
 * This prevents:
 *   - Accidental cross-token spending
 *   - Exploitation of price volatility
 *   - Incorrect prize distribution
 * ```
 *
 * @see PlayerWallet - Parent wallet entity
 * @see SupportedToken - Supported token types
 */
@Entity('esports_token_balances')
@Index(['walletId', 'tokenType'], { unique: true })
export class TokenBalance {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Reference to parent wallet */
  @Column()
  walletId: string;

  /**
   * Token type for this balance
   * @see SupportedToken
   */
  @Column({
    type: 'enum',
    enum: SupportedToken,
  })
  tokenType: SupportedToken;

  /** SPL Token mint address */
  @Column()
  tokenMint: string;

  /** Associated Token Account (ATA) address for SPL tokens */
  @Column({ nullable: true })
  ataAddress: string;

  /**
   * Available balance in base units
   * - SOL: lamports (9 decimals)
   * - USDC/USDT/PYUSD: micro-units (6 decimals)
   */
  @Column({ type: 'bigint', default: '0' })
  availableBalance: string;

  /**
   * Locked balance in base units
   * Reserved for active matches/tournaments
   */
  @Column({ type: 'bigint', default: '0' })
  lockedBalance: string;

  /** Lifetime total deposited (for analytics) */
  @Column({ type: 'bigint', default: '0' })
  totalDeposited: string;

  /** Lifetime total withdrawn (for analytics) */
  @Column({ type: 'bigint', default: '0' })
  totalWithdrawn: string;

  /** Lifetime total winnings (for analytics) */
  @Column({ type: 'bigint', default: '0' })
  totalWinnings: string;

  /** Lifetime total entry fees paid (for analytics) */
  @Column({ type: 'bigint', default: '0' })
  totalEntryFees: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ==================== Helper Methods ====================

  /**
   * Get total balance (available + locked)
   * @returns total balance as bigint
   */
  getTotalBalance(): bigint {
    return BigInt(this.availableBalance) + BigInt(this.lockedBalance);
  }

  /**
   * Check if sufficient balance for operation
   * @param amount - Amount required in base units
   * @returns true if available balance covers amount
   */
  hasSufficientBalance(amount: bigint): boolean {
    return BigInt(this.availableBalance) >= amount;
  }

  /**
   * Get token configuration
   * @returns Token configuration object
   */
  getTokenConfig() {
    return TOKEN_CONFIG[this.tokenType];
  }

  /**
   * Format balance for display
   * @param balance - Balance in base units
   * @returns Formatted string with proper decimals
   */
  formatBalance(balance: string): string {
    const config = this.getTokenConfig();
    const value = BigInt(balance);
    const divisor = BigInt(10 ** config.decimals);
    const whole = value / divisor;
    const fraction = value % divisor;
    const fractionStr = fraction.toString().padStart(config.decimals, '0');
    return `${whole}.${fractionStr.slice(0, config.displayPrecision)} ${config.symbol}`;
  }
}

/**
 * # Token Utility Functions
 *
 * Helper functions for multi-token operations.
 */

/**
 * Get token configuration by type
 * @param tokenType - Token type enum value
 * @returns Token configuration
 */
export function getTokenConfig(tokenType: SupportedToken) {
  return TOKEN_CONFIG[tokenType];
}

/**
 * Get mint address for token and network
 * @param tokenType - Token type enum value
 * @param network - Network ('mainnet' or 'devnet')
 * @returns Mint address string
 */
export function getTokenMintAddress(
  tokenType: SupportedToken,
  network: 'mainnet' | 'devnet' = 'mainnet',
): string {
  return TOKEN_CONFIG[tokenType].mintAddress[network];
}

/**
 * Validate entry fee is within bounds for token
 * @param tokenType - Token type
 * @param amount - Amount in base units
 * @returns true if amount is valid
 */
export function isValidEntryFee(tokenType: SupportedToken, amount: string): boolean {
  const config = TOKEN_CONFIG[tokenType];
  const amountBigInt = BigInt(amount);
  return amountBigInt >= BigInt(config.minEntryFee) && amountBigInt <= BigInt(config.maxEntryFee);
}

/**
 * Convert display amount to base units
 * @param tokenType - Token type
 * @param displayAmount - Amount in display format (e.g., "10.50")
 * @returns Amount in base units as string
 */
export function toBaseUnits(tokenType: SupportedToken, displayAmount: string): string {
  const config = TOKEN_CONFIG[tokenType];
  const [whole, fraction = ''] = displayAmount.split('.');
  const paddedFraction = fraction.padEnd(config.decimals, '0').slice(0, config.decimals);
  return BigInt(whole + paddedFraction).toString();
}

/**
 * Convert base units to display amount
 * @param tokenType - Token type
 * @param baseUnits - Amount in base units
 * @returns Amount in display format
 */
export function toDisplayAmount(tokenType: SupportedToken, baseUnits: string): string {
  const config = TOKEN_CONFIG[tokenType];
  const value = BigInt(baseUnits);
  const divisor = BigInt(10 ** config.decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(config.decimals, '0');
  return `${whole}.${fractionStr.slice(0, config.displayPrecision)}`;
}

/**
 * Check if token is a stablecoin
 * @param tokenType - Token type
 * @returns true if token is a stablecoin
 */
export function isStablecoin(tokenType: SupportedToken): boolean {
  return TOKEN_CONFIG[tokenType].isStablecoin;
}

/**
 * Get all stablecoin token types
 * @returns Array of stablecoin token types
 */
export function getStablecoins(): SupportedToken[] {
  return Object.values(SupportedToken).filter((token) => TOKEN_CONFIG[token].isStablecoin);
}
