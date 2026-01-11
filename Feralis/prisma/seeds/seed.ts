// =============================================================================
// FERALIS PLATFORM - DATABASE SEED
// =============================================================================

import { PrismaClient, UserType, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ===========================================================================
  // Create Permissions
  // ===========================================================================
  console.log('Creating permissions...');
  
  const permissionData = [
    // Users
    { code: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
    { code: 'users.read', name: 'Read Users', module: 'users', action: 'read' },
    { code: 'users.update', name: 'Update Users', module: 'users', action: 'update' },
    { code: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
    
    // Roles
    { code: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create' },
    { code: 'roles.read', name: 'Read Roles', module: 'roles', action: 'read' },
    { code: 'roles.update', name: 'Update Roles', module: 'roles', action: 'update' },
    { code: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
    { code: 'roles.assign', name: 'Assign Roles', module: 'roles', action: 'assign' },
    
    // Permissions
    { code: 'permissions.read', name: 'Read Permissions', module: 'permissions', action: 'read' },
    
    // Organization
    { code: 'organization.read', name: 'Read Organization', module: 'organization', action: 'read' },
    { code: 'organization.update', name: 'Update Organization', module: 'organization', action: 'update' },
    
    // Facilities
    { code: 'facilities.create', name: 'Create Facilities', module: 'facilities', action: 'create' },
    { code: 'facilities.read', name: 'Read Facilities', module: 'facilities', action: 'read' },
    { code: 'facilities.update', name: 'Update Facilities', module: 'facilities', action: 'update' },
    { code: 'facilities.delete', name: 'Delete Facilities', module: 'facilities', action: 'delete' },
    
    // Audit
    { code: 'audit.read', name: 'Read Audit Logs', module: 'audit', action: 'read' },
    
    // Files
    { code: 'files.create', name: 'Upload Files', module: 'files', action: 'create' },
    { code: 'files.read', name: 'Read Files', module: 'files', action: 'read' },
    { code: 'files.delete', name: 'Delete Files', module: 'files', action: 'delete' },
    
    // Dashboard
    { code: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
    
    // Orders (for future phases)
    { code: 'orders.create', name: 'Create Orders', module: 'orders', action: 'create' },
    { code: 'orders.read', name: 'Read Orders', module: 'orders', action: 'read' },
    { code: 'orders.update', name: 'Update Orders', module: 'orders', action: 'update' },
    { code: 'orders.delete', name: 'Delete Orders', module: 'orders', action: 'delete' },
    
    // Quotes
    { code: 'quotes.create', name: 'Create Quotes', module: 'quotes', action: 'create' },
    { code: 'quotes.read', name: 'Read Quotes', module: 'quotes', action: 'read' },
    { code: 'quotes.update', name: 'Update Quotes', module: 'quotes', action: 'update' },
    { code: 'quotes.delete', name: 'Delete Quotes', module: 'quotes', action: 'delete' },
    { code: 'quotes.approve', name: 'Approve Quotes', module: 'quotes', action: 'approve' },
    
    // Production
    { code: 'production.read', name: 'Read Production', module: 'production', action: 'read' },
    { code: 'production.manage', name: 'Manage Production', module: 'production', action: 'manage' },
    { code: 'production.schedule', name: 'Schedule Production', module: 'production', action: 'schedule' },
    
    // Quality
    { code: 'quality.read', name: 'Read Quality', module: 'quality', action: 'read' },
    { code: 'quality.inspect', name: 'Perform Inspections', module: 'quality', action: 'inspect' },
    { code: 'quality.manage', name: 'Manage Quality', module: 'quality', action: 'manage' },
    
    // Customers (Phase 2)
    { code: 'customers.create', name: 'Create Customers', module: 'customers', action: 'create' },
    { code: 'customers.read', name: 'Read Customers', module: 'customers', action: 'read' },
    { code: 'customers.update', name: 'Update Customers', module: 'customers', action: 'update' },
    { code: 'customers.delete', name: 'Delete Customers', module: 'customers', action: 'delete' },
    
    // Parts (Phase 2)
    { code: 'parts.create', name: 'Create Parts', module: 'parts', action: 'create' },
    { code: 'parts.read', name: 'Read Parts', module: 'parts', action: 'read' },
    { code: 'parts.update', name: 'Update Parts', module: 'parts', action: 'update' },
    { code: 'parts.delete', name: 'Delete Parts', module: 'parts', action: 'delete' },
    { code: 'parts.approve', name: 'Approve Part Revisions', module: 'parts', action: 'approve' },
    
    // Inventory (Phase 3)
    { code: 'inventory.read', name: 'Read Inventory', module: 'inventory', action: 'read' },
    { code: 'inventory.create', name: 'Create Inventory Transactions', module: 'inventory', action: 'create' },
    { code: 'inventory.adjust', name: 'Adjust Inventory', module: 'inventory', action: 'adjust' },
    { code: 'inventory.manage', name: 'Manage Inventory Locations', module: 'inventory', action: 'manage' },
    
    // Work Centers (Phase 4)
    { code: 'production:work-centers:create', name: 'Create Work Centers', module: 'production', action: 'create' },
    { code: 'production:work-centers:read', name: 'Read Work Centers', module: 'production', action: 'read' },
    { code: 'production:work-centers:update', name: 'Update Work Centers', module: 'production', action: 'update' },
    { code: 'production:work-centers:delete', name: 'Delete Work Centers', module: 'production', action: 'delete' },
    
    // Machines (Phase 4)
    { code: 'production:machines:create', name: 'Create Machines', module: 'production', action: 'create' },
    { code: 'production:machines:read', name: 'Read Machines', module: 'production', action: 'read' },
    { code: 'production:machines:update', name: 'Update Machines', module: 'production', action: 'update' },
    { code: 'production:machines:delete', name: 'Delete Machines', module: 'production', action: 'delete' },
    { code: 'production:machines:operate', name: 'Operate Machines', module: 'production', action: 'operate' },
    
    // Maintenance (Phase 4)
    { code: 'production:maintenance:create', name: 'Create Maintenance', module: 'production', action: 'create' },
    { code: 'production:maintenance:read', name: 'Read Maintenance', module: 'production', action: 'read' },
    { code: 'production:maintenance:execute', name: 'Execute Maintenance', module: 'production', action: 'execute' },
    
    // Work Orders (Phase 4)
    { code: 'production:work-orders:create', name: 'Create Work Orders', module: 'production', action: 'create' },
    { code: 'production:work-orders:read', name: 'Read Work Orders', module: 'production', action: 'read' },
    { code: 'production:work-orders:update', name: 'Update Work Orders', module: 'production', action: 'update' },
    { code: 'production:work-orders:release', name: 'Release Work Orders', module: 'production', action: 'release' },
    { code: 'production:work-orders:complete', name: 'Complete Work Orders', module: 'production', action: 'complete' },
    { code: 'production:work-orders:close', name: 'Close Work Orders', module: 'production', action: 'close' },
    { code: 'production:work-orders:cancel', name: 'Cancel Work Orders', module: 'production', action: 'cancel' },
    
    // Shop Floor (Phase 4)
    { code: 'production:shop-floor:read', name: 'Read Shop Floor', module: 'production', action: 'read' },
    { code: 'production:shop-floor:execute', name: 'Execute Shop Floor Operations', module: 'production', action: 'execute' },
    { code: 'production:quality:approve', name: 'Approve Quality Inspections', module: 'production', action: 'approve' },
    
    // Labor (Phase 4)
    { code: 'production:labor:clock', name: 'Clock In/Out', module: 'production', action: 'clock' },
    { code: 'production:labor:read', name: 'Read Labor Entries', module: 'production', action: 'read' },
    { code: 'production:labor:create', name: 'Create Labor Entries', module: 'production', action: 'create' },
    { code: 'production:labor:update', name: 'Update Labor Entries', module: 'production', action: 'update' },
    { code: 'production:labor:delete', name: 'Delete Labor Entries', module: 'production', action: 'delete' },
    
    // Scrap (Phase 4)
    { code: 'production:scrap:read', name: 'Read Scrap Records', module: 'production', action: 'read' },
    { code: 'production:scrap:create', name: 'Create Scrap Records', module: 'production', action: 'create' },
    { code: 'production:scrap:update', name: 'Update Scrap Records', module: 'production', action: 'update' },
    
    // Scheduling (Phase 4)
    { code: 'production:scheduling:create', name: 'Create Schedules', module: 'production', action: 'create' },
    { code: 'production:scheduling:read', name: 'Read Schedules', module: 'production', action: 'read' },
    { code: 'production:scheduling:update', name: 'Update Schedules', module: 'production', action: 'update' },
    { code: 'production:scheduling:delete', name: 'Delete Schedules', module: 'production', action: 'delete' },
    
    // Quality - Inspections (Phase 5)
    { code: 'quality:inspections:create', name: 'Create Inspections', module: 'quality', action: 'create' },
    { code: 'quality:inspections:read', name: 'Read Inspections', module: 'quality', action: 'read' },
    { code: 'quality:inspections:update', name: 'Update Inspections', module: 'quality', action: 'update' },
    { code: 'quality:inspections:execute', name: 'Execute Inspections', module: 'quality', action: 'execute' },
    { code: 'quality:inspections:approve', name: 'Approve Inspections', module: 'quality', action: 'approve' },
    
    // Quality - NCRs (Phase 5)
    { code: 'quality:ncrs:create', name: 'Create NCRs', module: 'quality', action: 'create' },
    { code: 'quality:ncrs:read', name: 'Read NCRs', module: 'quality', action: 'read' },
    { code: 'quality:ncrs:update', name: 'Update NCRs', module: 'quality', action: 'update' },
    { code: 'quality:ncrs:disposition', name: 'Disposition NCRs', module: 'quality', action: 'disposition' },
    { code: 'quality:ncrs:close', name: 'Close NCRs', module: 'quality', action: 'close' },
    
    // Quality - CAPAs (Phase 5)
    { code: 'quality:capas:create', name: 'Create CAPAs', module: 'quality', action: 'create' },
    { code: 'quality:capas:read', name: 'Read CAPAs', module: 'quality', action: 'read' },
    { code: 'quality:capas:update', name: 'Update CAPAs', module: 'quality', action: 'update' },
    { code: 'quality:capas:verify', name: 'Verify CAPAs', module: 'quality', action: 'verify' },
    { code: 'quality:capas:close', name: 'Close CAPAs', module: 'quality', action: 'close' },
    
    // Finishing (Phase 5)
    { code: 'finishing:processes:create', name: 'Create Finishing Processes', module: 'finishing', action: 'create' },
    { code: 'finishing:processes:read', name: 'Read Finishing Processes', module: 'finishing', action: 'read' },
    { code: 'finishing:processes:update', name: 'Update Finishing Processes', module: 'finishing', action: 'update' },
    { code: 'finishing:processes:delete', name: 'Delete Finishing Processes', module: 'finishing', action: 'delete' },
    { code: 'finishing:jobs:create', name: 'Create Finishing Jobs', module: 'finishing', action: 'create' },
    { code: 'finishing:jobs:read', name: 'Read Finishing Jobs', module: 'finishing', action: 'read' },
    { code: 'finishing:jobs:update', name: 'Update Finishing Jobs', module: 'finishing', action: 'update' },
    { code: 'finishing:jobs:execute', name: 'Execute Finishing Jobs', module: 'finishing', action: 'execute' },
    
    // Packaging (Phase 5)
    { code: 'packaging:specs:create', name: 'Create Package Specs', module: 'packaging', action: 'create' },
    { code: 'packaging:specs:read', name: 'Read Package Specs', module: 'packaging', action: 'read' },
    { code: 'packaging:specs:update', name: 'Update Package Specs', module: 'packaging', action: 'update' },
    { code: 'packaging:specs:delete', name: 'Delete Package Specs', module: 'packaging', action: 'delete' },
    { code: 'packaging:packages:create', name: 'Create Packages', module: 'packaging', action: 'create' },
    { code: 'packaging:packages:read', name: 'Read Packages', module: 'packaging', action: 'read' },
    { code: 'packaging:packages:update', name: 'Update Packages', module: 'packaging', action: 'update' },
    { code: 'packaging:packages:pack', name: 'Pack Packages', module: 'packaging', action: 'pack' },
    
    // Shipping - Carriers (Phase 5)
    { code: 'shipping:carriers:create', name: 'Create Carriers', module: 'shipping', action: 'create' },
    { code: 'shipping:carriers:read', name: 'Read Carriers', module: 'shipping', action: 'read' },
    { code: 'shipping:carriers:update', name: 'Update Carriers', module: 'shipping', action: 'update' },
    { code: 'shipping:carriers:delete', name: 'Delete Carriers', module: 'shipping', action: 'delete' },
    
    // Shipping - Shipments (Phase 5)
    { code: 'shipping:shipments:create', name: 'Create Shipments', module: 'shipping', action: 'create' },
    { code: 'shipping:shipments:read', name: 'Read Shipments', module: 'shipping', action: 'read' },
    { code: 'shipping:shipments:update', name: 'Update Shipments', module: 'shipping', action: 'update' },
    { code: 'shipping:shipments:ship', name: 'Ship Shipments', module: 'shipping', action: 'ship' },
    { code: 'shipping:shipments:cancel', name: 'Cancel Shipments', module: 'shipping', action: 'cancel' },
  ];

  for (const perm of permissionData) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log(`✅ Created ${permissionData.length} permissions`);

  // ===========================================================================
  // Create System Roles
  // ===========================================================================
  console.log('Creating system roles...');

  const systemRoles = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      description: 'Full system access',
      permissions: permissionData.map(p => p.code),
    },
    {
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Organization administrator',
      permissions: permissionData.filter(p => 
        !['organization.update'].includes(p.code)
      ).map(p => p.code),
    },
    {
      code: 'MANAGER',
      name: 'Manager',
      description: 'Department manager',
      permissions: [
        'users.read', 'roles.read', 'permissions.read',
        'organization.read', 'facilities.read', 'audit.read',
        'files.create', 'files.read', 'files.delete',
        'dashboard.view',
        'orders.read', 'orders.update',
        'quotes.read', 'quotes.update', 'quotes.approve',
        'production.read', 'production.manage',
        'quality.read', 'quality.manage',
        'customers.read', 'customers.update',
        'parts.read', 'parts.update', 'parts.approve',
        'inventory.read', 'inventory.create', 'inventory.adjust', 'inventory.manage',
      ],
    },
    {
      code: 'OPERATOR',
      name: 'Operator',
      description: 'Production floor operator',
      permissions: [
        'dashboard.view',
        'orders.read',
        'production.read',
        'quality.read', 'quality.inspect',
        'files.read',
        'parts.read',
        'inventory.read', 'inventory.create',
      ],
    },
    {
      code: 'VIEWER',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [
        'dashboard.view',
        'orders.read',
        'quotes.read',
        'production.read',
        'quality.read',
        'files.read',
        'customers.read',
        'parts.read',
        'inventory.read',
      ],
    },
  ];

  for (const roleData of systemRoles) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_code: {
          organizationId: null,
          code: roleData.code,
        },
      },
      update: {},
      create: {
        code: roleData.code,
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
        organizationId: null,
      },
    });

    // Assign permissions to role
    for (const permCode of roleData.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { code: permCode },
      });
      
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }
  console.log(`✅ Created ${systemRoles.length} system roles`);

  // ===========================================================================
  // Create Demo Organization
  // ===========================================================================
  console.log('Creating demo organization...');

  const organization = await prisma.organization.upsert({
    where: { code: 'FERALIS' },
    update: {},
    create: {
      name: 'Feralis Manufacturing',
      legalName: 'Feralis Manufacturing LLC',
      code: 'FERALIS',
      primaryEmail: 'admin@feralis.com',
      primaryPhone: '+1-555-123-4567',
      addressLine1: '123 Industrial Way',
      city: 'Pittsburgh',
      state: 'PA',
      postalCode: '15201',
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
      settings: {
        theme: 'light',
        features: {
          quotes: true,
          production: true,
          quality: true,
          shipping: true,
        },
      },
    },
  });
  console.log(`✅ Created organization: ${organization.name}`);

  // ===========================================================================
  // Create Demo Facility
  // ===========================================================================
  console.log('Creating demo facility...');

  const facility = await prisma.facility.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'MAIN',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Main Manufacturing Plant',
      code: 'MAIN',
      type: 'MANUFACTURING',
      addressLine1: '123 Industrial Way',
      city: 'Pittsburgh',
      state: 'PA',
      postalCode: '15201',
      country: 'USA',
      timezone: 'America/New_York',
      phone: '+1-555-123-4567',
    },
  });
  console.log(`✅ Created facility: ${facility.name}`);

  // ===========================================================================
  // Create Demo Admin User
  // ===========================================================================
  console.log('Creating demo admin user...');

  const passwordHash = await argon2.hash('Admin123!@#', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const adminUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: 'admin@feralis.com',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'admin@feralis.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      displayName: 'Admin',
      jobTitle: 'System Administrator',
      department: 'IT',
      employeeId: 'EMP001',
      userType: UserType.INTERNAL,
      defaultFacilityId: facility.id,
      status: UserStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // Assign SUPER_ADMIN role to admin user
  const superAdminRole = await prisma.role.findFirst({
    where: { code: 'SUPER_ADMIN', isSystem: true },
  });

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    });
  }

  console.log(`✅ Created admin user: ${adminUser.email}`);
  console.log('   Password: Admin123!@#');

  // ===========================================================================
  // Create Demo Customers (Phase 2)
  // ===========================================================================
  console.log('Creating demo customers...');

  const customer1 = await prisma.customer.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'ACME001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Acme Aerospace',
      code: 'ACME001',
      legalName: 'Acme Aerospace Inc.',
      customerType: 'COMMERCIAL',
      status: 'ACTIVE',
      industry: 'Aerospace',
      primaryEmail: 'orders@acme-aerospace.com',
      primaryPhone: '+1-555-234-5678',
      paymentTerms: 'NET_30',
      creditLimit: 100000,
      currency: 'USD',
      qualityLevel: 'AS9100',
      certifications: ['AS9100', 'ISO 9001'],
      tags: ['aerospace', 'preferred'],
      createdBy: adminUser.id,
    },
  });

  // Add contact for customer 1
  await prisma.customerContact.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      customerId: customer1.id,
      firstName: 'John',
      lastName: 'Smith',
      title: 'Purchasing Manager',
      email: 'john.smith@acme-aerospace.com',
      phone: '+1-555-234-5679',
      contactTypes: ['PRIMARY', 'PURCHASING'],
      isPrimary: true,
      createdBy: adminUser.id,
    },
  });

  // Add address for customer 1
  await prisma.customerAddress.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000002',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      customerId: customer1.id,
      name: 'Headquarters',
      addressType: 'BOTH',
      addressLine1: '456 Aviation Blvd',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'USA',
      isDefaultBilling: true,
      isDefaultShipping: true,
      createdBy: adminUser.id,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'MED001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'MedTech Solutions',
      code: 'MED001',
      legalName: 'MedTech Solutions Corp.',
      customerType: 'COMMERCIAL',
      status: 'ACTIVE',
      industry: 'Medical Devices',
      primaryEmail: 'procurement@medtech.com',
      primaryPhone: '+1-555-345-6789',
      paymentTerms: 'NET_45',
      creditLimit: 75000,
      currency: 'USD',
      qualityLevel: 'ISO 13485',
      certifications: ['ISO 13485', 'FDA'],
      tags: ['medical', 'precision'],
      createdBy: adminUser.id,
    },
  });

  console.log(`✅ Created 2 demo customers`);

  // ===========================================================================
  // Create Demo Parts (Phase 2)
  // ===========================================================================
  console.log('Creating demo parts...');

  const part1 = await prisma.part.upsert({
    where: {
      organizationId_partNumber: {
        organizationId: organization.id,
        partNumber: 'BRKT-001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      partNumber: 'BRKT-001',
      name: 'Aluminum Mounting Bracket',
      description: 'CNC machined aluminum bracket for aerospace applications',
      partType: 'MANUFACTURED',
      status: 'ACTIVE',
      processType: 'CNC_MILLING',
      customerId: customer1.id,
      customerPartNumber: 'AA-BRKT-7890',
      uom: 'EACH',
      length: 4.5,
      width: 2.0,
      height: 0.75,
      dimensionUnit: 'in',
      weight: 0.25,
      weightUnit: 'lb',
      materialSpec: '6061-T6 Aluminum',
      materialGrade: 'T6',
      standardCost: 45.00,
      basePrice: 85.00,
      minimumPrice: 65.00,
      standardLeadDays: 10,
      rushLeadDays: 5,
      minimumOrderQty: 10,
      setupTimeMinutes: 30,
      cycleTimeMinutes: 8.5,
      inspectionRequired: true,
      certificationRequired: true,
      trackInventory: true,
      productLine: 'AEROSPACE',
      productFamily: 'BRACKETS',
      tags: ['aerospace', 'aluminum', 'bracket'],
      currentRevision: 'A',
      createdBy: adminUser.id,
    },
  });

  // Add revision for part 1
  await prisma.partRevision.upsert({
    where: {
      partId_revision: {
        partId: part1.id,
        revision: 'A',
      },
    },
    update: {},
    create: {
      partId: part1.id,
      revision: 'A',
      description: 'Initial release',
      status: 'APPROVED',
      effectiveDate: new Date(),
      approvedBy: adminUser.id,
      approvedAt: new Date(),
      createdBy: adminUser.id,
    },
  });

  // Add operations for part 1
  await prisma.partOperation.createMany({
    skipDuplicates: true,
    data: [
      {
        partId: part1.id,
        operationNumber: 10,
        name: 'CNC Mill Setup',
        description: 'Load stock and set fixtures',
        workCenterCode: 'CNC-MILL-01',
        setupTime: 30,
        runTimePerUnit: 0,
        laborCount: 1,
        laborRate: 50,
        machineRate: 75,
        createdBy: adminUser.id,
      },
      {
        partId: part1.id,
        operationNumber: 20,
        name: 'Rough Machining',
        description: 'Rough cut profile and pockets',
        workCenterCode: 'CNC-MILL-01',
        setupTime: 0,
        runTimePerUnit: 4.5,
        laborCount: 1,
        laborRate: 50,
        machineRate: 75,
        createdBy: adminUser.id,
      },
      {
        partId: part1.id,
        operationNumber: 30,
        name: 'Finish Machining',
        description: 'Finish all surfaces to spec',
        workCenterCode: 'CNC-MILL-01',
        setupTime: 0,
        runTimePerUnit: 4.0,
        laborCount: 1,
        laborRate: 50,
        machineRate: 75,
        createdBy: adminUser.id,
      },
      {
        partId: part1.id,
        operationNumber: 40,
        name: 'Deburr & Clean',
        description: 'Remove burrs and clean part',
        workCenterCode: 'BENCH-01',
        setupTime: 0,
        runTimePerUnit: 2.0,
        laborCount: 1,
        laborRate: 35,
        machineRate: 0,
        createdBy: adminUser.id,
      },
      {
        partId: part1.id,
        operationNumber: 50,
        name: 'Final Inspection',
        description: 'Dimensional inspection per drawing',
        workCenterCode: 'QC-01',
        setupTime: 5,
        runTimePerUnit: 3.0,
        laborCount: 1,
        laborRate: 45,
        machineRate: 0,
        inspectionRequired: true,
        createdBy: adminUser.id,
      },
    ],
  });

  // Add material for part 1
  await prisma.partMaterial.upsert({
    where: {
      partId_lineNumber: {
        partId: part1.id,
        lineNumber: 10,
      },
    },
    update: {},
    create: {
      partId: part1.id,
      lineNumber: 10,
      materialName: '6061-T6 Aluminum Bar',
      materialSpec: 'ASTM B211',
      materialCode: 'AL-6061-T6-BAR',
      quantityPer: 1,
      uom: 'EACH',
      length: 5.0,
      width: 2.5,
      thickness: 1.0,
      dimensionUnit: 'in',
      scrapFactor: 0.15,
      unitCost: 12.50,
      createdBy: adminUser.id,
    },
  });

  const part2 = await prisma.part.upsert({
    where: {
      organizationId_partNumber: {
        organizationId: organization.id,
        partNumber: 'SHAFT-002',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      partNumber: 'SHAFT-002',
      name: 'Precision Drive Shaft',
      description: 'CNC turned stainless steel shaft for medical devices',
      partType: 'MANUFACTURED',
      status: 'ACTIVE',
      processType: 'CNC_TURNING',
      customerId: customer2.id,
      customerPartNumber: 'MT-SH-1234',
      uom: 'EACH',
      length: 6.0,
      width: 0.5,
      height: 0.5,
      dimensionUnit: 'in',
      weight: 0.15,
      weightUnit: 'lb',
      materialSpec: '316L Stainless Steel',
      materialGrade: '316L',
      standardCost: 65.00,
      basePrice: 125.00,
      minimumPrice: 95.00,
      standardLeadDays: 14,
      rushLeadDays: 7,
      minimumOrderQty: 25,
      setupTimeMinutes: 45,
      cycleTimeMinutes: 12.0,
      inspectionRequired: true,
      certificationRequired: true,
      trackInventory: true,
      trackLots: true,
      productLine: 'MEDICAL',
      productFamily: 'SHAFTS',
      tags: ['medical', 'stainless', 'precision'],
      currentRevision: 'B',
      createdBy: adminUser.id,
    },
  });

  console.log(`✅ Created 2 demo parts with operations and materials`);

  // ===========================================================================
  // Create Inventory Locations (Phase 3)
  // ===========================================================================
  console.log('Creating inventory locations...');

  const locations = [
    {
      code: 'RCV-01',
      name: 'Receiving Dock 1',
      locationType: 'RECEIVING',
    },
    {
      code: 'RAW-A01',
      name: 'Raw Material Zone A - Rack 1',
      locationType: 'RAW_MATERIAL',
      zone: 'A',
      aisle: '01',
    },
    {
      code: 'RAW-A02',
      name: 'Raw Material Zone A - Rack 2',
      locationType: 'RAW_MATERIAL',
      zone: 'A',
      aisle: '02',
    },
    {
      code: 'WIP-01',
      name: 'Work In Progress Area 1',
      locationType: 'WIP',
    },
    {
      code: 'FG-01',
      name: 'Finished Goods - Shelf 1',
      locationType: 'FINISHED_GOODS',
    },
    {
      code: 'SHIP-01',
      name: 'Shipping Dock 1',
      locationType: 'SHIPPING',
    },
    {
      code: 'QC-HOLD',
      name: 'Quality Control Hold Area',
      locationType: 'INSPECTION',
    },
  ];

  for (const loc of locations) {
    await prisma.inventoryLocation.upsert({
      where: {
        facilityId_code: {
          facilityId: facility.id,
          code: loc.code,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        facilityId: facility.id,
        code: loc.code,
        name: loc.name,
        locationType: loc.locationType as any,
        zone: loc.zone,
        aisle: loc.aisle,
        createdBy: adminUser.id,
      },
    });
  }

  console.log(`✅ Created ${locations.length} inventory locations`);

  // ===========================================================================
  // Create Demo Quote (Phase 3)
  // ===========================================================================
  console.log('Creating demo quote...');

  const quote1 = await prisma.quote.upsert({
    where: {
      organizationId_quoteNumber_revision: {
        organizationId: organization.id,
        quoteNumber: 'Q25-00001',
        revision: 1,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      facilityId: facility.id,
      quoteNumber: 'Q25-00001',
      revision: 1,
      customerId: customer1.id,
      status: 'APPROVED',
      priority: 'NORMAL',
      rfqNumber: 'RFQ-AA-2025-001',
      quoteDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      subtotal: 8500.00,
      total: 8500.00,
      paymentTerms: 'NET_30',
      fobPoint: 'Origin',
      shippingMethod: 'Ground',
      salesRepId: adminUser.id,
      internalNotes: 'Recurring customer, standard terms apply',
      customerNotes: 'Please confirm lead time upon order placement',
      approvedBy: adminUser.id,
      approvedAt: new Date(),
      createdBy: adminUser.id,
    },
  });

  // Add quote lines
  await prisma.quoteLine.createMany({
    skipDuplicates: true,
    data: [
      {
        quoteId: quote1.id,
        lineNumber: 1,
        partId: part1.id,
        partNumber: 'BRKT-001',
        partRevision: 'A',
        description: 'Aluminum Mounting Bracket',
        quantity: 100,
        uom: 'EACH',
        unitPrice: 85.00,
        extendedPrice: 8500.00,
        unitCost: 45.00,
        leadDays: 10,
      },
    ],
  });

  console.log(`✅ Created demo quote Q25-00001`);

  // ===========================================================================
  // Create Demo Order (Phase 3)
  // ===========================================================================
  console.log('Creating demo order...');

  const order1 = await prisma.order.upsert({
    where: {
      organizationId_orderNumber: {
        organizationId: organization.id,
        orderNumber: 'SO25-00001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      facilityId: facility.id,
      orderNumber: 'SO25-00001',
      customerId: customer1.id,
      customerPO: 'PO-AA-2025-0042',
      orderType: 'STANDARD',
      status: 'APPROVED',
      priority: 'NORMAL',
      quoteId: quote1.id,
      orderDate: new Date(),
      requestedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      promisedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subtotal: 8500.00,
      total: 8500.00,
      paymentTerms: 'NET_30',
      fobPoint: 'Origin',
      shippingMethod: 'Ground',
      salesRepId: adminUser.id,
      creditApproved: true,
      creditApprovedBy: adminUser.id,
      creditApprovedAt: new Date(),
      approvedBy: adminUser.id,
      approvedAt: new Date(),
      internalNotes: 'Converted from quote Q25-00001',
      createdBy: adminUser.id,
    },
  });

  // Add order lines
  await prisma.orderLine.createMany({
    skipDuplicates: true,
    data: [
      {
        orderId: order1.id,
        lineNumber: 1,
        partId: part1.id,
        partNumber: 'BRKT-001',
        partRevision: 'A',
        description: 'Aluminum Mounting Bracket',
        quantityOrdered: 100,
        quantityShipped: 0,
        quantityRemaining: 100,
        uom: 'EACH',
        status: 'SCHEDULED',
        unitPrice: 85.00,
        extendedPrice: 8500.00,
        requestedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        promisedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ Created demo order SO25-00001`);

  // ===========================================================================
  // Create Demo Inventory (Phase 3)
  // ===========================================================================
  console.log('Creating demo inventory...');

  // Get raw material location
  const rawLocation = await prisma.inventoryLocation.findFirst({
    where: { facilityId: facility.id, code: 'RAW-A01' },
  });

  if (rawLocation) {
    await prisma.inventory.upsert({
      where: {
        locationId_partId_lotNumber_serialNumber: {
          locationId: rawLocation.id,
          partId: part1.id,
          lotNumber: 'LOT-2025-001',
          serialNumber: '',
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        facilityId: facility.id,
        locationId: rawLocation.id,
        partId: part1.id,
        lotNumber: 'LOT-2025-001',
        quantityOnHand: 500,
        quantityAllocated: 100,
        quantityAvailable: 400,
        uom: 'EACH',
        unitCost: 12.50,
        totalCost: 6250.00,
        receivedDate: new Date(),
      },
    });

    // Create a receipt transaction
    await prisma.inventoryTransaction.create({
      data: {
        organizationId: organization.id,
        facilityId: facility.id,
        transactionNumber: `IT${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-0001`,
        transactionType: 'RECEIPT',
        partId: part1.id,
        lotNumber: 'LOT-2025-001',
        toLocationId: rawLocation.id,
        quantity: 500,
        uom: 'EACH',
        unitCost: 12.50,
        totalCost: 6250.00,
        referenceType: 'PO',
        referenceNumber: 'PO-2025-0001',
        reason: 'Initial stock receipt',
        createdBy: adminUser.id,
      },
    });
  }

  console.log(`✅ Created demo inventory with transaction`);

  // ===========================================================================
  // Create Work Centers (Phase 4)
  // ===========================================================================
  console.log('Creating work centers...');

  const wcCNCMilling = await prisma.workCenter.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      code: 'CNC-MILL',
      name: 'CNC Milling',
      description: '3-axis and 5-axis CNC milling operations',
      capacityHoursDay: 16,
      capacityHoursWeek: 80,
      efficiencyFactor: 0.85,
      defaultSetupMinutes: 30,
      hourlyRate: 125.00,
      queueMaxHours: 40,
      sequenceNumber: 10,
    },
  });

  const wcCNCLathe = await prisma.workCenter.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      code: 'CNC-LATHE',
      name: 'CNC Turning',
      description: 'CNC lathe and turning operations',
      capacityHoursDay: 16,
      capacityHoursWeek: 80,
      efficiencyFactor: 0.85,
      defaultSetupMinutes: 25,
      hourlyRate: 110.00,
      queueMaxHours: 32,
      sequenceNumber: 20,
    },
  });

  const wcLaser = await prisma.workCenter.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      code: 'LASER',
      name: 'Laser Cutting',
      description: 'Fiber and CO2 laser cutting',
      capacityHoursDay: 24,
      capacityHoursWeek: 120,
      efficiencyFactor: 0.90,
      defaultSetupMinutes: 15,
      hourlyRate: 95.00,
      queueMaxHours: 48,
      sequenceNumber: 30,
    },
  });

  const wcPressBrake = await prisma.workCenter.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      code: 'PRESS-BRAKE',
      name: 'Press Brake',
      description: 'Sheet metal bending and forming',
      capacityHoursDay: 16,
      capacityHoursWeek: 80,
      efficiencyFactor: 0.80,
      defaultSetupMinutes: 20,
      hourlyRate: 85.00,
      queueMaxHours: 24,
      sequenceNumber: 40,
    },
  });

  const wcWelding = await prisma.workCenter.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      code: 'WELD',
      name: 'Welding',
      description: 'MIG, TIG, and robotic welding',
      capacityHoursDay: 16,
      capacityHoursWeek: 80,
      efficiencyFactor: 0.75,
      defaultSetupMinutes: 15,
      hourlyRate: 90.00,
      queueMaxHours: 32,
      sequenceNumber: 50,
    },
  });

  const wcInspection = await prisma.workCenter.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      code: 'INSPECT',
      name: 'Quality Inspection',
      description: 'CMM and manual inspection',
      capacityHoursDay: 8,
      capacityHoursWeek: 40,
      efficiencyFactor: 0.95,
      defaultSetupMinutes: 5,
      hourlyRate: 75.00,
      queueMaxHours: 16,
      sequenceNumber: 60,
    },
  });

  console.log(`✅ Created 6 work centers`);

  // ===========================================================================
  // Create Machines (Phase 4)
  // ===========================================================================
  console.log('Creating machines...');

  // CNC Mills
  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcCNCMilling.id,
      machineCode: 'MILL-001',
      name: 'Haas VF-4 #1',
      manufacturer: 'Haas',
      model: 'VF-4',
      machineType: 'CNC_MILL',
      controlType: 'Haas NGC',
      status: 'IDLE',
      hourlyRate: 125.00,
      setupRate: 75.00,
      locationX: 100,
      locationY: 50,
      floorSection: 'A1',
      maintenanceIntervalDays: 90,
      specifications: {
        xTravel: 50,
        yTravel: 20,
        zTravel: 25,
        spindleRPM: 8100,
        toolCapacity: 20,
      },
      capabilities: ['3-axis', 'aluminum', 'steel', 'titanium'],
    },
  });

  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcCNCMilling.id,
      machineCode: 'MILL-002',
      name: 'Haas VF-4 #2',
      manufacturer: 'Haas',
      model: 'VF-4',
      machineType: 'CNC_MILL',
      controlType: 'Haas NGC',
      status: 'IDLE',
      hourlyRate: 125.00,
      setupRate: 75.00,
      locationX: 100,
      locationY: 100,
      floorSection: 'A1',
      maintenanceIntervalDays: 90,
    },
  });

  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcCNCMilling.id,
      machineCode: 'MILL-003',
      name: 'DMG MORI DMU 50',
      manufacturer: 'DMG MORI',
      model: 'DMU 50',
      machineType: 'CNC_MILL',
      controlType: 'Siemens 840D',
      status: 'IDLE',
      hourlyRate: 175.00,
      setupRate: 95.00,
      locationX: 100,
      locationY: 150,
      floorSection: 'A2',
      maintenanceIntervalDays: 60,
      capabilities: ['5-axis', 'complex geometry', 'tight tolerance'],
    },
  });

  // CNC Lathes
  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcCNCLathe.id,
      machineCode: 'LATHE-001',
      name: 'Haas ST-20 #1',
      manufacturer: 'Haas',
      model: 'ST-20',
      machineType: 'CNC_LATHE',
      controlType: 'Haas NGC',
      status: 'IDLE',
      hourlyRate: 110.00,
      setupRate: 65.00,
      locationX: 200,
      locationY: 50,
      floorSection: 'B1',
      maintenanceIntervalDays: 90,
      specifications: {
        maxDiameter: 10,
        maxLength: 22,
        barCapacity: 2.5,
        spindleRPM: 4000,
      },
    },
  });

  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcCNCLathe.id,
      machineCode: 'LATHE-002',
      name: 'Haas ST-20Y',
      manufacturer: 'Haas',
      model: 'ST-20Y',
      machineType: 'CNC_LATHE',
      controlType: 'Haas NGC',
      status: 'IDLE',
      hourlyRate: 130.00,
      setupRate: 75.00,
      locationX: 200,
      locationY: 100,
      floorSection: 'B1',
      maintenanceIntervalDays: 90,
      capabilities: ['Y-axis', 'live tooling', 'mill-turn'],
    },
  });

  // Laser Cutters
  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcLaser.id,
      machineCode: 'LASER-001',
      name: 'Trumpf TruLaser 3030',
      manufacturer: 'Trumpf',
      model: 'TruLaser 3030',
      machineType: 'LASER_CUTTER',
      controlType: 'Siemens',
      status: 'IDLE',
      hourlyRate: 95.00,
      setupRate: 45.00,
      locationX: 300,
      locationY: 50,
      floorSection: 'C1',
      maintenanceIntervalDays: 30,
      telemetryEnabled: true,
      specifications: {
        laserPower: 6000,
        tableSize: '1500x3000',
        maxThickness: { steel: 25, aluminum: 20, stainless: 20 },
      },
    },
  });

  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcLaser.id,
      machineCode: 'LASER-002',
      name: 'Amada ENSIS 3015 AJ',
      manufacturer: 'Amada',
      model: 'ENSIS 3015 AJ',
      machineType: 'LASER_CUTTER',
      controlType: 'AMNC 3i',
      status: 'IDLE',
      hourlyRate: 105.00,
      setupRate: 50.00,
      locationX: 300,
      locationY: 150,
      floorSection: 'C2',
      maintenanceIntervalDays: 30,
      telemetryEnabled: true,
    },
  });

  // Press Brakes
  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcPressBrake.id,
      machineCode: 'BRAKE-001',
      name: 'Amada HG 1003',
      manufacturer: 'Amada',
      model: 'HG 1003',
      machineType: 'PRESS_BRAKE',
      controlType: 'AMNC 3i',
      status: 'IDLE',
      hourlyRate: 85.00,
      setupRate: 55.00,
      locationX: 400,
      locationY: 50,
      floorSection: 'D1',
      maintenanceIntervalDays: 120,
      specifications: {
        tonnage: 100,
        bendLength: 3000,
        openHeight: 470,
      },
    },
  });

  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcPressBrake.id,
      machineCode: 'BRAKE-002',
      name: 'Trumpf TruBend 5130',
      manufacturer: 'Trumpf',
      model: 'TruBend 5130',
      machineType: 'PRESS_BRAKE',
      controlType: 'TruTops Boost',
      status: 'IDLE',
      hourlyRate: 95.00,
      setupRate: 60.00,
      locationX: 400,
      locationY: 100,
      floorSection: 'D1',
      maintenanceIntervalDays: 120,
    },
  });

  // Welding
  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcWelding.id,
      machineCode: 'WELD-001',
      name: 'Miller Dynasty 350',
      manufacturer: 'Miller',
      model: 'Dynasty 350',
      machineType: 'WELDING',
      status: 'IDLE',
      hourlyRate: 90.00,
      setupRate: 40.00,
      locationX: 500,
      locationY: 50,
      floorSection: 'E1',
      maintenanceIntervalDays: 180,
      capabilities: ['TIG', 'aluminum', 'stainless', 'titanium'],
    },
  });

  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcWelding.id,
      machineCode: 'WELD-002',
      name: 'Lincoln PowerMIG 360MP',
      manufacturer: 'Lincoln',
      model: 'PowerMIG 360MP',
      machineType: 'WELDING',
      status: 'IDLE',
      hourlyRate: 85.00,
      setupRate: 35.00,
      locationX: 500,
      locationY: 100,
      floorSection: 'E1',
      maintenanceIntervalDays: 180,
      capabilities: ['MIG', 'steel', 'flux-core'],
    },
  });

  // Inspection
  await prisma.machine.create({
    data: {
      organizationId: organization.id,
      facilityId: facility.id,
      workCenterId: wcInspection.id,
      machineCode: 'CMM-001',
      name: 'Zeiss Contura',
      manufacturer: 'Zeiss',
      model: 'Contura',
      machineType: 'INSPECTION',
      status: 'IDLE',
      hourlyRate: 75.00,
      setupRate: 30.00,
      locationX: 600,
      locationY: 50,
      floorSection: 'QC',
      maintenanceIntervalDays: 365,
      specifications: {
        accuracy: '1.5+L/350',
        measurementVolume: '700x700x600',
      },
    },
  });

  console.log(`✅ Created 13 machines`);

  // ===========================================================================
  // Create Finishing Processes (Phase 5)
  // ===========================================================================
  console.log('Creating finishing processes...');

  await prisma.finishingProcess.create({
    data: {
      organizationId: organization.id,
      code: 'ANOD-CLR',
      name: 'Clear Anodize Type II',
      description: 'Clear anodize per MIL-A-8625 Type II',
      finishType: 'ANODIZE',
      isOutsourced: true,
      leadTimeDays: 5,
      basePrice: 25.00,
      pricePerSqFt: 2.50,
      minimumCharge: 50.00,
      colorOptions: ['Clear'],
      inspectionRequired: true,
      certificationRequired: true,
    },
  });

  await prisma.finishingProcess.create({
    data: {
      organizationId: organization.id,
      code: 'ANOD-BLK',
      name: 'Black Anodize Type II',
      description: 'Black anodize per MIL-A-8625 Type II',
      finishType: 'ANODIZE',
      isOutsourced: true,
      leadTimeDays: 5,
      basePrice: 30.00,
      pricePerSqFt: 3.00,
      minimumCharge: 60.00,
      colorOptions: ['Black'],
      inspectionRequired: true,
      certificationRequired: true,
    },
  });

  await prisma.finishingProcess.create({
    data: {
      organizationId: organization.id,
      code: 'PWDR-STD',
      name: 'Standard Powder Coat',
      description: 'Standard powder coating',
      finishType: 'POWDER_COAT',
      isOutsourced: true,
      leadTimeDays: 3,
      basePrice: 20.00,
      pricePerSqFt: 1.50,
      minimumCharge: 35.00,
      colorOptions: ['Black', 'White', 'Red', 'Blue', 'Gray'],
      inspectionRequired: true,
    },
  });

  await prisma.finishingProcess.create({
    data: {
      organizationId: organization.id,
      code: 'PASS-304',
      name: 'Passivation - Stainless',
      description: 'Citric acid passivation for stainless steel',
      finishType: 'PASSIVATION',
      isOutsourced: false,
      leadTimeDays: 1,
      basePrice: 15.00,
      pricePerUnit: 0.50,
      minimumCharge: 25.00,
      inspectionRequired: true,
    },
  });

  await prisma.finishingProcess.create({
    data: {
      organizationId: organization.id,
      code: 'BEAD-STD',
      name: 'Bead Blast',
      description: 'Standard bead blast finish',
      finishType: 'BEAD_BLAST',
      isOutsourced: false,
      leadTimeDays: 1,
      basePrice: 10.00,
      pricePerSqFt: 0.75,
      minimumCharge: 15.00,
      inspectionRequired: false,
    },
  });

  console.log(`✅ Created 5 finishing processes`);

  // ===========================================================================
  // Create Package Specifications (Phase 5)
  // ===========================================================================
  console.log('Creating package specifications...');

  await prisma.packageSpecification.create({
    data: {
      organizationId: organization.id,
      code: 'BOX-SM',
      name: 'Small Box',
      description: 'Small cardboard box',
      packageType: 'BOX',
      lengthInches: 8,
      widthInches: 6,
      heightInches: 4,
      maxWeightLbs: 10,
      tareWeightLbs: 0.25,
      unitCost: 1.50,
      materialType: 'Corrugated',
      requiresDunnage: true,
      dunnageType: 'Foam',
    },
  });

  await prisma.packageSpecification.create({
    data: {
      organizationId: organization.id,
      code: 'BOX-MD',
      name: 'Medium Box',
      description: 'Medium cardboard box',
      packageType: 'BOX',
      lengthInches: 12,
      widthInches: 10,
      heightInches: 8,
      maxWeightLbs: 25,
      tareWeightLbs: 0.5,
      unitCost: 2.50,
      materialType: 'Corrugated',
      requiresDunnage: true,
      dunnageType: 'Foam',
    },
  });

  await prisma.packageSpecification.create({
    data: {
      organizationId: organization.id,
      code: 'BOX-LG',
      name: 'Large Box',
      description: 'Large cardboard box',
      packageType: 'BOX',
      lengthInches: 18,
      widthInches: 14,
      heightInches: 12,
      maxWeightLbs: 50,
      tareWeightLbs: 0.75,
      unitCost: 4.00,
      materialType: 'Corrugated',
      requiresDunnage: true,
      dunnageType: 'Packing peanuts',
    },
  });

  await prisma.packageSpecification.create({
    data: {
      organizationId: organization.id,
      code: 'TUBE-36',
      name: '36" Shipping Tube',
      description: '36" shipping tube for long parts',
      packageType: 'TUBE',
      lengthInches: 36,
      widthInches: 4,
      heightInches: 4,
      maxWeightLbs: 15,
      tareWeightLbs: 0.5,
      unitCost: 3.50,
      materialType: 'Heavy duty cardboard',
    },
  });

  console.log(`✅ Created 4 package specifications`);

  // ===========================================================================
  // Create Carriers (Phase 5)
  // ===========================================================================
  console.log('Creating carriers...');

  await prisma.carrier.create({
    data: {
      organizationId: organization.id,
      code: 'FEDEX',
      name: 'FedEx',
      carrierType: 'PARCEL',
      apiEnabled: false,
      trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
    },
  });

  await prisma.carrier.create({
    data: {
      organizationId: organization.id,
      code: 'UPS',
      name: 'UPS',
      carrierType: 'PARCEL',
      apiEnabled: false,
      trackingUrlTemplate: 'https://www.ups.com/track?tracknum={tracking}',
    },
  });

  await prisma.carrier.create({
    data: {
      organizationId: organization.id,
      code: 'USPS',
      name: 'USPS',
      carrierType: 'PARCEL',
      apiEnabled: false,
      trackingUrlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tRef=fullpage&tLc=2&text28777={tracking}',
    },
  });

  await prisma.carrier.create({
    data: {
      organizationId: organization.id,
      code: 'WILL-CALL',
      name: 'Customer Pickup',
      carrierType: 'WILL_CALL',
      apiEnabled: false,
    },
  });

  console.log(`✅ Created 4 carriers`);

  // ===========================================================================
  // Done
  // ===========================================================================
  console.log('\n✨ Database seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - ${permissionData.length} permissions`);
  console.log(`   - ${systemRoles.length} system roles`);
  console.log(`   - 1 organization`);
  console.log(`   - 1 facility`);
  console.log(`   - 1 admin user`);
  console.log(`   - 2 customers (with contacts & addresses)`);
  console.log(`   - 2 parts (with revisions, operations & materials)`);
  console.log(`   - 7 inventory locations`);
  console.log(`   - 1 quote (with line items)`);
  console.log(`   - 1 order (with line items)`);
  console.log(`   - Demo inventory with transaction history`);
  console.log(`   - 6 work centers`);
  console.log(`   - 13 machines`);
  console.log(`   - 5 finishing processes`);
  console.log(`   - 4 package specifications`);
  console.log(`   - 4 carriers`);
  console.log('\n🔐 Login credentials:');
  console.log('   Email: admin@feralis.com');
  console.log('   Password: Admin123!@#');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
