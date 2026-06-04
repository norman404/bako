use escpos::printer::Printer;
use escpos::utils::{Protocol, JustifyMode};
use super::error::PrintError;
use super::ticket::{build_ticket, TicketPayload};

pub enum PrinterDriver {
    Usb(escpos::driver::NativeUsbDriver),
    Network(escpos::driver::NetworkDriver),
    None,
}

fn parse_usb_address(address: &str) -> Result<(u16, u16), PrintError> {
    let parts: Vec<&str> = address.split(':').collect();
    if parts.len() != 2 {
        return Err(PrintError::InvalidAddress(format!("USB address must be VID:PID, got: {}", address)));
    }
    let vid = u16::from_str_radix(parts[0], 16).map_err(|_| PrintError::InvalidAddress(format!("Invalid VID: {}", parts[0])))?;
    let pid = u16::from_str_radix(parts[1], 16).map_err(|_| PrintError::InvalidAddress(format!("Invalid PID: {}", parts[1])))?;
    Ok((vid, pid))
}

fn parse_network_address(address: &str) -> Result<(String, u16), PrintError> {
    let parts: Vec<&str> = address.split(':').collect();
    if parts.len() != 2 {
        return Err(PrintError::InvalidAddress(format!("Network address must be IP:PORT, got: {}", address)));
    }
    let ip = parts[0].to_string();
    let port = parts[1].parse::<u16>().map_err(|_| PrintError::InvalidAddress(format!("Invalid port: {}", parts[1])))?;
    Ok((ip, port))
}

pub fn create_printer_driver(printer_type: &str, printer_address: &str) -> Result<PrinterDriver, PrintError> {
    match printer_type {
        "usb" => {
            let (vid, pid) = parse_usb_address(printer_address)?;
            let driver = escpos::driver::NativeUsbDriver::open(vid, pid).map_err(|e| PrintError::UsbError(e.to_string()))?;
            Ok(PrinterDriver::Usb(driver))
        }
        "network" => {
            let (ip, port) = parse_network_address(printer_address)?;
            let driver = escpos::driver::NetworkDriver::open(&ip, port, None).map_err(|e| PrintError::NetworkError(e.to_string()))?;
            Ok(PrinterDriver::Network(driver))
        }
        "none" => Ok(PrinterDriver::None),
        _ => Err(PrintError::InvalidAddress(format!("Unknown printer type: {}", printer_type))),
    }
}

fn map_err(e: escpos::errors::PrinterError) -> PrintError {
    PrintError::TicketGeneration(e.to_string())
}

pub fn print_ticket_with_driver(driver: PrinterDriver, payload: &TicketPayload) -> Result<(), PrintError> {
    match driver {
        PrinterDriver::Usb(usb_driver) => {
            let mut printer = Printer::new(usb_driver, Protocol::default(), None);
            build_ticket(&mut printer, payload)?;
            Ok(())
        }
        PrinterDriver::Network(net_driver) => {
            let mut printer = Printer::new(net_driver, Protocol::default(), None);
            build_ticket(&mut printer, payload)?;
            Ok(())
        }
        PrinterDriver::None => Ok(()),
    }
}

pub fn test_printer_with_driver(driver: PrinterDriver) -> Result<(), PrintError> {
    match driver {
        PrinterDriver::Usb(usb_driver) => {
            let mut printer = Printer::new(usb_driver, Protocol::default(), None);
            printer
                .init().map_err(map_err)?
                .size(2, 2).map_err(map_err)?
                .bold(true).map_err(map_err)?
                .justify(JustifyMode::CENTER).map_err(map_err)?
                .writeln("BAKO - Test").map_err(map_err)?
                .size(1, 1).map_err(map_err)?
                .bold(false).map_err(map_err)?
                .writeln("Printer connection OK").map_err(map_err)?
                .print_cut().map_err(map_err)?;
            Ok(())
        }
        PrinterDriver::Network(net_driver) => {
            let mut printer = Printer::new(net_driver, Protocol::default(), None);
            printer
                .init().map_err(map_err)?
                .size(2, 2).map_err(map_err)?
                .bold(true).map_err(map_err)?
                .justify(JustifyMode::CENTER).map_err(map_err)?
                .writeln("BAKO - Test").map_err(map_err)?
                .size(1, 1).map_err(map_err)?
                .bold(false).map_err(map_err)?
                .writeln("Printer connection OK").map_err(map_err)?
                .print_cut().map_err(map_err)?;
            Ok(())
        }
        PrinterDriver::None => Ok(()),
    }
}
