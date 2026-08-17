Feature: Shift Report

  Sales report for a specific shift, including totals, payment-method breakdown,
  and cash summary with movements and reconciliation.

  Scenario: Report for closed shift with mixed payments and cash movements
    Given a closed shift with openingCash=10000, 5 orders (3 cash totaling 3000, 2 card totaling 2000), 1 income=500, 1 expense=1000, countedCash=12500
    When the system generates the shift report
    Then the report shows totalOrders=5, totalSales=5000, cashTotal=3000, cardTotal=2000, openingCash=10000, cashMovementsIn=500, cashMovementsOut=1000, expectedCash=12500, countedCash=12500, cashDifference=0, and 2 cash movements in the list

  Scenario: Report for closed shift with cash shortage
    Given a closed shift with openingCash=5000, 2 cash orders totaling 4000, no movements, countedCash=8000
    When the system generates the shift report
    Then the report shows expectedCash=9000, countedCash=8000, cashDifference=-1000

  Scenario: Report for active shift with cash movements
    Given an active shift with openingCash=10000, 2 cash orders totaling 3000, 1 income=2000
    When the system generates the shift report
    Then the report shows expectedCash=15000, countedCash=null, cashDifference=null (shift still active)

  Scenario: Report for shift with no orders and no movements
    Given a closed shift with zero associated orders and zero movements, countedCash=5000
    When the system generates the shift report
    Then the report shows totalOrders=0, totalSales=0, cashTotal=0, cardTotal=0, openingCash, expectedCash=openingCash, countedCash=5000, cashDifference=0, and empty cash movements list

  Scenario: Report for legacy shift without opening cash
    Given a shift created before the cash management migration with 2 cash orders totaling 4000
    When the system generates the shift report
    Then the report shows openingCash=0, expectedCash=4000, and the shift does not break

  Scenario: Display report with cash summary immediately after closing
    Given an active shift with orders and cash movements
    When the user closes the shift with a counted cash amount
    Then the system closes the shift and immediately opens a modal displaying the shift report including the cash summary section

  Scenario: Open report with cash summary from history
    Given the shift history list is visible with 3 entries
    When the user selects the second entry
    Then a modal opens displaying the full report including the cash summary section for that shift