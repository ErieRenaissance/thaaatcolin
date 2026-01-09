// =============================================================================
// FERALIS PLATFORM - INVENTORY SERVICE
// =============================================================================
// Implements: INV-001 through INV-015

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Inventory,
  InventoryLocation,
  InventoryTransaction,
  InventoryTransactionType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

export interface PaginatedInventory {
  items: Inventory[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================================================
  // INV-001: Create Location
  // ===========================================================================

  async createLocation(
    createLocationDto: CreateLocationDto,
    organizationId: string,
    facilityId: string,
    userId?: string,
  ): Promise<InventoryLocation> {
    // Check for duplicate code
    const existing = await this.prisma.inventoryLocation.findFirst({
      where: {
        facilityId,
        code: createLocationDto.code.toUpperCase(),
      },
    });

    if (existing) {
      throw new ConflictException('Location code already exists in this facility');
    }

    const location = await this.prisma.inventoryLocation.create({
      data: {
        ...createLocationDto,
        organizationId,
        facilityId,
        code: createLocationDto.code.toUpperCase(),
        createdBy: userId,
      },
    });

    await this.auditService.log({
      action: 'INVENTORY_LOCATION_CREATED',
      entityType: 'InventoryLocation',
      entityId: location.id,
      entityName: `${location.code} - ${location.name}`,
      newValues: location,
      userId,
      organizationId,
    });

    return location;
  }

  // ===========================================================================
  // INV-002: Get Locations
  // ===========================================================================

  async findAllLocations(
    organizationId: string,
    facilityId?: string,
  ): Promise<InventoryLocation[]> {
    return this.prisma.inventoryLocation.findMany({
      where: {
        organizationId,
        ...(facilityId && { facilityId }),
        isActive: true,
      },
      orderBy: [{ facilityId: 'asc' }, { code: 'asc' }],
      include: {
        facility: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { inventory: true },
        },
      },
    });
  }

  // ===========================================================================
  // INV-003: Update Location
  // ===========================================================================

  async updateLocation(
    id: string,
    organizationId: string,
    updateLocationDto: UpdateLocationDto,
    userId?: string,
  ): Promise<InventoryLocation> {
    const existing = await this.prisma.inventoryLocation.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Location not found');
    }

    const location = await this.prisma.inventoryLocation.update({
      where: { id },
      data: updateLocationDto,
    });

