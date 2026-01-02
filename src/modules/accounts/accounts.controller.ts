import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from "@nestjs/swagger";
import { AccountsService } from "./accounts.service";
import { PdaService } from "./pda.service";
import { Account } from "./account.entity";
import { PublicKey } from "@solana/web3.js";
import { Cache } from "../../common/decorators/cache.decorator";
import { CacheInterceptor } from "../../common/interceptors/cache.interceptor";

/**
 * # Accounts Controller
 *
 * REST API for managing Solana accounts and Program Derived Addresses (PDAs).
 *
 * ## Solana Account Model
 *
 * In Solana, everything is an account. Unlike Ethereum's account/contract dichotomy,
 * Solana uses a unified account model where:
 *
 * - **Data Accounts**: Store arbitrary data (up to 10MB)
 * - **Program Accounts**: Store executable BPF bytecode
 * - **Native Accounts**: System-level accounts (e.g., System Program)
 *
 * Each account has:
 * - `lamports`: Balance in lamports (1 SOL = 1 billion lamports)
 * - `data`: Byte array storing account data
 * - `owner`: Program that owns the account
 * - `executable`: Whether the account contains a program
 * - `rent_epoch`: Epoch when rent is next due
 *
 * ## Program Derived Addresses (PDAs)
 *
 * PDAs are deterministic addresses derived from:
 * - A program ID
 * - A set of seeds (arbitrary bytes)
 * - A bump seed (ensures address is off the Ed25519 curve)
 *
 * PDAs enable programs to "sign" for accounts without a private key,
 * which is essential for escrows, vaults, and program-controlled accounts.
 *
 * @example
 * ```typescript
 * // Create an account record
 * POST /accounts
 * {
 *   "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
 *   "type": "token",
 *   "ownerProgram": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
 * }
 *
 * // Derive a PDA for an escrow
 * POST /accounts/pda/escrow
 * {
 *   "programId": "MyProgram11111111111111111111111111111111111",
 *   "escrowId": "trade-123",
 *   "authority": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
 * }
 * ```
 *
 * @see https://docs.solana.com/developing/programming-model/accounts - Solana Account Model
 * @see https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses - PDAs
 * @see [docs/diagrams/01-accounts-programs.md](docs/diagrams/01-accounts-programs.md) - Architecture Diagrams
 */
