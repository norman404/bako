use escpos::printer::Printer;
use escpos::utils::{Protocol, JustifyMode};
use super::error::PrintError;
use super::ticket::{build_command, build_ticket, CommandPayload, TicketPayload};

pub enum PrinterDriver {
    #[cfg(target_os = "windows")]
    Usb(escpos::driver::WindowsUsbPrintDriver),
    #[cfg(not(target_os = "windows"))]
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
            #[cfg(target_os = "windows")]
            {
                let driver = escpos::driver::WindowsUsbPrintDriver::open_by_vid_pid(vid, pid)
                    .map_err(|e| PrintError::UsbError(e.to_string()))?;
                Ok(PrinterDriver::Usb(driver))
            }
            #[cfg(not(target_os = "windows"))]
            {
                let driver = escpos::driver::NativeUsbDriver::open(vid, pid)
                    .map_err(|e| PrintError::UsbError(e.to_string()))?;
                Ok(PrinterDriver::Usb(driver))
            }
        }
        "network" => {
            let (ip, port) = parse_network_address(printer_address)?;
            let driver = escpos::driver::NetworkDriver::open(&ip, port, None)
                .map_err(|e| PrintError::NetworkError(e.to_string()))?;
            Ok(PrinterDriver::Network(driver))
        }
        "none" => Ok(PrinterDriver::None),
        _ => Err(PrintError::InvalidAddress(format!("Unknown printer type: {}", printer_type))),
    }
}

fn map_err(e: escpos::errors::PrinterError) -> PrintError {
    PrintError::TicketGeneration(e.to_string())
}

pub fn print_command_with_driver(driver: PrinterDriver, payload: &CommandPayload) -> Result<(), PrintError> {
    match driver {
        PrinterDriver::Usb(usb_driver) => {
            let mut printer = Printer::new(usb_driver, Protocol::default(), None);
            build_command(&mut printer, payload)?;
            Ok(())
        }
        PrinterDriver::Network(net_driver) => {
            let mut printer = Printer::new(net_driver, Protocol::default(), None);
            build_command(&mut printer, payload)?;
            Ok(())
        }
        PrinterDriver::None => Ok(()),
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_usb_address_parses_hex_vid_pid() {
        assert_eq!(parse_usb_address("04b8:0e15").unwrap(), (0x04b8, 0x0e15));
    }

    #[test]
    fn parse_usb_address_accepts_uppercase_hex() {
        assert_eq!(parse_usb_address("1FC9:2016").unwrap(), (0x1fc9, 0x2016));
    }

    #[test]
    fn parse_usb_address_rejects_missing_colon() {
        let err = parse_usb_address("04b80e15").unwrap_err();
        assert!(matches!(err, PrintError::InvalidAddress(_)));
    }

    #[test]
    fn parse_usb_address_rejects_invalid_hex() {
        let err = parse_usb_address("zzzz:2016").unwrap_err();
        assert!(matches!(err, PrintError::InvalidAddress(_)));
    }

    #[test]
    fn parse_network_address_parses_ip_and_port() {
        assert_eq!(parse_network_address("192.168.1.100:9100").unwrap(), ("192.168.1.100".to_owned(), 9100));
    }

    #[test]
    fn parse_network_address_rejects_invalid_port() {
        let err = parse_network_address("192.168.1.100:abc").unwrap_err();
        assert!(matches!(err, PrintError::InvalidAddress(_)));
    }
}
