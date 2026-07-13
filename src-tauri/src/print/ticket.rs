use escpos::printer::Printer;
use escpos::utils::JustifyMode;
use escpos::driver::Driver;
use serde::{Deserialize, Serialize};
use super::error::PrintError;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TicketItemModifier {
    pub group_name: String,
    pub option_name: Option<String>,
    pub text_value: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TicketItem {
    pub name: String,
    pub quantity: u32,
    pub unit_price: u32,
    pub modifiers: Vec<TicketItemModifier>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TicketCustomer {
    pub name: String,
    pub phone: String,
    pub address: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TicketPayload {
    pub ticket_number: u32,
    pub created_at: String,
    pub total: u32,
    pub items: Vec<TicketItem>,
    pub payment_method: String,
    pub payment_amount: u32,
    pub fulfillment_type: String,
    pub customer: Option<TicketCustomer>,
}

fn format_cents(cents: u32) -> String {
    let dollars = cents / 100;
    let remainder = cents % 100;
    format!("${}.{:02}", dollars, remainder)
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommandItemModifier {
    pub group_name: String,
    pub option_name: Option<String>,
    pub text_value: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommandItem {
    pub name: String,
    pub quantity: u32,
    pub modifiers: Vec<CommandItemModifier>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommandPayload {
    pub header_text: String,
    pub items: Vec<CommandItem>,
}

fn map_err(e: escpos::errors::PrinterError) -> PrintError {
    PrintError::TicketGeneration(e.to_string())
}

pub fn build_ticket<D: Driver>(printer: &mut Printer<D>, payload: &TicketPayload) -> Result<(), PrintError> {
    let ticket_num = format!("{:04}", payload.ticket_number);

    // Header
    printer
        .init().map_err(map_err)?
        .size(2, 2).map_err(map_err)?
        .bold(true).map_err(map_err)?
        .justify(JustifyMode::CENTER)
        .map_err(map_err)?
        .writeln("BAKO").map_err(map_err)?
        .size(1, 1).map_err(map_err)?
        .bold(false).map_err(map_err)?
        .writeln(&format!("Ticket #{}", ticket_num)).map_err(map_err)?
        .writeln(&payload.created_at).map_err(map_err)?;

    // Meta
    printer
        .justify(JustifyMode::LEFT).map_err(map_err)?
        .writeln(&format!("Order: {}", payload.fulfillment_type)).map_err(map_err)?
        .writeln(&format!("Payment: {}", payload.payment_method)).map_err(map_err)?;

    // Divider
    printer
        .writeln("--------------------------------").map_err(map_err)?;

    // Items
    for item in &payload.items {
        let line_total = item.unit_price * item.quantity;
        printer
            .bold(true).map_err(map_err)?
            .writeln(&item.name).map_err(map_err)?
            .bold(false).map_err(map_err)?
            .writeln(&format!("  {} x {} = {}", item.quantity, format_cents(item.unit_price), format_cents(line_total))).map_err(map_err)?;

        for modifier in &item.modifiers {
            let label = match (&modifier.option_name, &modifier.text_value) {
                (Some(option), Some(text)) => format!("  - {}: {} — {}", modifier.group_name, option, text),
                (Some(option), None) => format!("  - {}: {}", modifier.group_name, option),
                (None, Some(text)) => format!("  - {}: {}", modifier.group_name, text),
                (None, None) => format!("  - {}", modifier.group_name),
            };
            printer.writeln(&label).map_err(map_err)?;
        }
    }

    // Divider
    printer
        .writeln("--------------------------------").map_err(map_err)?;

    // Totals
    printer
        .justify(JustifyMode::RIGHT).map_err(map_err)?
        .bold(true).map_err(map_err)?
        .writeln(&format!("Total: {}", format_cents(payload.total))).map_err(map_err)?
        .bold(false).map_err(map_err)?
        .writeln(&format!("Paid: {}", format_cents(payload.payment_amount))).map_err(map_err)?;

    // Change
    if payload.payment_method == "cash" {
        let change = payload.payment_amount.saturating_sub(payload.total);
        printer
            .writeln(&format!("Change: {}", format_cents(change))).map_err(map_err)?;
    }

    // Customer
    if let Some(customer) = &payload.customer {
        printer
            .justify(JustifyMode::LEFT).map_err(map_err)?
            .writeln("--------------------------------").map_err(map_err)?
            .bold(true).map_err(map_err)?
            .writeln("Customer").map_err(map_err)?
            .bold(false).map_err(map_err)?
            .writeln(&customer.name).map_err(map_err)?
            .writeln(&customer.phone).map_err(map_err)?
            .writeln(&customer.address).map_err(map_err)?;
    }

    // Footer
    printer
        .justify(JustifyMode::CENTER).map_err(map_err)?
        .writeln("Thank you for your purchase").map_err(map_err)?
        .print_cut().map_err(map_err)?;

    Ok(())
}

pub fn build_command<D: Driver>(printer: &mut Printer<D>, payload: &CommandPayload) -> Result<(), PrintError> {
    // Header
    printer
        .init().map_err(map_err)?
        .size(1, 1).map_err(map_err)?
        .justify(JustifyMode::CENTER).map_err(map_err)?
        .bold(true).map_err(map_err)?
        .writeln(&payload.header_text).map_err(map_err)?
        .bold(false).map_err(map_err)?
        .justify(JustifyMode::LEFT).map_err(map_err)?
        .writeln("--------------------------------").map_err(map_err)?;

    // Items
    for item in &payload.items {
        printer
            .bold(true).map_err(map_err)?
            .writeln(&item.name).map_err(map_err)?
            .bold(false).map_err(map_err)?;

        for modifier in &item.modifiers {
            let label = match (&modifier.option_name, &modifier.text_value) {
                (Some(option), Some(text)) => format!("{}: {} — {}", modifier.group_name, option, text),
                (Some(option), None) => format!("{}: {}", modifier.group_name, option),
                (None, Some(text)) => format!("{}: {}", modifier.group_name, text),
                (None, None) => modifier.group_name.clone(),
            };
            printer.writeln(&label).map_err(map_err)?;
        }
    }

    // Footer
    printer
        .writeln("--------------------------------").map_err(map_err)?
        .print_cut().map_err(map_err)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use escpos::driver::Driver;
    use escpos::errors::Result;
    use escpos::printer::Printer;
    use escpos::utils::Protocol;

    use super::*;

    #[derive(Clone)]
    struct MockDriver {
        buffer: Arc<Mutex<Vec<u8>>>,
    }

    impl MockDriver {
        fn new() -> Self {
            Self {
                buffer: Arc::new(Mutex::new(Vec::new())),
            }
        }

        fn output(&self) -> String {
            let buffer = self.buffer.lock().unwrap();
            String::from_utf8_lossy(&buffer).to_string()
        }

        fn bytes(&self) -> Vec<u8> {
            self.buffer.lock().unwrap().clone()
        }
    }

    impl Driver for MockDriver {
        fn name(&self) -> String {
            "mock".to_owned()
        }

        fn write(&self, data: &[u8]) -> Result<()> {
            self.buffer.lock().unwrap().extend_from_slice(data);
            Ok(())
        }

        fn read(&self, _buf: &mut [u8]) -> Result<usize> {
            Ok(0)
        }

        fn flush(&self) -> Result<()> {
            Ok(())
        }
    }

    fn build_payload_with_modifiers() -> TicketPayload {
        TicketPayload {
            ticket_number: 42,
            created_at: "2026-07-11".to_owned(),
            total: 550,
            items: vec![TicketItem {
                name: "Café".to_owned(),
                quantity: 1,
                unit_price: 300,
                modifiers: vec![
                    TicketItemModifier {
                        group_name: "Nivel de hielo".to_owned(),
                        option_name: Some("Sin hielo".to_owned()),
                        text_value: None,
                    },
                    TicketItemModifier {
                        group_name: "Nota".to_owned(),
                        option_name: None,
                        text_value: Some("bien fría".to_owned()),
                    },
                ],
            }],
            payment_method: "cash".to_owned(),
            payment_amount: 600,
            fulfillment_type: "local".to_owned(),
            customer: None,
        }
    }

    #[test]
    fn build_ticket_renders_item_modifiers() {
        let driver = MockDriver::new();
        let mut printer = Printer::new(driver.clone(), Protocol::default(), None);

        build_ticket(&mut printer, &build_payload_with_modifiers()).unwrap();

        let output = driver.output();
        assert!(output.contains("Café"));
        assert!(output.contains("Nivel de hielo: Sin hielo"));
        assert!(output.contains("Nota: bien fría"));
    }

    #[test]
    fn build_ticket_renders_text_only_modifiers() {
        let driver = MockDriver::new();
        let mut printer = Printer::new(driver.clone(), Protocol::default(), None);
        let payload = TicketPayload {
            items: vec![TicketItem {
                name: "Té".to_owned(),
                quantity: 1,
                unit_price: 250,
                modifiers: vec![TicketItemModifier {
                    group_name: "Instrucciones".to_owned(),
                    option_name: None,
                    text_value: Some("sin azúcar".to_owned()),
                }],
            }],
            ..build_payload_with_modifiers()
        };

        build_ticket(&mut printer, &payload).unwrap();

        let output = driver.output();
        assert!(output.contains("Té"));
        assert!(output.contains("Instrucciones: sin azúcar"));
    }

    #[test]
    fn build_command_renders_items_without_prices() {
        let driver = MockDriver::new();
        let mut printer = Printer::new(driver.clone(), Protocol::default(), None);
        let payload = CommandPayload {
            header_text: "COCINA".to_owned(),
            items: vec![
                CommandItem {
                    name: "Taco".to_owned(),
                    quantity: 2,
                    modifiers: vec![CommandItemModifier {
                        group_name: "Salsa".to_owned(),
                        option_name: Some("Roja".to_owned()),
                        text_value: None,
                    }],
                },
                CommandItem {
                    name: "Agua".to_owned(),
                    quantity: 1,
                    modifiers: vec![],
                },
            ],
        };

        build_command(&mut printer, &payload).unwrap();

        let output = driver.output();
        assert!(output.contains("COCINA"));
        assert!(!output.contains("COMANDA"));
        assert!(!output.contains("Ticket #"));
        assert!(!output.contains("Order:"));
        assert!(!output.contains("Cliente"));
        assert!(output.contains("Taco"));
        assert!(!output.contains("2x Taco"));
        assert!(output.contains("Salsa: Roja"));
        assert!(!output.contains("- Salsa: Roja"));
        assert!(!output.contains("  - "));
        assert!(output.contains("Agua"));
        assert!(!output.contains("1x Agua"));
        assert!(!output.contains("$"));
        assert!(!output.contains("Total"));
    }

    #[test]
    fn build_ticket_encodes_spanish_characters_with_pc858() {
        use escpos::printer_options::PrinterOptions;
        use escpos::utils::PageCode;

        let driver = MockDriver::new();
        let options = PrinterOptions::new(Some(PageCode::PC858), None, 42);
        let mut printer = Printer::new(driver.clone(), Protocol::default(), Some(options));

        let payload = TicketPayload {
            ticket_number: 1,
            created_at: "13 jul 2026".to_owned(),
            total: 100,
            items: vec![TicketItem {
                name: "ñoquis".to_owned(),
                quantity: 1,
                unit_price: 100,
                modifiers: vec![],
            }],
            payment_method: "cash".to_owned(),
            payment_amount: 100,
            fulfillment_type: "local".to_owned(),
            customer: None,
        };

        build_ticket(&mut printer, &payload).unwrap();

        let bytes = driver.bytes();
        assert!(
            bytes.contains(&0xA4),
            "ñ should be encoded as 0xA4 in PC858 (got {:?})",
            bytes
        );
    }
}
