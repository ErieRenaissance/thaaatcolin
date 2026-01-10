# Feralis Platform - Relation Updates Required

## Overview

This document lists the relations that need to be added to existing models in the original `schema.prisma` file to support the new models defined in `schema-extension.prisma`.

## Instructions

Add the following relations to the specified models in your existing `schema.prisma` file.

---

## Organization Model

Add these relations to the `Organization` model:

```prisma
// Add to Organization model relations section
reportDefinitions     ReportDefinition[] @relation("ReportDefinitionOrganization")
reportExecutions      ReportExecution[]  @relation("ReportExecutionOrganization")
kpiDefinitions        KpiDefinition[]    @relation("KpiDefinitionOrganization")
dashboards            Dashboard[]        @relation("DashboardOrganization")
analyticsAlerts       AnalyticsAlert[]   @relation("AnalyticsAlertOrganization")
tools                 Tool[]             @relation("ToolOrganization")
toolHolders           ToolHolder[]       @relation("ToolHolderOrganization")
suppliers             Supplier[]         @relation("SupplierOrganization")
outsideProcessingOrders OutsideProcessingOrder[] @relation("OutsideProcessingOrderOrg")
```

---

## Customer Model

Add these relations to the `Customer` model:

```prisma
// Add to Customer model relations section
portalConfig           CustomerPortalConfig?     @relation("CustomerPortalConfigCustomer")
portalUsers            PortalUser[]              @relation("PortalUserCustomer")
rfqs                   Rfq[]                     @relation("RfqCustomer")
approvalRequests       ApprovalRequest[]         @relation("ApprovalRequestCustomer")
messageThreads         MessageThread[]           @relation("MessageThreadCustomer")
performanceSummaries   CustomerPerformanceSummary[] @relation("CustomerPerformanceSummaryCustomer")
```

---

## Machine Model

Add these relations to the `Machine` model:

```prisma
// Add to Machine model relations section
telemetry              MachineTelemetry[]       @relation("MachineTelemetry")
telemetryAggregate1h   TelemetryAggregate1h[]   @relation("TelemetryAggregate1h")
telemetryAggregate1d   TelemetryAggregate1d[]   @relation("TelemetryAggregate1d")
telemetryAdapterConfig TelemetryAdapterConfig?  @relation("TelemetryAdapterConfig")
toolAssignments        ToolAssignment[]         @relation("ToolAssignmentMachine")
```

---

## Quote Model

Add this relation to the `Quote` model:

```prisma
// Add to Quote model relations section
rfq                    Rfq?                     @relation("RfqQuote")
```

---

## QuoteLine Model

Add these relations to the `QuoteLine` model:

```prisma
// Add to QuoteLine model relations section
geometryAnalysis       QuoteGeometryAnalysis?   @relation("QuoteGeometryAnalysisLine")
toolpath               QuoteToolpath?           @relation("QuoteToolpathLine")
nesting                QuoteNesting?            @relation("QuoteNestingLine")
simulation             QuoteSimulation?         @relation("QuoteSimulationLine")
```

---

## Part Model

Add this relation to the `Part` model:

```prisma
// Add to Part model relations section
rfqLines               RfqLine[]                @relation("RfqLinePart")
```

---

## ChemicalBath Model

Add this relation to the `ChemicalBath` model:

```prisma
// Add to ChemicalBath model relations section
analyses               BathAnalysis[]           @relation("BathAnalysisBath")
```

---

## WorkOrder Model

Add this relation to the `WorkOrder` model:

```prisma
// Add to WorkOrder model relations section
outsideProcessingOrders OutsideProcessingOrder[] @relation("OutsideProcessingOrderWorkOrder")
```

---

## FinishingProcess Model

Add this relation to the `FinishingProcess` model:

```prisma
// Add to FinishingProcess model relations section
outsideProcessingOrders OutsideProcessingOrder[] @relation("OutsideProcessingOrderProcess")
```

---

## Verification Checklist

After adding the relations, verify:

1. [ ] All relation names match between models
2. [ ] All `@relation` decorators have matching names
3. [ ] Run `npx prisma format` to validate syntax
4. [ ] Run `npx prisma validate` to check for errors
5. [ ] Run `npx prisma generate` to regenerate the client

---

## Migration Notes

After updating the schema:

1. Create a new migration: `npx prisma migrate dev --name add_analytics_portal_telemetry_tooling`
2. Review the generated SQL migration
3. Apply to development database
4. Test all affected APIs

For the TimescaleDB hypertable (machine_telemetry), run the following SQL after the migration:

```sql
-- Convert machine_telemetry to a TimescaleDB hypertable
SELECT create_hypertable('machine_telemetry', 'timestamp', migrate_data => true);

-- Create continuous aggregates for 1h and 1d tables (optional, can use regular tables)
-- Or use TimescaleDB's continuous aggregate feature
```