    return location;
  }

  // ===========================================================================
  // INV-004: Query Inventory
  // ===========================================================================

  async findAllInventory(
    organizationId: string,
    query: QueryInventoryDto,
  ): Promise<PaginatedInventory> {
    const {
      page = 1,
      limit = 20,
      facilityId,
      locationId,
      partId,
      lotNumber,
      includeZeroQty = false,
      quarantinedOnly = false,
      sortBy = 'part',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {
      organizationId,
    };

    if (facilityId) {
      where.facilityId = facilityId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (partId) {
      where.partId = partId;
    }

    if (lotNumber) {
      where.lotNumber = { contains: lotNumber, mode: 'insensitive' };
    }

    if (!includeZeroQty) {
      where.quantityOnHand = { gt: 0 };
    }

    if (quarantinedOnly) {
      where.isQuarantined = true;
    }

    const orderBy: any = {};
    if (sortBy === 'part') {
      orderBy.part = { partNumber: sortOrder };
    } else if (sortBy === 'location') {
      orderBy.location = { code: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          part: {
            select: { id: true, partNumber: true, name: true },
          },
          location: {
            select: { id: true, code: true, name: true },
          },
          facility: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ===========================================================================
  // INV-005: Get Inventory by Part
  // ===========================================================================

  async getInventoryByPart(
    partId: string,
    organizationId: string,
  ): Promise<Inventory[]> {
    return this.prisma.inventory.findMany({
      where: {
        partId,
        organizationId,
        quantityOnHand: { gt: 0 },
      },
      include: {
        location: {
          select: { id: true, code: true, name: true, locationType: true },
        },
        facility: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { receivedDate: 'asc' },
    });
  }

  // ===========================================================================
  // INV-006: Record Receipt
  // ===========================================================================

  async recordReceipt(
    createTransactionDto: CreateTransactionDto,
    organizationId: string,
    facilityId: string,
    userId?: string,
  ): Promise<InventoryTransaction> {
    return this.createTransaction(
      {
        ...createTransactionDto,
        transactionType: InventoryTransactionType.RECEIPT,
      },
      organizationId,
      facilityId,
      userId,
    );
  }

  // ===========================================================================
  // INV-007: Record Issue
  // ===========================================================================

  async recordIssue(
    createTransactionDto: CreateTransactionDto,
    organizationId: string,
    facilityId: string,
    userId?: string,
  ): Promise<InventoryTransaction> {
    return this.createTransaction(
      {
        ...createTransactionDto,
        transactionType: InventoryTransactionType.ISSUE,
      },
      organizationId,
      facilityId,
      userId,
    );
  }

  // ===========================================================================
  // INV-008: Record Transfer
  // ===========================================================================

  async recordTransfer(
    partId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    organizationId: string,
    facilityId: string,
    lotNumber?: string,
    reason?: string,
    userId?: string,
  ): Promise<InventoryTransaction> {
    // Validate source inventory
    const sourceInventory = await this.prisma.inventory.findFirst({
      where: {
        partId,
        locationId: fromLocationId,
        ...(lotNumber && { lotNumber }),
      },
    });

    if (!sourceInventory || Number(sourceInventory.quantityAvailable) < quantity) {
      throw new BadRequestException('Insufficient inventory at source location');
    }

    const transactionNumber = await this.generateTransactionNumber(organizationId);

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Decrease source
      await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: {
          quantityOnHand: { decrement: quantity },
          quantityAvailable: { decrement: quantity },
        },
      });

      // Find or create destination inventory
      let destInventory = await tx.inventory.findFirst({
        where: {
          partId,
          locationId: toLocationId,
          lotNumber: lotNumber || null,
        },
      });

      if (destInventory) {
        await tx.inventory.update({
          where: { id: destInventory.id },
          data: {
            quantityOnHand: { increment: quantity },
            quantityAvailable: { increment: quantity },
          },
        });
      } else {
        destInventory = await tx.inventory.create({
          data: {
            organizationId,
            facilityId,
            locationId: toLocationId,
            partId,
            lotNumber,
            quantityOnHand: quantity,
            quantityAvailable: quantity,
            uom: sourceInventory.uom,
            unitCost: sourceInventory.unitCost,
            receivedDate: sourceInventory.receivedDate,
          },
        });
      }

      // Create transaction record
      return tx.inventoryTransaction.create({
        data: {
          organizationId,
          facilityId,
          transactionNumber,
          transactionType: InventoryTransactionType.TRANSFER,
          partId,
          lotNumber,
          fromLocationId,
          toLocationId,
          quantity,
          uom: sourceInventory.uom,
          unitCost: sourceInventory.unitCost,
          reason,
          createdBy: userId,
        },
      });
    });

    await this.auditService.log({
      action: 'INVENTORY_TRANSFER',
      entityType: 'InventoryTransaction',
      entityId: transaction.id,
      entityName: transactionNumber,
      newValues: { partId, fromLocationId, toLocationId, quantity },
      userId,
      organizationId,
    });

    return transaction;
  }

  // ===========================================================================
  // INV-009: Record Adjustment
  // ===========================================================================

  async recordAdjustment(
    partId: string,
    locationId: string,
    adjustmentQty: number,
    reason: string,
    organizationId: string,
    facilityId: string,
    lotNumber?: string,
    userId?: string,
  ): Promise<InventoryTransaction> {
    const transactionNumber = await this.generateTransactionNumber(organizationId);

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Find existing inventory
      let inventory = await tx.inventory.findFirst({
        where: {
          partId,
          locationId,
          lotNumber: lotNumber || null,
        },
      });

      if (inventory) {
        const newQtyOnHand = Math.max(0, Number(inventory.quantityOnHand) + adjustmentQty);
        const newQtyAvailable = Math.max(0, Number(inventory.quantityAvailable) + adjustmentQty);

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantityOnHand: newQtyOnHand,
            quantityAvailable: newQtyAvailable,
          },
        });
      } else if (adjustmentQty > 0) {
        // Create new inventory record for positive adjustment
        inventory = await tx.inventory.create({
          data: {
            organizationId,
            facilityId,
            locationId,
            partId,
            lotNumber,
            quantityOnHand: adjustmentQty,
            quantityAvailable: adjustmentQty,
          },
        });
      } else {
        throw new BadRequestException('Cannot create negative inventory');
      }

      // Create transaction record
      return tx.inventoryTransaction.create({
        data: {
          organizationId,
          facilityId,
          transactionNumber,
          transactionType: InventoryTransactionType.ADJUSTMENT,
          partId,
          lotNumber,
          fromLocationId: adjustmentQty < 0 ? locationId : null,
          toLocationId: adjustmentQty > 0 ? locationId : null,
          quantity: Math.abs(adjustmentQty),
          reason,
          createdBy: userId,
        },
      });
    });

    await this.auditService.log({
      action: 'INVENTORY_ADJUSTMENT',
      entityType: 'InventoryTransaction',
      entityId: transaction.id,
      entityName: transactionNumber,
      newValues: { partId, locationId, adjustmentQty, reason },
      userId,
      organizationId,
    });

    return transaction;
  }

  // ===========================================================================
  // INV-010: Set Quarantine
  // ===========================================================================

  async setQuarantine(
    inventoryId: string,
    organizationId: string,
    isQuarantined: boolean,
    reason?: string,
    userId?: string,
  ): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id: inventoryId, organizationId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    const updated = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        isQuarantined,
        quarantineReason: isQuarantined ? reason : null,
        // If quarantined, set available to 0
        quantityAvailable: isQuarantined ? 0 : inventory.quantityOnHand,
      },
    });

    await this.auditService.log({
      action: isQuarantined ? 'INVENTORY_QUARANTINED' : 'INVENTORY_QUARANTINE_RELEASED',
      entityType: 'Inventory',
      entityId: inventoryId,
      newValues: { isQuarantined, reason },
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // INV-011: Get Transaction History
  // ===========================================================================

  async getTransactionHistory(
    organizationId: string,
    partId?: string,
    locationId?: string,
    fromDate?: Date,
    toDate?: Date,
    limit: number = 100,
  ): Promise<InventoryTransaction[]> {
    const where: Prisma.InventoryTransactionWhereInput = {
      organizationId,
    };

    if (partId) {
      where.partId = partId;
    }

    if (locationId) {
      where.OR = [
        { fromLocationId: locationId },
        { toLocationId: locationId },
      ];
    }

    if (fromDate || toDate) {
      where.transactionDate = {};
      if (fromDate) where.transactionDate.gte = fromDate;
      if (toDate) where.transactionDate.lte = toDate;
    }

    return this.prisma.inventoryTransaction.findMany({
      where,
      take: limit,
      orderBy: { transactionDate: 'desc' },
      include: {
        part: {
          select: { id: true, partNumber: true, name: true },
        },
        fromLocation: {
          select: { id: true, code: true, name: true },
        },
        toLocation: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  // ===========================================================================
  // INV-012: Get Stock Summary
  // ===========================================================================

  async getStockSummary(
    organizationId: string,
    facilityId?: string,
  ): Promise<any> {
    const where: Prisma.InventoryWhereInput = {
      organizationId,
      quantityOnHand: { gt: 0 },
    };

    if (facilityId) {
      where.facilityId = facilityId;
    }

    const [
      totalItems,
      totalValue,
      byLocationType,
      quarantinedCount,
    ] = await Promise.all([
      this.prisma.inventory.count({ where }),
      this.prisma.inventory.aggregate({
        where,
        _sum: { totalCost: true },
      }),
      this.prisma.inventory.groupBy({
        by: ['locationId'],
        where,
        _sum: { quantityOnHand: true },
        _count: { id: true },
      }),
      this.prisma.inventory.count({
        where: { ...where, isQuarantined: true },
      }),
    ]);

    return {
      totalItems,
      totalValue: totalValue._sum.totalCost || 0,
      locationSummary: byLocationType,
      quarantinedItems: quarantinedCount,
    };
  }

  // ===========================================================================
  // Helper: Create Transaction
  // ===========================================================================

  private async createTransaction(
    dto: CreateTransactionDto & { transactionType: InventoryTransactionType },
    organizationId: string,
    facilityId: string,
    userId?: string,
  ): Promise<InventoryTransaction> {
    const transactionNumber = await this.generateTransactionNumber(organizationId);
    const { transactionType, partId, locationId, quantity, lotNumber, unitCost, reason } = dto;

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Update inventory based on transaction type
      if (transactionType === InventoryTransactionType.RECEIPT) {
        // Find or create inventory record
        let inventory = await tx.inventory.findFirst({
          where: {
            partId,
            locationId,
            lotNumber: lotNumber || null,
          },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantityOnHand: { increment: quantity },
              quantityAvailable: { increment: quantity },
              unitCost: unitCost || inventory.unitCost,
              totalCost: unitCost 
                ? (Number(inventory.quantityOnHand) + quantity) * unitCost
                : inventory.totalCost,
            },
          });
        } else {
          inventory = await tx.inventory.create({
            data: {
              organizationId,
              facilityId,
              locationId,
              partId,
              lotNumber,
              quantityOnHand: quantity,
              quantityAvailable: quantity,
              unitCost,
              totalCost: unitCost ? quantity * unitCost : null,
              receivedDate: new Date(),
            },
          });
        }
      } else if (transactionType === InventoryTransactionType.ISSUE) {
        const inventory = await tx.inventory.findFirst({
          where: {
            partId,
            locationId,
            lotNumber: lotNumber || null,
          },
        });

        if (!inventory || Number(inventory.quantityAvailable) < quantity) {
          throw new BadRequestException('Insufficient inventory');
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantityOnHand: { decrement: quantity },
            quantityAvailable: { decrement: quantity },
          },
        });
      }

      // Create transaction record
      return tx.inventoryTransaction.create({
        data: {
          organizationId,
          facilityId,
          transactionNumber,
          transactionType,
          partId,
          lotNumber,
          fromLocationId: transactionType === InventoryTransactionType.ISSUE ? locationId : null,
          toLocationId: transactionType === InventoryTransactionType.RECEIPT ? locationId : null,
          quantity,
          unitCost,
          totalCost: unitCost ? quantity * unitCost : null,
          reason,
          createdBy: userId,
        },
      });
    });

    await this.auditService.log({
      action: `INVENTORY_${transactionType}`,
      entityType: 'InventoryTransaction',
      entityId: transaction.id,
      entityName: transactionNumber,
      newValues: { partId, locationId, quantity, transactionType },
      userId,
      organizationId,
    });

    return transaction;
  }

  // ===========================================================================
  // Helper: Generate Transaction Number
  // ===========================================================================

  private async generateTransactionNumber(organizationId: string): Promise<string> {
    const today = new Date();
    const prefix = `IT${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    const lastTx = await this.prisma.inventoryTransaction.findFirst({
      where: {
        organizationId,
        transactionNumber: { startsWith: prefix },
      },
      orderBy: { transactionNumber: 'desc' },
    });

    let sequence = 1;
    if (lastTx) {
      const lastNumber = parseInt(lastTx.transactionNumber.slice(-4), 10);
      sequence = lastNumber + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }
}
