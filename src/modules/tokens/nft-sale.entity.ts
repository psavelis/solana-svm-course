import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity("nft_sales")
export class NFTSale {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "nft_mint_address" })
  nftMintAddress: string;

  @Column({ name: "seller_address" })
  sellerAddress: string;

  @Column({ name: "buyer_address" })
  buyerAddress: string;

  @Column({ type: "decimal", precision: 20, scale: 9 })
  price: number;

  @Column({ name: "currency_mint", nullable: true })
  currencyMint: string;

  @Column({ name: "royalty_amount", type: "decimal", precision: 20, scale: 9, default: "0" })
  royaltyAmount: number;

  @Column({ name: "marketplace_fee", type: "decimal", precision: 20, scale: 9, default: "0" })
  marketplaceFee: number;

  @Column({ name: "transaction_signature" })
  transactionSignature: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}