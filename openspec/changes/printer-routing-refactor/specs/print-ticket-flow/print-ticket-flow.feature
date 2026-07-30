Feature: Print Ticket Flow

  Desacopla el adapter print-ticket.adapter.ts del store de settings.
  printOrder recibe la impresora default receipt por parámetro en vez
  de leer useSettingsStore. Modifica la capability existente cambiando
  la fuente de configuración de impresora.

  @decoupling @happy-path
  Scenario: printOrder recibe la impresora default receipt por parámetro
    Given una impresora R con role = "receipt", isDefault = true, type = "usb", address = "USB:1234"
    And un input PrintOrderOptions válido
    When se invoca printOrder(input, R)
    Then el payload enviado a invoke("print_ticket") tiene printerType = "usb" y printerAddress = "USB:1234"
    And el payload incluye el resto de campos del ticket

  @no-default
  Scenario: printOrder sin default receipt printer no imprime
    Given que no existe impresora default receipt (null o undefined)
    And un input PrintOrderOptions válido
    When se invoca printOrder(input, null)
    Then la función retorna okAsync(undefined) sin invocar print_ticket
    And el comando print_ticket del backend no se invoca

  @network
  Scenario: Impresora default receipt con type = network usa network address
    Given una impresora R con role = "receipt", isDefault = true, type = "network", address = "192.168.1.50:9100"
    And un input PrintOrderOptions válido
    When se invoca printOrder(input, R)
    Then el payload tiene printerType = "network" y printerAddress = "192.168.1.50:9100"

  @edge-case
  Scenario: Impresora default receipt con type = label no imprime el ticket
    Given una impresora R con role = "receipt", isDefault = true, type = "label"
    And un input PrintOrderOptions válido
    When se invoca printOrder(input, R)
    Then la función no genera bytes de ticket ESC/POS
    Y el comportamiento se documenta como no aplicable para impresoras label

  @decoupling @regression
  Scenario: El adapter NO importa useSettingsStore
    Given el módulo src/modules/checkout/adapters/print-ticket.adapter.ts
    When se inspecciona su contenido
    Then no existe import de useSettingsStore
    And la función printOrder no referencia useSettingsStore.getState()

  @wiring
  Scenario: App.tsx obtiene e inyecta la impresora default receipt
    Given App.tsx orquestando el flujo de impresión al confirmar el checkout
    When se confirma un checkout que requiere ticket
    Then App.tsx obtiene la impresora default receipt desde el repositorio
    And la pasa como parámetro a printOrder
    And el adapter no la busca por su cuenta

  @regression @backend
  Scenario: print_ticket recibe el mismo shape de payload
    Given el comando print_ticket del backend Rust
    When printOrder construye el payload con la impresora default receipt
    Then el shape del payload (PrintTicketPayload) es idéntico al anterior
    And el comando print_ticket procesa el payload sin cambios
