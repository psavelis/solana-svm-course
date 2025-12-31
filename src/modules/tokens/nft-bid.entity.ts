import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { NFTListing } from "./nft-listing.entity";

export enum BidStatus {
  ACTIVE = "active",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  OUTBID = "outbid",
}

@Entity("nft_bids")
export class NFTBid {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "listing_id" })
  listingId: string;

  @ManyToOne(() => NFTListing, listing => listing.bids)
  @JoinColumn({ name: "listing_id" })
  listing: NFTListing;

  @Column({ name: "bidder_address" })
  bidderAddress: string;

  @Column({ type: "decimal", precision: 20, scale: 9 })
  amount: number;

  @Column({ name: "currency_mint", nullable: true })
  currencyMint: string;

  @Column({
    type: "enum",
    enum: BidStatus,
    default: BidStatus.ACTIVE,
  })
  status: BidStatus;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}