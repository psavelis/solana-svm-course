import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CpiService } from "./cpi.service";
import { TransactionsService } from "../transactions/transactions.service";

export enum MarketplaceProgram {
  MAGIC_EDEN = "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K",
  TENSOR = "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN",
  HYPERSPACE = "HYPERfwdTjyJ2SCaKHmpF2MtrXqWxrsotYDsTrshHWq",
}

export interface NFTListingCPI {
  marketplace: MarketplaceProgram;
  nftMint: string;
  seller: string;
  price: number;
  auctionHouse?: string;
  expiry?: number;
}

export interface NFTBidCPI {
  marketplace: MarketplaceProgram;
  nftMint: string;
  bidder: string;
  bidAmount: number;
  auctionHouse?: string;
}

export interface NFTSaleCPI {
  marketplace: MarketplaceProgram;
  nftMint: string;
  seller: string;
  buyer: string;
  salePrice: number;
  auctionHouse?: string;
  royaltyPaid?: number;
}

@Injectable()
export class NFTMarketplaceCpiService {
  private readonly logger = new Logger(NFTMarketplaceCpiService.name);

  constructor(
    private readonly cpiService: CpiService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * List NFT on external marketplace via CPI
   */
  async listNFTOnMarketplace(
    userPrivateKey: string,
    listing: NFTListingCPI,
  ): Promise<string> {
    this.logger.log(
      `Listing NFT ${listing.nftMint} on ${listing.marketplace} for ${listing.price} SOL`,
    );

    try {
      // Build marketplace-specific listing instruction
      const listingInstruction = await this.buildListingInstruction(listing);

      // Execute CPI call to marketplace program
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        listing.marketplace,
        listingInstruction.data,
        listingInstruction.accounts,
        300000, // Higher compute for NFT operations
      );

      this.logger.log(`NFT listed successfully: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error(`Failed to list NFT on marketplace: ${error.message}`);
      throw new BadRequestException(
        `Failed to list NFT on marketplace: ${error.message}`,
      );
    }
  }

  /**
   * Place bid on NFT via CPI
   */
  async placeBidOnMarketplace(
    userPrivateKey: string,
    bid: NFTBidCPI,
  ): Promise<string> {
    this.logger.log(
      `Placing bid of ${bid.bidAmount} SOL on NFT ${bid.nftMint} via ${bid.marketplace}`,
    );

    try {
      // Build marketplace-specific bid instruction
      const bidInstruction = await this.buildBidInstruction(bid);

      // Execute CPI call to marketplace program
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        bid.marketplace,
        bidInstruction.data,
        bidInstruction.accounts,
        250000,
      );

      this.logger.log(`Bid placed successfully: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error(`Failed to place bid on marketplace: ${error.message}`);
      throw new BadRequestException(
        `Failed to place bid on marketplace: ${error.message}`,
      );
    }
  }

  /**
   * Execute NFT sale via CPI
   */
  async executeNFTSale(
    userPrivateKey: string,
    sale: NFTSaleCPI,
  ): Promise<string> {
    this.logger.log(
      `Executing sale of NFT ${sale.nftMint} for ${sale.salePrice} SOL via ${sale.marketplace}`,
    );

    try {
      // Build marketplace-specific sale instruction
      const saleInstruction = await this.buildSaleInstruction(sale);

      // Execute CPI call to marketplace program
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        sale.marketplace,
        saleInstruction.data,
        saleInstruction.accounts,
        350000, // Higher compute for sales with royalties
      );

      this.logger.log(`NFT sale executed successfully: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error(`Failed to execute NFT sale: ${error.message}`);
      throw new BadRequestException(
        `Failed to execute NFT sale: ${error.message}`,
      );
    }
  }

  /**
   * Cancel NFT listing via CPI
   */
  async cancelNFTListing(
    userPrivateKey: string,
    marketplace: MarketplaceProgram,
    nftMint: string,
    auctionHouse?: string,
  ): Promise<string> {
    this.logger.log(
      `Canceling listing for NFT ${nftMint} on ${marketplace}`,
    );

    try {
      // Build marketplace-specific cancel instruction
      const cancelInstruction = await this.buildCancelInstruction(
        marketplace,
        nftMint,
        auctionHouse,
      );

      // Execute CPI call to marketplace program
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        marketplace,
        cancelInstruction.data,
        cancelInstruction.accounts,
        200000,
      );

      this.logger.log(`NFT listing canceled successfully: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error(`Failed to cancel NFT listing: ${error.message}`);
      throw new BadRequestException(
        `Failed to cancel NFT listing: ${error.message}`,
      );
    }
  }

  /**
   * Update NFT listing price via CPI
   */
  async updateNFTListing(
    userPrivateKey: string,
    marketplace: MarketplaceProgram,
    nftMint: string,
    newPrice: number,
    auctionHouse?: string,
  ): Promise<string> {
    this.logger.log(
      `Updating listing price for NFT ${nftMint} to ${newPrice} SOL on ${marketplace}`,
    );

    try {
      // Build marketplace-specific update instruction
      const updateInstruction = await this.buildUpdateInstruction(
        marketplace,
        nftMint,
        newPrice,
        auctionHouse,
      );

      // Execute CPI call to marketplace program
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        marketplace,
        updateInstruction.data,
        updateInstruction.accounts,
        200000,
      );

      this.logger.log(`NFT listing updated successfully: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error(`Failed to update NFT listing: ${error.message}`);
      throw new BadRequestException(
        `Failed to update NFT listing: ${error.message}`,
      );
    }
  }

  /**
   * Build listing instruction for different marketplaces
   */
  private async buildListingInstruction(
    listing: NFTListingCPI,
  ): Promise<{ data: string; accounts: any[] }> {
    let instructionData: any;
    let accounts: any[];

    switch (listing.marketplace) {
      case MarketplaceProgram.MAGIC_EDEN:
        // Magic Eden v2 listing instruction structure
        instructionData = {
          instruction: 0, // List instruction
          price: listing.price,
          expiry: listing.expiry || Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
        };
        accounts = [
          {
            pubkey: listing.seller,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: listing.nftMint,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: listing.auctionHouse || "E8cA9TegvX3cEhpHq7gPs3z7WMXo6Wq9F3mK6T1qBz",
            isSigner: false,
            isWritable: true,
          },
        ];
        break;

      case MarketplaceProgram.TENSOR:
        // Tensor listing instruction structure
        instructionData = {
          instruction: "list",
          nftMint: listing.nftMint,
          price: listing.price,
          expiry: listing.expiry,
        };
        accounts = [
          {
            pubkey: listing.seller,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: listing.nftMint,
            isSigner: false,
            isWritable: false,
          },
        ];
        break;

      default:
        throw new BadRequestException(`Unsupported marketplace: ${listing.marketplace}`);
    }

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Build bid instruction for different marketplaces
   */
  private async buildBidInstruction(
    bid: NFTBidCPI,
  ): Promise<{ data: string; accounts: any[] }> {
    let instructionData: any;
    let accounts: any[];

    switch (bid.marketplace) {
      case MarketplaceProgram.MAGIC_EDEN:
        instructionData = {
          instruction: 1, // Bid instruction
          bidAmount: bid.bidAmount,
        };
        accounts = [
          {
            pubkey: bid.bidder,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: bid.nftMint,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: bid.auctionHouse || "E8cA9TegvX3cEhpHq7gPs3z7WMXo6Wq9F3mK6T1qBz",
            isSigner: false,
            isWritable: true,
          },
        ];
        break;

      case MarketplaceProgram.TENSOR:
        instructionData = {
          instruction: "bid",
          nftMint: bid.nftMint,
          bidAmount: bid.bidAmount,
        };
        accounts = [
          {
            pubkey: bid.bidder,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: bid.nftMint,
            isSigner: false,
            isWritable: false,
          },
        ];
        break;

      default:
        throw new BadRequestException(`Unsupported marketplace: ${bid.marketplace}`);
    }

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Build sale instruction for different marketplaces
   */
  private async buildSaleInstruction(
    sale: NFTSaleCPI,
  ): Promise<{ data: string; accounts: any[] }> {
    let instructionData: any;
    let accounts: any[];

    switch (sale.marketplace) {
      case MarketplaceProgram.MAGIC_EDEN:
        instructionData = {
          instruction: 2, // Sale instruction
          salePrice: sale.salePrice,
          royaltyPaid: sale.royaltyPaid || 0,
        };
        accounts = [
          {
            pubkey: sale.seller,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: sale.buyer,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: sale.nftMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: sale.auctionHouse || "E8cA9TegvX3cEhpHq7gPs3z7WMXo6Wq9F3mK6T1qBz",
            isSigner: false,
            isWritable: true,
          },
        ];
        break;

      case MarketplaceProgram.TENSOR:
        instructionData = {
          instruction: "sale",
          nftMint: sale.nftMint,
          salePrice: sale.salePrice,
          royaltyPaid: sale.royaltyPaid,
        };
        accounts = [
          {
            pubkey: sale.seller,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: sale.buyer,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: sale.nftMint,
            isSigner: false,
            isWritable: true,
          },
        ];
        break;

      default:
        throw new BadRequestException(`Unsupported marketplace: ${sale.marketplace}`);
    }

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Build cancel instruction for different marketplaces
   */
  private async buildCancelInstruction(
    marketplace: MarketplaceProgram,
    nftMint: string,
    auctionHouse?: string,
  ): Promise<{ data: string; accounts: any[] }> {
    let instructionData: any;
    let accounts: any[];

    switch (marketplace) {
      case MarketplaceProgram.MAGIC_EDEN:
        instructionData = {
          instruction: 3, // Cancel instruction
        };
        accounts = [
          {
            pubkey: "", // Will be set by caller
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: nftMint,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: auctionHouse || "E8cA9TegvX3cEhpHq7gPs3z7WMXo6Wq9F3mK6T1qBz",
            isSigner: false,
            isWritable: true,
          },
        ];
        break;

      case MarketplaceProgram.TENSOR:
        instructionData = {
          instruction: "cancel",
          nftMint,
        };
        accounts = [
          {
            pubkey: "", // Will be set by caller
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: nftMint,
            isSigner: false,
            isWritable: false,
          },
        ];
        break;

      default:
        throw new BadRequestException(`Unsupported marketplace: ${marketplace}`);
    }

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Build update instruction for different marketplaces
   */
  private async buildUpdateInstruction(
    marketplace: MarketplaceProgram,
    nftMint: string,
    newPrice: number,
    auctionHouse?: string,
  ): Promise<{ data: string; accounts: any[] }> {
    let instructionData: any;
    let accounts: any[];

    switch (marketplace) {
      case MarketplaceProgram.MAGIC_EDEN:
        instructionData = {
          instruction: 4, // Update instruction
          newPrice,
        };
        accounts = [
          {
            pubkey: "", // Will be set by caller
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: nftMint,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: auctionHouse || "E8cA9TegvX3cEhpHq7gPs3z7WMXo6Wq9F3mK6T1qBz",
            isSigner: false,
            isWritable: true,
          },
        ];
        break;

      case MarketplaceProgram.TENSOR:
        instructionData = {
          instruction: "update",
          nftMint,
          newPrice,
        };
        accounts = [
          {
            pubkey: "", // Will be set by caller
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: nftMint,
            isSigner: false,
            isWritable: false,
          },
        ];
        break;

      default:
        throw new BadRequestException(`Unsupported marketplace: ${marketplace}`);
    }

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Get supported marketplaces
   */
  getSupportedMarketplaces(): MarketplaceProgram[] {
    return Object.values(MarketplaceProgram);
  }

  /**
   * Validate marketplace program ID
   */
  isValidMarketplace(marketplace: string): boolean {
    return Object.values(MarketplaceProgram).includes(marketplace as MarketplaceProgram);
  }
}