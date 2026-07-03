use escpos::printer::Printer;
use escpos::utils::JustifyMode;
use escpos::driver::Driver;
use serde::{Deserialize, Serialize};
use super::error::PrintError;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TicketItem {
    pub name: String,
    pub quantity: u32,
    pub unit_price: u32,
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