@ApiTags("accounts")
@Controller("accounts")
@UseInterceptors(CacheInterceptor)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly pdaService: PdaService,
  ) {}

  /**
   * Create a new account record in the database.
   *
   * This endpoint stores metadata about a Solana account locally.
   * It does NOT create an on-chain account (use SOL transfer for that).
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/accounts \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
   *     "type": "wallet",
   *     "label": "Treasury Wallet"
   *   }'
   * ```
   */
  @Post()
  @ApiOperation({
    summary: "Create a new account record",
    description: "Store metadata about a Solana account in the local database. Does not create on-chain accounts.",
  })
  @ApiBody({
    description: "Account data to store",
    schema: {
      type: "object",
      properties: {
        address: { type: "string", example: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
        type: { type: "string", enum: ["wallet", "program", "token", "pda", "system"], example: "wallet" },
        label: { type: "string", example: "My Treasury" },
      },
      required: ["address"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Account created successfully",
    type: Account,
  })
  create(@Body() createAccountDto: Partial<Account>) {
    return this.accountsService.create(createAccountDto);
  }

  /**
   * Retrieve all account records from the database.
   *
   * @returns Array of all stored account records
   */
  @Get()
  @ApiOperation({
    summary: "Get all accounts",
    description: "Retrieve all account records stored in the local database.",
  })
  @ApiResponse({
    status: 200,
    description: "List of accounts",
    type: [Account],
  })
  findAll() {
    return this.accountsService.findAll();
  }

  /**
   * Get a specific account record by its database ID.
   *
   * Results are cached for 5 minutes to reduce database load.
   */
  @Get(":id")
  @Cache({ ttl: 300, prefix: 'accounts' }) // Cache for 5 minutes
  @ApiOperation({
    summary: "Get account by ID",
    description: "Retrieve a specific account record by its database ID. Results are cached for 5 minutes.",
  })
  @ApiParam({ name: "id", description: "Database UUID of the account record" })
  @ApiResponse({ status: 200, description: "Account details", type: Account })
  @ApiResponse({ status: 404, description: "Account not found" })
  findOne(@Param("id") id: string) {
    return this.accountsService.findOne(id);
  }

  /**
   * Get an account record by its Solana public key address.
   *
   * @example
   * ```bash
   * curl http://localhost:3000/accounts/address/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
   * ```
   */
  @Get("address/:address")
  @Cache({ ttl: 300, prefix: 'accounts' }) // Cache for 5 minutes
  @ApiOperation({
    summary: "Get account by address",
    description: "Retrieve account record by Solana public key (base58 encoded). Cached for 5 minutes.",
  })
  @ApiParam({ name: "address", description: "Solana public key (base58)", example: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" })
  @ApiResponse({ status: 200, description: "Account details", type: Account })
  findByAddress(@Param("address") address: string) {
    return this.accountsService.findByAddress(address);
  }

  /**
   * Update an account record in the database.
   */
  @Put(":id")
  @ApiOperation({
    summary: "Update account",
    description: "Update an existing account record by its database ID.",
  })
  @ApiParam({ name: "id", description: "Database UUID of the account record" })
  @ApiResponse({
    status: 200,
    description: "Account updated successfully",
    type: Account,
  })
  update(@Param("id") id: string, @Body() updateAccountDto: Partial<Account>) {
    return this.accountsService.update(id, updateAccountDto);
  }

  /**
   * Delete an account record from the database.
   *
   * Note: This only removes the local record, not the on-chain account.
   */
  @Delete(":id")
  @ApiOperation({
    summary: "Delete account",
    description: "Remove an account record from the local database. Does not affect on-chain data.",
  })
  @ApiParam({ name: "id", description: "Database UUID of the account record" })
  @ApiResponse({ status: 200, description: "Account deleted successfully" })
  remove(@Param("id") id: string) {
    return this.accountsService.remove(id);
  }

  /**
   * Fetch live account information directly from the Solana blockchain.
   *
   * This queries the configured Solana RPC node and returns:
   * - `lamports`: Current balance in lamports
   * - `data`: Raw account data (base64 encoded)
   * - `owner`: Program that owns this account
   * - `executable`: Whether account is a program
   * - `rentEpoch`: When rent was last collected
   *
   * @example
   * ```bash
   * # Get info for System Program
   * curl http://localhost:3000/accounts/info/11111111111111111111111111111111
   * ```
   */
  @Get("info/:address")
  @Cache({ ttl: 60, prefix: 'blockchain' }) // Cache for 1 minute
  @ApiOperation({
    summary: "Get Solana account info from blockchain",
    description: "Fetch live account data from Solana RPC. Cached for 1 minute.",
  })
  @ApiParam({ name: "address", description: "Solana public key (base58)" })
  @ApiResponse({ status: 200, description: "Account info from Solana" })
  getAccountInfo(@Param("address") address: string) {
    return this.accountsService.getAccountInfo(address);
  }

  /**
   * Get the current SOL balance for an account from the blockchain.
   *
   * Returns balance in both lamports and SOL for convenience.
   *
   * @example
   * ```bash
   * curl http://localhost:3000/accounts/balance/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
   * # Response: { "lamports": 1000000000, "sol": 1.0 }
   * ```
   */
  @Get("balance/:address")
  @Cache({ ttl: 30, prefix: 'blockchain' }) // Cache for 30 seconds
  @ApiOperation({
    summary: "Get account balance from Solana",
    description: "Fetch current SOL balance from blockchain. Cached for 30 seconds.",
  })
  @ApiParam({ name: "address", description: "Solana public key (base58)" })
  @ApiResponse({ status: 200, description: "Account balance" })
  getBalance(@Param("address") address: string) {
    return this.accountsService.getBalance(address);
  }

  /**
   * Derive a Program Derived Address (PDA) from a program ID and seeds.
   *
   * ## How PDAs Work
   *
   * PDAs are computed using `findProgramAddressSync(seeds, programId)`:
   * 1. Seeds are concatenated with a "bump seed" (0-255)
   * 2. SHA256 hash is computed
   * 3. Result is checked against Ed25519 curve
   * 4. If on curve, bump is decremented and process repeats
   * 5. First off-curve result becomes the PDA
   *
   * This ensures no private key exists for the PDA, so only the
   * program can "sign" for it using CPI.
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/accounts/pda/derive \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
   *     "seeds": ["user", 12345]
   *   }'
   * # Response: { "address": "...", "bump": 254 }
   * ```
   *
   * @see https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses
   */
  @Post("pda/derive")
  @ApiOperation({
    summary: "Derive a Program Derived Address",
    description: "Compute a PDA from program ID and seeds. PDAs have no private key and can only be signed for by the owning program.",
  })
  @ApiBody({
    description: "PDA derivation parameters",
    schema: {
      type: "object",
      properties: {
        programId: { type: "string", example: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        seeds: { type: "array", items: { oneOf: [{ type: "string" }, { type: "number" }] }, example: ["user", 12345] },
      },
      required: ["programId", "seeds"],
    },
  })
  @ApiResponse({ status: 200, description: "PDA derivation result" })
  derivePDA(@Body() body: { programId: string; seeds: (string | number)[] }) {
    const programId = new PublicKey(body.programId);
    return this.pdaService.derivePDA(programId, body.seeds);
  }

  /**
   * Derive a PDA for a user's account within a program.
   *
   * Common pattern for per-user data storage in Solana programs.
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/accounts/pda/account \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "programId": "MyProgram11111111111111111111111111111111111",
   *     "ownerAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
   *     "accountType": "user_profile"
   *   }'
   * ```
   */
  @Post("pda/account")
  @ApiOperation({
    summary: "Derive an account PDA",
    description: "Derive a PDA for storing per-user data in a program.",
  })
  @ApiResponse({ status: 200, description: "Account PDA derivation result" })
  deriveAccountPDA(@Body() body: { programId: string; ownerAddress: string; accountType: string }) {
    const programId = new PublicKey(body.programId);
    const ownerAddress = new PublicKey(body.ownerAddress);
    return this.pdaService.deriveAccountPDA(programId, ownerAddress, body.accountType);
  }

  /**
   * Derive an Associated Token Account (ATA) address.
   *
   * ## Associated Token Accounts
   *
   * ATAs are the standard way to hold SPL tokens. Each wallet has one ATA
   * per token mint, derived deterministically using:
   * - Wallet address
   * - Token mint address
   * - Token Program ID
   *
   * This allows anyone to compute a user's token account address without
   * querying the blockchain.
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/accounts/pda/ata \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "tokenProgramId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
   *     "mintAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
   *     "ownerAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
   *   }'
   * ```
   *
   * @see https://spl.solana.com/associated-token-account
   */
  @Post("pda/ata")
  @ApiOperation({
    summary: "Derive Associated Token Account address",
    description: "Compute the ATA address for a wallet/mint pair. ATAs are the standard token holding accounts in Solana.",
  })
  @ApiResponse({ status: 200, description: "ATA address" })
  deriveATA(@Body() body: { tokenProgramId: string; mintAddress: string; ownerAddress: string }) {
    const tokenProgramId = new PublicKey(body.tokenProgramId);
    const mintAddress = new PublicKey(body.mintAddress);
    const ownerAddress = new PublicKey(body.ownerAddress);
    return this.pdaService.deriveAssociatedTokenAccount(tokenProgramId, mintAddress, ownerAddress);
  }

  /**
   * Validate that an address is a valid PDA for given program and seeds.
   *
   * Useful for verifying PDAs before using them in transactions.
   */
  @Post("pda/validate")
  @ApiOperation({
    summary: "Validate if address is a valid PDA",
    description: "Check if an address matches the expected PDA for given program and seeds.",
  })
  @ApiResponse({ status: 200, description: "PDA validation result" })
  validatePDA(@Body() body: { address: string; programId: string; seeds: (string | number)[] }) {
    const address = new PublicKey(body.address);
    const programId = new PublicKey(body.programId);
    return this.pdaService.validatePDA(address, programId, body.seeds);
  }

  /**
   * Derive an escrow PDA for secure fund holding.
   *
   * ## Escrow Pattern
   *
   * Escrows are a common pattern in Solana for:
   * - Atomic swaps
   * - Orderbook DEXes
   * - NFT marketplaces
   * - Lending protocols
   *
   * The escrow PDA holds funds and can only be released by the program.
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/accounts/pda/escrow \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "programId": "EscrowProgram111111111111111111111111111111",
   *     "escrowId": "trade-456",
   *     "authority": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
   *   }'
   * ```
   */
  @Post("pda/escrow")
  @ApiOperation({
    summary: "Derive an escrow PDA",
    description: "Derive a PDA for an escrow account that can securely hold funds.",
  })
  @ApiResponse({ status: 200, description: "Escrow PDA derivation result" })
  deriveEscrowPDA(@Body() body: { programId: string; escrowId: string; authority: string }) {
    const programId = new PublicKey(body.programId);
    const authority = new PublicKey(body.authority);
    return this.pdaService.deriveEscrowPDA(programId, body.escrowId, authority);
  }

  /**
   * Derive the metadata account PDA for an NFT.
   *
   * Metaplex Token Metadata Program stores NFT metadata in a PDA
   * derived from the mint address.
   *
   * @see https://docs.metaplex.com/programs/token-metadata/accounts
   */
  @Post("pda/metadata")
  @ApiOperation({
    summary: "Derive NFT metadata account PDA",
    description: "Compute the Metaplex metadata PDA for an NFT mint.",
  })
  @ApiResponse({ status: 200, description: "Metadata PDA address" })
  deriveMetadataPDA(@Body() body: { metadataProgramId: string; mintAddress: string }) {
    const metadataProgramId = new PublicKey(body.metadataProgramId);
    const mintAddress = new PublicKey(body.mintAddress);
    return this.pdaService.deriveMetadataPDA(metadataProgramId, mintAddress);
  }

  /**
   * Derive the master edition PDA for an NFT.
   *
   * Master editions control NFT supply and printing rights.
   *
   * @see https://docs.metaplex.com/programs/token-metadata/accounts#master-edition
   */
  @Post("pda/master-edition")
  @ApiOperation({
    summary: "Derive NFT master edition PDA",
    description: "Compute the Metaplex master edition PDA for an NFT mint.",
  })
  @ApiResponse({ status: 200, description: "Master edition PDA address" })
  deriveMasterEditionPDA(@Body() body: { metadataProgramId: string; mintAddress: string }) {
    const metadataProgramId = new PublicKey(body.metadataProgramId);
    const mintAddress = new PublicKey(body.mintAddress);
    return this.pdaService.deriveMasterEditionPDA(metadataProgramId, mintAddress);
  }
}
