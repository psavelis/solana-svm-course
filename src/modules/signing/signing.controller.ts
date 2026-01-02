import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import {
  SigningService,
  KeyPairResponse,
  SigningResult,
  VerificationResult,
  HardwareWalletType,
  HardwareWalletConfig,
  HardwareWalletSignature,
  MultiSigConfig,
  MultiSigTransaction,
  OfflineSigningRequest,
  OfflineSignature,
} from "./signing.service";
import {
  GenerateKeyPairDto,
  SignMessageDto,
  VerifySignatureDto,
  CreateTransferDto,
  GetPublicKeyDto,
  CreateMultiSigAccountDto,
  CreateMultiSigTransactionDto,
  SignMultiSigTransactionDto,
  ExecuteMultiSigTransactionDto,
  CreateOfflineSigningRequestDto,
  CreateOfflineMessageSigningRequestDto,
  SignOfflineRequestDto,
  CancelOfflineSigningRequestDto,
} from "./dto/signing.dto";

/**
 * # Signing Controller
 *
 * REST API for cryptographic signing, multi-sig, hardware wallets, and offline signing.
 *
 * ## Solana Cryptography
 *
 * Solana uses **Ed25519** for all signing operations:
 *
 * - **Key Pairs**: 32-byte private key → 32-byte public key
 * - **Signatures**: 64-byte Ed25519 signatures
 * - **Addresses**: Base58-encoded public keys
 *
 * ## Signing Methods
 *
 * | Method | Use Case | Security |
 * |--------|----------|----------|
 * | Direct | Development/testing | Low (key in memory) |
 * | Hardware Wallet | User funds | High (key on device) |
 * | Multi-Sig | Treasury/DAO | Very High (M of N) |
 * | Offline | Air-gapped signing | Very High (cold storage) |
 *
 * ## Multi-Signature Transactions
 *
 * Multi-sig requires M of N signers to approve:
 *
 * ```
 * [Create MultiSig Account] (2 of 3 required)
 *          ↓
 * [Create Transaction] → Pending
 *          ↓
 * [Signer 1 Signs] → 1/2 signatures
 *          ↓
 * [Signer 2 Signs] → 2/2 signatures ✓
 *          ↓
 * [Execute Transaction]
 * ```
 *
 * ## Offline Signing Flow
 *
 * For air-gapped/cold storage signing:
 *
 * ```
 * [Online Machine] → Create signing request
 *          ↓
 * [Export QR/file] → Transfer to offline
 *          ↓
 * [Offline Machine] → Sign with cold key
 *          ↓
 * [Export signature] → Transfer to online
 *          ↓
 * [Online Machine] → Submit transaction
 * ```
 *
 * @example
 * ```typescript
 * // Generate new keypair
 * POST /signing/generate-keypair
 * {}
 * // Response: { publicKey: "...", privateKey: "..." }
 *
 * // Sign message with hardware wallet
 * POST /signing/hardware-wallet/sign-message
 * {
 *   "message": "base64-message",
 *   "config": {
 *     "walletType": "ledger",
 *     "derivationPath": "44'/501'/0'/0'"
 *   }
 * }
 *
 * // Create multi-sig transaction
 * POST /signing/multisig/create-transaction
 * {
 *   "multiSigAccountId": "account-uuid",
 *   "transaction": { ... },
 *   "creatorPrivateKey": "..."
 * }
 * ```
 *
 * @see https://docs.solana.com/wallet-guide/paper-wallet - Key Management
 * @see https://docs.solana.com/cli/transfer-tokens#offline-signing - Offline Signing
 * @see [docs/diagrams/07-signing-cryptography.md](docs/diagrams/07-signing-cryptography.md) - Architecture
 */
