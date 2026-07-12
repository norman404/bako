use serde::Deserialize;
use crate::print::{create_printer_driver, print_ticket_with_driver, print_command_with_driver, test_printer_with_driver, TicketPayload, TicketItem, TicketCustomer, CommandPayload, CommandItem};
use crate::print::usb_detection::detect_usb_printers;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintTicketInput {
    pub printer_type: String,
    pub printer_address: String,
    pub ticket_number: u32,
    pub created_at: String,
    pub total: u32,
    pub items: Vec<TicketItem>,
    pub payment_method: String,
    pub payment_amount: u32,
    pub fulfillment_type: String,
    pub customer: Option<TicketCustomer>,
}

#[tauri::command]
pub fn print_ticket(input: PrintTicketInput) -> Result<(), String> {
    let driver = create_printer_driver(&input.printer_type, &input.printer_address)
        .map_err(|e| e.to_string())?;

    let payload = TicketPayload {
        ticket_number: input.ticket_number,
        created_at: input.created_at,
        total: input.total,
        items: input.items,
        payment_method: input.payment_method,
        payment_amount: input.payment_amount,
        fulfillment_type: input.fulfillment_type,
        customer: input.customer,
    };

    print_ticket_with_driver(driver, &payload)
        .map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintCommandInput {
    pub printer_type: String,
    pub printer_address: String,
    pub ticket_number: u32,
    pub created_at: String,
    pub items: Vec<CommandItem>,
    pub fulfillment_type: String,
    pub customer: Option<TicketCustomer>,
}

#[tauri::command]
pub fn print_command(input: PrintCommandInput) -> Result<(), String> {
    let driver = create_printer_driver(&input.printer_type, &input.printer_address)
        .map_err(|e| e.to_string())?;

    let payload = CommandPayload {
        ticket_number: input.ticket_number,
        created_at: input.created_at,
        items: input.items,
        fulfillment_type: input.fulfillment_type,
        customer: input.customer,
    };

    print_command_with_driver(driver, &payload)
        .map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestPrinterInput {
    pub printer_type: String,
    pub printer_address: String,
}

#[tauri::command]
pub fn test_printer(input: TestPrinterInput) -> Result<(), String> {
    let driver = create_printer_driver(&input.printer_type, &input.printer_address)
        .map_err(|e| e.to_string())?;

    test_printer_with_driver(driver)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_usb_printers() -> Result<Vec<crate::print::usb_detection::UsbPrinterInfo>, String> {
    let printers = detect_usb_printers();
    Ok(printers)
}
