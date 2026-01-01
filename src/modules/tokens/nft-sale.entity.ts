import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity("nft_sales")
export class NFTSale {
  /**
   * unique identifier for the sale record
   * usage: internal database reference
   * example: "d4e5f6g7-h8i9-0j1k-2l3m-4n5o6p7q8r9s"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * mint address of the sold nft
   * usage: identifies the asset traded
   * example: "4z5x6c7v-8b9n-0m1l-2k3j-4h5g6f7d8s9a"
   * reference: https://docs.metaplex.com/programs/token-metadata/accounts
   */
  @Column({ name: "nft_mint_address" })
  nftMintAddress: string;

  /**
   * address of the seller
   * usage: identifies the previous owner
   * example: "5q6w7e8r-9t0y-1u2i-3o4p-5a6s7d8f9g0h"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column({ name: "seller_address" })
  sellerAddress: string;

  /**
   * address of the buyer
   * usage: identifies the new owner
   * example: "6y7u8i9o-0p1q-2w3e-4r5t-6y7u8i9o0p1q"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column({ name: "buyer_address" })
  buyerAddress: string;

  /**
   * sale price
   * usage: transaction amount
   * example: 50.0
   * reference: none
   */
  @Column({ type: "decimal", precision: 20, scale: 9 })
  price: number;

  /**
   * mint address of the payment currency
   * usage: specifies payment token (null for sol)
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://spl.solana.com/token
   */
  @Column({ name: "currency_mint", nullable: true })
  currencyMint: string;

  /**
   * amount paid as royalty
   * usage: records creator earnings
   * example: 2.5
   * reference: https://docs.metaplex.com/programs/token-metadata/royalty-enforcement
   */
  @Column({ name: "royalty_amount", type: "decimal", precision: 20, scale: 9, default: "0" })
  royaltyAmount: number;

  /**
   * amount paid as marketplace fee
   * usage: records platform revenue
   * example: 1.0
   * reference: none
   */
  @Column({ name: "marketplace_fee", type: "decimal", precision: 20, scale: 9, default: "0" })
  marketplaceFee: number;

  /**
   * on-chain transaction signature
   * usage: proof of sale on the blockchain
   * example: "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHir..."
   * reference: https://solana.com/docs/core/transactions
   */
  @Column({ name: "transaction_signature" })
  transactionSignature: string;

  /**
   * timestamp when the sale occurred
   * usage: audit trail and reporting
   * example: "2024-07-15T14:30:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}