use serde::Deserialize;
use crate::print::{create_printer_driver, print_ticket_with_driver, print_command_with_driver, test_printer_with_driver, LabelConfig, TicketPayload, TicketItem, TicketCustomer, CommandPayload, CommandItem};
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
    log::info!(
        "print_ticket: type={}, address={}, items={}",
        input.printer_type,
        input.printer_address,
        input.items.len()
    );

    let driver = create_printer_driver(&input.printer_type, &input.printer_address)
        .map_err(|e| {
            log::error!("print_ticket: failed to create driver: {}", e);
            e.to_string()
        })?;

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
        .map_err(|e| {
            log::error!("print_ticket: failed to print: {}", e);
            e.to_string()
        })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintCommandInput {
    pub printer_type: String,
    pub printer_address: String,
    pub header_text: String,
    pub items: Vec<CommandItem>,
    pub label_width_mm: Option<u32>,
    pub label_height_mm: Option<u32>,
    pub label_gap_mm: Option<u32>,
    pub label_language: Option<String>,
}

#[tauri::command]
pub fn print_command(input: PrintCommandInput) -> Result<(), String> {
    eprintln!(
        "[print_command] type={}, address={}, items={}",
        input.printer_type, input.printer_address, input.items.len()
    );

    let driver = create_printer_driver(&input.printer_type, &input.printer_address)
        .map_err(|e| {
            eprintln!("[print_command] failed to create driver: {}", e);
            e.to_string()
        })?;

    let payload = CommandPayload {
        header_text: input.header_text.clone(),
        items: input.items.clone(),
    };

    let label_config = (input.printer_type == "label").then_some(LabelConfig {
        width_mm: input.label_width_mm.unwrap_or(crate::print::DEFAULT_LABEL_WIDTH_MM),
        height_mm: input.label_height_mm.unwrap_or(crate::print::DEFAULT_LABEL_HEIGHT_MM),
        gap_mm: input.label_gap_mm.unwrap_or(crate::print::DEFAULT_LABEL_GAP_MM),
        label_language: input.label_language.clone(),
    });

    print_command_with_driver(driver, &input.printer_type, &payload, label_config)
        .map_err(|e| {
            eprintln!("[print_command] failed to print: {}", e);
            e.to_string()
        })
}

#[tauri::command]
pub fn debug_tspl(input: PrintCommandInput) -> Result<String, String> {
    let config = LabelConfig {
        width_mm: input.label_width_mm.unwrap_or(crate::print::DEFAULT_LABEL_WIDTH_MM),
        height_mm: input.label_height_mm.unwrap_or(crate::print::DEFAULT_LABEL_HEIGHT_MM),
        gap_mm: input.label_gap_mm.unwrap_or(crate::print::DEFAULT_LABEL_GAP_MM),
        label_language: input.label_language.clone(),
    };

    let debug_payload = crate::print::label::LabelPayload {
        header_text: input.header_text,
        items: input.items,
        width_mm: Some(config.width_mm),
        height_mm: Some(config.height_mm),
        gap_mm: Some(config.gap_mm),
    };

    let lang = crate::print::label::LabelLanguage::from_str(
        config.label_language.as_deref().unwrap_or("tspl")
    ).unwrap_or(crate::print::label::LabelLanguage::Tspl);

    let bytes = crate::print::label::build_label_bytes(&debug_payload, lang)
        .map_err(|e| e.to_string())?;

    let tspl_text = String::from_utf8_lossy(&bytes).to_string();
    eprintln!("[debug_tspl] generated label payload (lang={:?}):\n{}", lang, tspl_text);
    Ok(tspl_text)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestPrinterInput {
    pub printer_type: String,
    pub printer_address: String,
    pub label_width_mm: Option<u32>,
    pub label_height_mm: Option<u32>,
    pub label_gap_mm: Option<u32>,
    pub label_language: Option<String>,
}

#[tauri::command]
pub fn test_printer(input: TestPrinterInput) -> Result<(), String> {
    eprintln!(
        "[test_printer] type={}, address={}",
        input.printer_type, input.printer_address
    );

    let driver = create_printer_driver(&input.printer_type, &input.printer_address)
        .map_err(|e| {
            eprintln!("[test_printer] failed to create driver: {}", e);
            e.to_string()
        })?;

    let label_config = (input.printer_type == "label").then_some(LabelConfig {
        width_mm: input.label_width_mm.unwrap_or(crate::print::DEFAULT_LABEL_WIDTH_MM),
        height_mm: input.label_height_mm.unwrap_or(crate::print::DEFAULT_LABEL_HEIGHT_MM),
        gap_mm: input.label_gap_mm.unwrap_or(crate::print::DEFAULT_LABEL_GAP_MM),
        label_language: input.label_language.clone(),
    });

    test_printer_with_driver(driver, &input.printer_type, label_config)
        .map_err(|e| {
            eprintln!("[test_printer] failed to print: {}", e);
            e.to_string()
        })
}

#[tauri::command]
pub fn list_usb_printers() -> Result<Vec<crate::print::usb_detection::UsbPrinterInfo>, String> {
    let printers = detect_usb_printers();
    log::info!("list_usb_printers: detected {} printers", printers.len());
    for printer in &printers {
        log::debug!("list_usb_printers: {} ({})", printer.name, printer.address);
    }
    Ok(printers)
}
