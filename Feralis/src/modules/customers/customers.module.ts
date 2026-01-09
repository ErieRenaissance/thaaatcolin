// =============================================================================
// FERALIS PLATFORM - CUSTOMERS MODULE
// =============================================================================

import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerContactsController } from './customer-contacts.controller';
import { CustomerAddressesController } from './customer-addresses.controller';

@Module({
  controllers: [
    CustomersController,
    CustomerContactsController,
    CustomerAddressesController,
  ],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
