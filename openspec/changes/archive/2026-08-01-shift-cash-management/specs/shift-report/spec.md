# Delta for Shift Report

## MODIFIED Requirements

### Requirement: Generate Shift Report

The system MUST generate a report for any shift (active or closed) containing: openedAt, closedAt (if applicable), total number of associated orders, total sales amount, a payment breakdown by cash and card, AND a cash summary. The cash summary MUST include: openingCash, total cash movements income, total cash movements expense, expectedCash, countedCash (if closed), cashDifference (if closed), and the full list of cash movements. The expectedCash MUST be calculated as: `openingCash + cashTotal + cashMovementsIncome - cashMovementsExpense`.

(Previously: Report only included totalOrders, totalSales, cashTotal, cardTotal, and orders list — no cash summary.)

#### Scenario: Report for closed shift with mixed payments and cash movements

- GIVEN a closed shift with openingCash=10000, 5 orders (3 cash totaling 3000, 2 card totaling 2000), 1 income=500, 1 expense=1000, countedCash=12500
- WHEN the system generates the shift report
- THEN the report shows totalOrders=5, totalSales=5000, cashTotal=3000, cardTotal=2000, openingCash=10000, cashMovementsIn=500, cashMovementsOut=1000, expectedCash=12500, countedCash=12500, cashDifference=0, and 2 cash movements in the list

#### Scenario: Report for closed shift with cash shortage

- GIVEN a closed shift with openingCash=5000, 2 cash orders totaling 4000, no movements, countedCash=8000
- WHEN the system generates the shift report
- THEN the report shows expectedCash=9000, countedCash=8000, cashDifference=-1000

#### Scenario: Report for active shift with cash movements

- GIVEN an active shift with openingCash=10000, 2 cash orders totaling 3000, 1 income=2000
- WHEN the system generates the shift report
- THEN the report shows expectedCash=15000, countedCash=null, cashDifference=null (shift still active)

#### Scenario: Report for shift with no orders and no movements

- GIVEN a closed shift with zero associated orders and zero movements, countedCash=5000
- WHEN the system generates the shift report
- THEN the report shows totalOrders=0, totalSales=0, cashTotal=0, cardTotal=0, openingCash, expectedCash=openingCash, countedCash=5000, cashDifference=0, and empty cash movements list

#### Scenario: Report for legacy shift without opening cash

- GIVEN a shift created before the cash management migration with 2 cash orders totaling 4000
- WHEN the system generates the shift report
- THEN the report shows openingCash=0, expectedCash=4000, and the shift does not break

### Requirement: Report Display on Close

When a shift is closed, the system MUST immediately display the generated report in a modal, including the full cash summary with expectedCash, countedCash, and cashDifference. The report MUST be accessible later from the shift history.

(Previously: Report display on close showed only sales totals without cash summary.)

#### Scenario: Display report with cash summary immediately after closing

- GIVEN an active shift with orders and cash movements
- WHEN the user closes the shift with a counted cash amount
- THEN the system closes the shift and immediately opens a modal displaying the shift report including the cash summary section

### Requirement: View Individual Report from History

The system MUST allow selecting any shift from the history list and viewing its full report, including the cash summary section.

(Previously: Report from history did not include cash summary.)

#### Scenario: Open report with cash summary from history

- GIVEN the shift history list is visible with 3 entries
- WHEN the user selects the second entry
- THEN a modal opens displaying the full report including the cash summary section for that shift