Feature: Printer Default Receipt

  Garantiza que a lo sumo una impresora con role="receipt" esté marcada
  como predeterminada para el ticket de venta. El invariant de unicidad
  se mantiene en persistencia mediante transacción al crear y actualizar.
  Solo las impresoras receipt pueden ser default.

  @invariant @uniqueness
  Scenario: Marcar una receipt printer como default desmarca las demás receipt printers
    Given dos impresoras A y B ambas con role = "receipt"
    And A.isDefault = true y B.isDefault = false
    When se actualiza B con isDefault = true
    Then la impresora A queda persistida con isDefault = false
    And la impresora B queda persistida con isDefault = true
    And existe exactamente una impresora receipt con isDefault = true en el repositorio

  @invariant @uniqueness
  Scenario: Al crear una receipt printer con isDefault = true desmarca las demás
    Given una impresora A existente con role = "receipt" e isDefault = true
    When se crea una nueva impresora B con role = "receipt" e isDefault = true
    Then la impresora A queda persistida con isDefault = false
    And la impresora B queda persistida con isDefault = true
    And existe exactamente una impresora receipt con isDefault = true

  @invariant @transaction
  Scenario: Marcar un segundo default en actualización no rompe invariant ante concurrencia
    Given una impresora receipt A con isDefault = true
    When la operación de marcar B.isDefault = true se ejecuta en una transacción
    Then la transacción desmarca A y marca B de forma atómica
    And al finalizar no existen dos impresoras receipt con isDefault = true simultáneamente

  @validation
  Scenario: No se puede marcar como default una printer con role distinto a receipt
    Given una impresora P con role = "kitchen"
    When se intenta crear o actualizar P con isDefault = true
    Then la operación falla con un error de validación de dominio
    And P no queda persistida con isDefault = true

  @no-default
  Scenario: Sin receipt printer default el ticket no se imprime
    Given ninguna impresora con role = "receipt" tiene isDefault = true
    When el flujo de impresión solicita la impresora default receipt
    Then la respuesta indica que no hay impresora default receipt
    And no se invoca el comando print_ticket del backend

  @scope
  Scenario: Múltiples impresoras kitchen pueden coexistir sin afectar el invariant
    Given impresoras K1 y K2 ambas con role = "kitchen"
    And una impresora R1 con role = "receipt" e isDefault = true
    When K1 y K2 se crean o actualizan sin isDefault
    Then R1 sigue siendo la única impresora con isDefault = true
    And no se ve afectada por las operaciones sobre K1 ni K2
