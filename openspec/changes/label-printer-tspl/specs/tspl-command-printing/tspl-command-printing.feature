Feature: TSPL Command Printing

  Bako generates TSPL label commands for "label" printers when printing kitchen
  command labels, without affecting legacy ESC/POS flows.

  @happy-path
  Scenario: Label printer receives TSPL
    Given a configured printer of type "label"
    When print_command is invoked for that printer
    Then the backend must produce TSPL bytes instead of ESC/POS

  @happy-path
  Scenario: Kitchen label with one item
    Given a label printer with dimensions 40 mm by 30 mm by 2 mm gap
    When a kitchen command with a single hamburger and no modifiers is printed
    Then the TSPL output must contain "SIZE 40 mm, 30 mm"
    And the TSPL output must contain "GAP 2 mm"
    And the TSPL output must contain "CLS"
    And the TSPL output must contain a header text command
    And the TSPL output must contain an item text command
    And the TSPL output must contain "PRINT 1"
    And the TSPL output must contain "END"

  @happy-path
  Scenario: Kitchen label with modifiers
    Given a label printer with default dimensions
    When a kitchen command with an item that has modifiers is printed
    Then the TSPL output must contain item text
    And the TSPL output must contain modifier text for that item

  @regression
  Scenario: USB receipt printer stays ESC/POS
    Given a configured printer of type "usb"
    When print_command is invoked for that printer
    Then the backend must continue producing ESC/POS bytes
