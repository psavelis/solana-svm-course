import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { NFTBid } from './nft-bid.entity';

export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum ListingType {
  FIXED_PRICE = 'fixed_price',
  AUCTION = 'auction',
}

@Entity('nft_listings')
export class NFTListing {
  /**
   * unique identifier for the listing
   * usage: internal database reference
   * example: "c3d4e5f6-g7h8-9012-3456-789012abcdef"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * mint address of the nft being listed
   * usage: identifies the asset for sale
   * example: "4z5x6c7v-8b9n-0m1l-2k3j-4h5g6f7d8s9a"
   * reference: https://docs.metaplex.com/programs/token-metadata/accounts
   */
  @Column({ name: 'nft_mint_address' })
  nftMintAddress: string;

  /**
   * address of the seller
   * usage: identifies the current owner/seller
   * example: "5q6w7e8r-9t0y-1u2i-3o4p-5a6s7d8f9g0h"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column({ name: 'seller_address' })
  sellerAddress: string;

  /**
   * type of listing (fixed price or auction)
   * usage: determines the sale mechanism
   * example: "fixed_price"
   * reference: none
   */
  @Column({ name: 'listing_type', type: 'enum', enum: ListingType })
  listingType: ListingType;

  /**
   * listing price
   * usage: amount required to purchase the nft
   * example: 50.0
   * reference: none
   */
  @Column({ type: 'decimal', precision: 20, scale: 9 })
  price: number; // In SOL or token amount

  /**
   * mint address of the currency accepted
   * usage: specifies payment token (null for sol)
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://spl.solana.com/token
   */
  @Column({ name: 'currency_mint', nullable: true })
  currencyMint: string; // Token mint for payment, null for SOL

  /**
   * current status of the listing
   * usage: tracks availability
   * example: "active"
   * reference: none
   */
  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  /**
   * royalty percentage for the creator
   * usage: calculates creator earnings on sale
   * example: 5.00
   * reference: https://docs.metaplex.com/programs/token-metadata/royalty-enforcement
   */
  @Column({ name: 'royalty_percentage', type: 'decimal', precision: 5, scale: 2, default: '0' })
  royaltyPercentage: number; // Creator royalty

  /**
   * address to receive royalties
   * usage: destination for royalty payments
   * example: "6y7u8i9o-0p1q-2w3e-4r5t-6y7u8i9o0p1q"
   * reference: none
   */
  @Column({ name: 'royalty_recipient', nullable: true })
  royaltyRecipient: string;

  /**
   * end time for auction listings
   * usage: determines when the auction closes
   * example: "2024-08-01T12:00:00Z"
   * reference: none
   */
  @Column({ name: 'auction_end_time', type: 'timestamp', nullable: true })
  auctionEndTime: Date;

  /**
   * fee percentage taken by the marketplace
   * usage: calculates platform revenue
   * example: 2.00
   * reference: none
   */
  @Column({ name: 'marketplace_fee', type: 'decimal', precision: 5, scale: 2, default: '2.00' })
  marketplaceFee: number; // Marketplace fee percentage

  /**
   * collection of bids placed on this listing
   * usage: navigation to bids
   * example: [NFTBid, NFTBid]
   * reference: https://typeorm.io/one-to-many-relation
   */
  @OneToMany(() => NFTBid, (bid) => bid.listing)
  bids: NFTBid[];

  /**
   * timestamp when the listing was created
   * usage: audit trail
   * example: "2024-07-10T09:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * timestamp when the listing was last updated
   * usage: tracks changes
   * example: "2024-07-11T10:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
