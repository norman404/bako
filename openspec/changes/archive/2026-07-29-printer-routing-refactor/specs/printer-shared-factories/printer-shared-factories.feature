Feature: Printer Shared Factories

  Provee fixtures de dominio Printer reutilizables para los specs del
  proyecto, eliminando la duplicación donde cada spec reimplementa su
  propio buildPrinter. Sigue el patrón único del proyecto:
  (overrides: Partial<T> = {}) => ({...defaults, ...overrides}).
  Dueño = módulo printer, importable por path directo.

  @defaults
  Scenario: buildPrinter genera un Printer válido con defaults
    Given la factory buildPrinter importada desde @/modules/printer/test/factories
    When se invoca buildPrinter() sin argumentos
    Then retorna un objeto que satisface el tipo Printer
    And todas las propiedades requeridas tienen valores por defecto coherentes
    And el id es un string no vacío
    And deletedAt es null

  @overrides
  Scenario: buildPrinter permite sobreescribir campos específicos
    Given la factory buildPrinter
    When se invoca buildPrinter({ role: "receipt", isDefault: true, name: "Caja 1" })
    Then retorna un Printer con role = "receipt", isDefault = true y name = "Caja 1"
    And los campos no sobreescritos conservan los valores por defecto

  @overrides
  Scenario: buildPrinter permite sobreescribir campos anidados libremente
    Given la factory buildPrinter
    When se invoca buildPrinter({ type: "network", address: "192.168.1.50:9100" })
    Then retorna un Printer con type = "network" y address = "192.168.1.50:9100"
    And el resto de campos conservan los valores por defecto

  @import
  Scenario: Factory importable por path directo desde otros specs
    Given un spec en otro módulo
    When se importa import { buildPrinter } from "@/modules/printer/test/factories"
    Then la importación resuelve correctamente a la factory
    And no requiere importar desde el barrel del módulo printer

  @dedup
  Scenario: Otros specs dejan de duplicar buildPrinter
    Given specs existentes que hoy definen su propia buildPrinter local
    When adoptan la factory compartida
    Then eliminan su implementación local de buildPrinter
    And la factory compartida es la única fuente de construcción de fixtures Printer
