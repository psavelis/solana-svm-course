import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NFTListing } from './nft-listing.entity';

export enum BidStatus {
  ACTIVE = 'active',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  OUTBID = 'outbid',
}

@Entity('nft_bids')
export class NFTBid {
  /**
   * unique identifier for the bid
   * usage: internal database reference
   * example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * id of the listing this bid is for
   * usage: links the bid to a specific nft listing
   * example: "b2c3d4e5-f6g7-8901-2345-678901bcdef0"
   * reference: https://typeorm.io/relations
   */
  @Column({ name: 'listing_id' })
  listingId: string;

  /**
   * nft listing entity relation
   * usage: navigation to the parent listing
   * example: NFTListing object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => NFTListing, (listing) => listing.bids)
  @JoinColumn({ name: 'listing_id' })
  listing: NFTListing;

  /**
   * address of the bidder
   * usage: identifies who placed the bid
   * example: "3x4y5z6a-7b8c-9d0e-1f2g-3h4i5j6k7l8m"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column({ name: 'bidder_address' })
  bidderAddress: string;

  /**
   * bid amount
   * usage: the price offered for the nft
   * example: 10.5
   * reference: none
   */
  @Column({ type: 'decimal', precision: 20, scale: 9 })
  amount: number;

  /**
   * mint address of the currency used for the bid
   * usage: specifies the token used for payment (null for sol)
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" (usdc)
   * reference: https://spl.solana.com/token
   */
  @Column({ name: 'currency_mint', nullable: true })
  currencyMint: string;

  /**
   * current status of the bid
   * usage: tracks the state of the offer
   * example: "active"
   * reference: none
   */
  @Column({
    type: 'enum',
    enum: BidStatus,
    default: BidStatus.ACTIVE,
  })
  status: BidStatus;

  /**
   * timestamp when the bid was created
   * usage: audit trail and ordering
   * example: "2024-07-01T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * timestamp when the bid was last updated
   * usage: tracks changes to the bid status
   * example: "2024-07-02T11:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
