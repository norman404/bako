# Shift Report Specification

## Purpose
Define how the system generates a sales report for a specific shift, including totals and payment-method breakdown.

## Requirements

### Requirement: Generate Shift Report

The system MUST generate a report for any shift (active or closed) containing: openedAt, closedAt (if applicable), total number of associated orders, total sales amount, and a payment breakdown by cash and card.

#### Scenario: Report for closed shift with mixed payments

- GIVEN a closed shift with 5 orders (3 cash, 2 card)
- WHEN the system generates the shift report
- THEN the report shows totalOrders=5, totalSales=sum of all order totals, cashTotal=sum of cash orders, cardTotal=sum of card orders

#### Scenario: Report for active shift

- GIVEN an active shift with 2 orders
- WHEN the system generates the shift report
- THEN the report shows totalOrders=2, totalSales=sum of order totals, closedAt is null

#### Scenario: Report for shift with no orders

- GIVEN a closed shift with zero associated orders
- WHEN the system generates the shift report
- THEN the report shows totalOrders=0, totalSales=0, cashTotal=0, cardTotal=0

### Requirement: Report Display on Close

When a shift is closed, the system MUST immediately display the generated report in a modal. The report MUST be accessible later from the shift history.

#### Scenario: Display report immediately after closing

- GIVEN an active shift with orders
- WHEN the user closes the shift
- THEN the system closes the shift and immediately opens a modal displaying the shift report

### Requirement: View Individual Report from History

The system MUST allow selecting any shift from the history list and viewing its full report.

#### Scenario: Open report from history

- GIVEN the shift history list is visible with 3 entries
- WHEN the user selects the second entry
- THEN a modal opens displaying the full report for that shift
