Feature: Printer Management

  Extiende la entidad Printer con el campo isDefault (booleano) que
  marca la impresora predeterminada para el ticket de venta, junto con
  la validación de que solo role="receipt" puede ser default. Modifica
  la capability existente añadiendo el flag y su regla de validación,
  más el toggle en el panel de administración.

  @persistence
  Scenario: Printer.isDefault se persiste y carga correctamente
    Given una impresora P con role = "receipt" e isDefault = true
    When se persiste P mediante repository.create o repository.update
    And se recupera mediante repository.findById(P.id)
    Then la impresora recuperada tiene isDefault = true
    And el resto de campos coinciden con los persistidos

  @persistence
  Scenario: Impresora sin isDefault carga como false
    Given una impresora persistida cuyo isDefault no se especificó al crear
    When se recupera mediante repository.findById
    Then la impresora recuperada tiene isDefault = false

  @persistence @mapping
  Scenario: Mapeo de isDefault en el repositorio drizzle
    Given la columna is_default en la tabla printers
    When el repositorio drizzle mapea una fila a la entidad Printer
    Then el valor de is_default se mapea al campo isDefault de la entidad
    And el mapeo es bidireccional (entity → row y row → entity)

  @validation
  Scenario: isDefault = true con role != receipt produce error de validación
    Given un input con role = "kitchen" e isDefault = true
    When se ejecuta el use case create-printer o update-printer
    Then la operación retorna un error de validación de dominio
    And no se persiste ninguna impresora con isDefault = true para ese rol

  @validation
  Scenario: isDefault = false con cualquier rol es válido
    Given un input con cualquier role e isDefault = false
    When se ejecuta el use case create-printer o update-printer
    Then la operación se completa exitosamente
    And la impresora queda persistida con isDefault = false

  @ui @toggle
  Scenario: Toggle Predeterminada visible solo para role = receipt
    Given una impresora P con role = "receipt" cargada en el panel
    Then el panel muestra el control "Predeterminada" para P
    But dada una impresora Q con role = "kitchen" cargada en el panel
    Then el panel no muestra el control "Predeterminada" para Q

  @ui @toggle
  Scenario: Activar el toggle marca la impresora como default
    Given una impresora P con role = "receipt" e isDefault = false cargada en el panel
    When el usuario activa el toggle "Predeterminada"
    Then se invoca la actualización con isDefault = true
    Y la unicidad del default se mantiene
