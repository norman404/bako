Feature: Shift Report

  Define how the system generates a sales report for a specific shift,
  including totals and payment-method breakdown.

  @happy-path
  Scenario: Report for closed shift with mixed payments
    Given a closed shift with 5 orders (3 cash, 2 card)
    When the system generates the shift report
    Then the report shows totalOrders=5, totalSales=sum of all order totals, cashTotal=sum of cash orders, cardTotal=sum of card orders

  @happy-path
  Scenario: Report for active shift
    Given an active shift with 2 orders
    When the system generates the shift report
    Then the report shows totalOrders=2, totalSales=sum of order totals, closedAt is null

  @edge-case
  Scenario: Report for shift with no orders
    Given a closed shift with zero associated orders
    When the system generates the shift report
    Then the report shows totalOrders=0, totalSales=0, cashTotal=0, cardTotal=0

  @happy-path
  Scenario: Display report immediately after closing
    Given an active shift with orders
    When the user closes the shift
    Then the system closes the shift and immediately opens a modal displaying the shift report

  @happy-path
  Scenario: Open report from history
    Given the shift history list is visible with 3 entries
    When the user selects the second entry
    Then a modal opens displaying the full report for that shift
