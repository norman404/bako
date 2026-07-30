Feature: Printer Settings Panel I18n

  Migra los labels, placeholders y estados del PrinterSettingsPanel.tsx
  (hoy hardcoded en español) a keys i18n, propagando cada key nueva a
  los 5 locales (es-MX, en-US, es-AR, es-ES, pt-BR) según exige el guard
  locale-completeness.spec.ts. Modifica la capability existente cambiando
  strings hardcoded por keys.

  @i18n
  Scenario: Todos los labels del panel usan keys i18n
    Given el componente PrinterSettingsPanel.tsx renderizado
    When se inspecciona su código fuente
    Then no existen strings literales en español para textos visibles
    And cada texto visible se obtiene mediante la función de traducción i18n con una key de settings.json

  @i18n @guard
  Scenario: Las keys existen en los 5 locales
    Given las keys i18n nuevas introducidas para el panel
    When se ejecuta el guard locale-completeness.spec.ts
    Then el test pasa porque las keys existen en los 5 locales
    Y cada locale tiene un valor traducido coherente para cada key

  @i18n @placeholders
  Scenario: Placeholders y estados vacíos también i18n-izados
    Given el PrinterSettingsPanel mostrando un estado vacío o un placeholder
    When se renderiza en cualquier locale
    Then el texto del estado vacío y los placeholders provienen de keys i18n
    Y no hay strings hardcoded en ningún locale

  @i18n @toggle
  Scenario: Toggle Predeterminada visible solo para role = receipt
    Given una impresora P con role = "receipt" cargada en el panel
    Then el panel muestra el toggle "Predeterminada" para P
    But dada una impresora Q con role = "kitchen" cargada en el panel
    Then el panel no muestra el toggle "Predeterminada" para Q

  @i18n @toggle
  Scenario: El label del toggle Predeterminada usa key i18n
    Given el toggle "Predeterminada" renderizado en el panel
    When se inspecciona su label
    Then el texto proviene de una key i18n
    Y no es un string literal hardcoded
    Y la key existe en los 5 locales con su traducción correspondiente

  @i18n @errors
  Scenario: Mensajes de error de impresora usan keys i18n
    Given un error de validación o de impresión mostrado desde el panel
    When se renderiza el mensaje en cualquier locale
    Then el texto proviene de una key i18n
    Y no es un string literal hardcoded
    Y la key existe en los 5 locales
