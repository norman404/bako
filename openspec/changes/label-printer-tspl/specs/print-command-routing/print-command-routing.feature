Feature: Print Command Routing

  The print_command invocation selects ESC/POS or TSPL based on the
  destination printer type, while the legacy receipt flow remains untouched.

  @happy-path
  Scenario: Route label printers to TSPL
    Given a target printer of type "label"
    When print_command is called
    Then the system must generate a TSPL label for the order

  @regression
  Scenario: Route USB printers to ESC/POS
    Given a target printer of type "usb"
    When print_command is called
    Then the system must generate ESC/POS bytes

  @regression
  Scenario: Route network printers to ESC/POS
    Given a target printer of type "network"
    When print_command is called
    Then the system must generate ESC/POS bytes

  @regression
  Scenario: Ticket printing unaffected by label support
    Given a receipt printer of type "usb"
    When print_ticket is invoked
    Then the system must generate ESC/POS ticket bytes exactly as before label support existed