@ApiTags("signing")
@Controller("signing")
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Post("generate-keypair")
  @ApiOperation({ summary: "Generate a new Ed25519 keypair" })
  @ApiResponse({
    status: 201,
    description: "Keypair generated successfully",
    type: Object,
  })
  generateKeyPair(@Body() dto: GenerateKeyPairDto): KeyPairResponse {
    return this.signingService.generateKeyPair();
  }

  @Post("sign-message")
  @ApiOperation({ summary: "Sign a message using Ed25519" })
  @ApiResponse({
    status: 201,
    description: "Message signed successfully",
    type: Object,
  })
  signMessage(@Body() dto: SignMessageDto): SigningResult {
    const messageBytes = Buffer.from(dto.message, "base64");
    return this.signingService.signMessage(dto.privateKey, messageBytes);
  }

  @Post("verify-signature")
  @ApiOperation({
    summary: "Verify a signature against a message and public key",
  })
  @ApiResponse({
    status: 201,
    description: "Signature verification result",
    type: Object,
  })
  verifySignature(@Body() dto: VerifySignatureDto): VerificationResult {
    const messageBytes = Buffer.from(dto.message, "base64");
    return this.signingService.verifySignature(
      dto.signature,
      messageBytes,
      dto.publicKey,
    );
  }

  @Post("create-transfer")
  @ApiOperation({ summary: "Create and sign a SOL transfer transaction" })
  @ApiResponse({
    status: 201,
    description: "Transfer transaction signed and sent",
    type: Object,
  })
  async createAndSignTransfer(
    @Body() dto: CreateTransferDto,
  ): Promise<SigningResult> {
    return this.signingService.createAndSignTransfer(
      dto.privateKey,
      dto.toAddress,
      dto.amount,
    );
  }

  @Post("get-public-key")
  @ApiOperation({ summary: "Get public key from private key (for validation)" })
  @ApiResponse({
    status: 201,
    description: "Public key extracted",
    type: String,
  })
  getPublicKeyFromPrivateKey(@Body() dto: GetPublicKeyDto): string {
    return this.signingService.getPublicKeyFromPrivateKey(dto.privateKey);
  }

  @Post("hardware-wallet/public-key")
  @ApiOperation({ summary: "Get public key from hardware wallet" })
  @ApiResponse({
    status: 200,
    description: "Hardware wallet public key retrieved successfully",
  })
  async getHardwareWalletPublicKey(
    @Body() config: HardwareWalletConfig,
  ): Promise<string> {
    return await this.signingService.getHardwareWalletPublicKey(config);
  }

  @Post("hardware-wallet/sign-transaction")
  @ApiOperation({ summary: "Sign transaction with hardware wallet" })
  @ApiResponse({
    status: 200,
    description: "Transaction signed with hardware wallet successfully",
  })
  async signTransactionWithHardwareWallet(
    @Body()
    body: {
      transaction: any; // Serialized transaction
      config: HardwareWalletConfig;
    },
  ): Promise<HardwareWalletSignature> {
    // Deserialize transaction
    const transaction = new (await import("@solana/web3.js")).Transaction();
    Object.assign(transaction, body.transaction);

    return await this.signingService.signTransactionWithHardwareWallet(
      transaction,
      body.config,
    );
  }

  @Post("hardware-wallet/sign-message")
  @ApiOperation({ summary: "Sign message with hardware wallet" })
  @ApiResponse({
    status: 200,
    description: "Message signed with hardware wallet successfully",
  })
  async signMessageWithHardwareWallet(
    @Body()
    body: {
      message: string; // Base64 encoded message
      config: HardwareWalletConfig;
    },
  ): Promise<HardwareWalletSignature> {
    const messageBytes = Buffer.from(body.message, "base64");

    return await this.signingService.signMessageWithHardwareWallet(
      messageBytes,
      body.config,
    );
  }

  @Post("multisig/create-account")
  @ApiOperation({ summary: "Create a multi-signature account" })
  @ApiResponse({
    status: 201,
    description: "Multi-signature account created successfully",
    type: String,
  })
  async createMultiSigAccount(@Body() dto: CreateMultiSigAccountDto): Promise<string> {
    return await this.signingService.createMultiSigAccount(dto);
  }

  @Post("multisig/create-transaction")
  @ApiOperation({ summary: "Create a multi-signature transaction" })
  @ApiResponse({
    status: 201,
    description: "Multi-signature transaction created successfully",
    type: String,
  })
  async createMultiSigTransaction(@Body() dto: CreateMultiSigTransactionDto): Promise<string> {
    // Deserialize transaction
    const transaction = new (await import("@solana/web3.js")).Transaction();
    Object.assign(transaction, dto.transactionData);

    return await this.signingService.createMultiSigTransaction(
      dto.multiSigAddress,
      transaction,
    );
  }

  @Post("multisig/sign")
  @ApiOperation({ summary: "Add signature to multi-signature transaction" })
  @ApiResponse({
    status: 200,
    description: "Signature added successfully",
    type: Object,
  })
  async signMultiSigTransaction(@Body() dto: SignMultiSigTransactionDto): Promise<MultiSigTransaction> {
    return await this.signingService.signMultiSigTransaction(
      dto.txId,
      dto.signerPrivateKey,
    );
  }

  @Post("multisig/execute")
  @ApiOperation({ summary: "Execute a multi-signature transaction" })
  @ApiResponse({
    status: 200,
    description: "Transaction executed successfully",
    type: String,
  })
  async executeMultiSigTransaction(@Body() dto: ExecuteMultiSigTransactionDto): Promise<string> {
    return await this.signingService.executeMultiSigTransaction(dto.txId);
  }

  @Get("multisig/transaction")
  @ApiOperation({ summary: "Get multi-signature transaction status" })
  @ApiResponse({
    status: 200,
    description: "Transaction details retrieved successfully",
    type: Object,
  })
  getMultiSigTransaction(@Query("txId") txId: string): MultiSigTransaction {
    return this.signingService.getMultiSigTransaction(txId);
  }

  @Get("multisig/accounts")
  @ApiOperation({ summary: "Get all multi-signature accounts" })
  @ApiResponse({
    status: 200,
    description: "Multi-signature accounts retrieved successfully",
    type: Array,
  })
  getMultiSigAccounts(): Array<{ address: string; config: MultiSigConfig; createdAt: Date }> {
    return this.signingService.getMultiSigAccounts();
  }

  @Post("offline/create-request")
  @ApiOperation({ summary: "Create an offline transaction signing request" })
  @ApiResponse({
    status: 201,
    description: "Offline signing request created successfully",
    type: Object,
  })
  async createOfflineSigningRequest(@Body() dto: CreateOfflineSigningRequestDto): Promise<OfflineSigningRequest> {
    const transaction = new (await import("@solana/web3.js")).Transaction();
    Object.assign(transaction, dto.transactionData);

    return this.signingService.createOfflineSigningRequest(
      transaction,
      dto.publicKey,
      dto.expiresIn,
    );
  }

  @Post("offline/create-message-request")
  @ApiOperation({ summary: "Create an offline message signing request" })
  @ApiResponse({
    status: 201,
    description: "Offline message signing request created successfully",
    type: Object,
  })
  createOfflineMessageSigningRequest(@Body() dto: CreateOfflineMessageSigningRequestDto): OfflineSigningRequest {
    const messageBytes = Buffer.from(dto.message, "base64");

    return this.signingService.createOfflineMessageSigningRequest(
      messageBytes,
      dto.publicKey,
      dto.expiresIn,
    );
  }

  @Post("offline/sign")
  @ApiOperation({ summary: "Sign an offline request" })
  @ApiResponse({
    status: 200,
    description: "Offline request signed successfully",
    type: Object,
  })
  signOfflineRequest(@Body() dto: SignOfflineRequestDto): OfflineSignature {
    return this.signingService.signOfflineRequest(dto.requestId, dto.privateKey);
  }

  @Get("offline/request")
  @ApiOperation({ summary: "Get offline signing request status" })
  @ApiResponse({
    status: 200,
    description: "Request details retrieved successfully",
    type: Object,
  })
  getOfflineSigningRequest(@Query("requestId") requestId: string): OfflineSigningRequest {
    return this.signingService.getOfflineSigningRequest(requestId);
  }

  @Post("offline/cancel")
  @ApiOperation({ summary: "Cancel an offline signing request" })
  @ApiResponse({
    status: 200,
    description: "Request cancelled successfully",
  })
  cancelOfflineSigningRequest(@Body() dto: CancelOfflineSigningRequestDto): void {
    this.signingService.cancelOfflineSigningRequest(dto.requestId);
  }

  @Get("offline/requests")
  @ApiOperation({ summary: "Get all offline signing requests" })
  @ApiResponse({
    status: 200,
    description: "Requests retrieved successfully",
    type: Array,
  })
  getAllOfflineSigningRequests(): OfflineSigningRequest[] {
    return this.signingService.getAllOfflineSigningRequests();
  }
}
