import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { NFTBid } from "./nft-bid.entity";

export enum ListingStatus {
  ACTIVE = "active",
  SOLD = "sold",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export enum ListingType {
  FIXED_PRICE = "fixed_price",
  AUCTION = "auction",
}

@Entity("nft_listings")
export class NFTListing {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "nft_mint_address" })
  nftMintAddress: string;

  @Column({ name: "seller_address" })
  sellerAddress: string;

  @Column({ name: "listing_type", type: "enum", enum: ListingType })
  listingType: ListingType;

  @Column({ type: "decimal", precision: 20, scale: 9 })
  price: number; // In SOL or token amount

  @Column({ name: "currency_mint", nullable: true })
  currencyMint: string; // Token mint for payment, null for SOL

  @Column({
    type: "enum",
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  @Column({ name: "royalty_percentage", type: "decimal", precision: 5, scale: 2, default: "0" })
  royaltyPercentage: number; // Creator royalty

  @Column({ name: "royalty_recipient", nullable: true })
  royaltyRecipient: string;

  @Column({ name: "auction_end_time", type: "timestamp", nullable: true })
  auctionEndTime: Date;

  @Column({ name: "marketplace_fee", type: "decimal", precision: 5, scale: 2, default: "2.00" })
  marketplaceFee: number; // Marketplace fee percentage

  @OneToMany(() => NFTBid, bid => bid.listing)
  bids: NFTBid[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}