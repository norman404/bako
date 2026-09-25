use super::error::PrintError;
use super::label::{build_label_bytes, build_test_label, LabelLanguage, LabelPayload};
#[cfg(not(target_os = "windows"))]
use super::raw_usb::RawLabelUsbDriver;
use super::ticket::{build_command, build_ticket, CommandPayload, TicketPayload};
use escpos::printer::Printer;
use escpos::printer_options::PrinterOptions;
use escpos::utils::{JustifyMode, PageCode, Protocol};

pub use super::label::{DEFAULT_LABEL_GAP_MM, DEFAULT_LABEL_HEIGHT_MM, DEFAULT_LABEL_WIDTH_MM};

#[derive(Debug, Clone)]
pub struct LabelConfig {
    pub width_mm: u32,
    pub height_mm: u32,
    pub gap_mm: u32,
    pub label_language: Option<String>,
}

impl Default for LabelConfig {
    fn default() -> Self {
        Self {
            width_mm: DEFAULT_LABEL_WIDTH_MM,
            height_mm: DEFAULT_LABEL_HEIGHT_MM,
            gap_mm: DEFAULT_LABEL_GAP_MM,
            label_language: None,
        }
    }
}

fn resolve_label_language(label_language: Option<&str>) -> LabelLanguage {
    label_language
        .and_then(LabelLanguage::from_str)
        .unwrap_or(LabelLanguage::Tspl)
}

pub enum PrinterDriver {
    #[cfg(target_os = "windows")]
    Usb(escpos::driver::WindowsUsbPrintDriver),
    #[cfg(not(target_os = "windows"))]
    Usb(escpos::driver::NativeUsbDriver),
    #[cfg(not(target_os = "windows"))]
    LabelUsb(super::raw_usb::RawLabelUsbDriver),
    Network(escpos::driver::NetworkDriver),
    None,
}

fn parse_usb_address(address: &str) -> Result<(u16, u16), PrintError> {
    let parts: Vec<&str> = address.split(':').collect();
    if parts.len() != 2 {
        return Err(PrintError::InvalidAddress(format!(
            "USB address must be VID:PID, got: {}",
            address
        )));
    }
    let vid = u16::from_str_radix(parts[0], 16)
        .map_err(|_| PrintError::InvalidAddress(format!("Invalid VID: {}", parts[0])))?;
    let pid = u16::from_str_radix(parts[1], 16)
        .map_err(|_| PrintError::InvalidAddress(format!("Invalid PID: {}", parts[1])))?;
    Ok((vid, pid))
}

fn parse_network_address(address: &str) -> Result<(String, u16), PrintError> {
    let parts: Vec<&str> = address.split(':').collect();
    if parts.len() != 2 {
        return Err(PrintError::InvalidAddress(format!(
            "Network address must be IP:PORT, got: {}",
            address
        )));
    }
    let ip = parts[0].to_string();
    let port = parts[1]
        .parse::<u16>()
        .map_err(|_| PrintError::InvalidAddress(format!("Invalid port: {}", parts[1])))?;
    Ok((ip, port))
}

pub fn create_printer_driver(
    printer_type: &str,
    printer_address: &str,
) -> Result<PrinterDriver, PrintError> {
    match printer_type {
        "usb" => {
            #[cfg(target_os = "windows")]
            {
                let (vid, pid) = parse_usb_address(printer_address)?;
                let driver = escpos::driver::WindowsUsbPrintDriver::open_by_vid_pid(vid, pid)
                    .map_err(|e| PrintError::UsbError(e.to_string()))?;
                Ok(PrinterDriver::Usb(driver))
            }
            #[cfg(not(target_os = "windows"))]
            {
                let (vid, pid) = parse_usb_address(printer_address)?;
                let driver = escpos::driver::NativeUsbDriver::open(vid, pid)
                    .map_err(|e| PrintError::UsbError(e.to_string()))?;
                Ok(PrinterDriver::Usb(driver))
            }
        }
        "label" => {
            // Label printers often do not expose the same ESC/POS USB profile as receipt
            // printers. Use a raw bulk-OUT transport so TSPL bytes reach the device.
            #[cfg(target_os = "windows")]
            {
                let (vid, pid) = parse_usb_address(printer_address)?;
                let driver = escpos::driver::WindowsUsbPrintDriver::open_by_vid_pid(vid, pid)
                    .map_err(|e| PrintError::UsbError(e.to_string()))?;
                Ok(PrinterDriver::Usb(driver))
            }
            #[cfg(not(target_os = "windows"))]
            {
                let (vid, pid) = parse_usb_address(printer_address)?;
                let driver = RawLabelUsbDriver::open_by_vid_pid(vid, pid)
                    .map_err(|e| PrintError::UsbError(e.to_string()))?;
                Ok(PrinterDriver::LabelUsb(driver))
            }
        }
        "network" => {
            let (ip, port) = parse_network_address(printer_address)?;
            let driver = escpos::driver::NetworkDriver::open(&ip, port, None)
                .map_err(|e| PrintError::NetworkError(e.to_string()))?;
            Ok(PrinterDriver::Network(driver))
        }
        "none" => Ok(PrinterDriver::None),
        _ => Err(PrintError::InvalidAddress(format!(
            "Unknown printer type: {}",
            printer_type
        ))),
    }
}

fn map_err(e: escpos::errors::PrinterError) -> PrintError {
    PrintError::TicketGeneration(e.to_string())
}

fn build_printer<D: escpos::driver::Driver>(driver: D) -> Printer<D> {
    // PC858 covers Spanish characters (ñ, accents) and the euro symbol,
    // which the default UTF-8 encoder does not render on most ESC/POS printers.
    let options = PrinterOptions::new(Some(PageCode::PC858), None, 42);
    Printer::new(driver, Protocol::default(), Some(options))
}

fn print_escpos_command<D: escpos::driver::Driver>(
    driver: D,
    payload: &CommandPayload,
) -> Result<(), PrintError> {
    let mut printer = build_printer(driver);
    build_command(&mut printer, payload)?;
    Ok(())
}

fn print_tspl_command(
    driver: &dyn escpos::driver::Driver,
    payload: &CommandPayload,
    config: LabelConfig,
) -> Result<(), PrintError> {
    let label_payload = LabelPayload {
        order_name: payload.order_name.clone(),
        header_text: payload.header_text.clone(),
        items: payload.items.clone(),
        width_mm: Some(config.width_mm),
        height_mm: Some(config.height_mm),
        gap_mm: Some(config.gap_mm),
    };

    let lang = resolve_label_language(config.label_language.as_deref());
    log::info!("[print_tspl_command] label_language={:?}", lang);
    let bytes = build_label_bytes(&label_payload, lang)?;
    driver
        .write(&bytes)
        .map_err(|e| PrintError::UsbError(e.to_string()))?;
    driver
        .flush()
        .map_err(|e| PrintError::UsbError(e.to_string()))?;
    Ok(())
}

pub fn print_command_with_driver(
    driver: PrinterDriver,
    printer_type: &str,
    payload: &CommandPayload,
    label_config: Option<LabelConfig>,
) -> Result<(), PrintError> {
    match printer_type {
        "label" => {
            let driver_ref: &dyn escpos::driver::Driver = match &driver {
                PrinterDriver::Usb(usb_driver) => usb_driver,
                #[cfg(not(target_os = "windows"))]
                PrinterDriver::LabelUsb(label_driver) => label_driver,
                PrinterDriver::Network(net_driver) => net_driver,
                PrinterDriver::None => return Ok(()),
            };
            print_tspl_command(driver_ref, payload, label_config.unwrap_or_default())
        }
        _ => match driver {
            PrinterDriver::Usb(usb_driver) => print_escpos_command(usb_driver, payload),
            #[cfg(not(target_os = "windows"))]
            PrinterDriver::LabelUsb(label_driver) => print_escpos_command(label_driver, payload),
            PrinterDriver::Network(net_driver) => print_escpos_command(net_driver, payload),
            PrinterDriver::None => Ok(()),
        },
    }
}

fn print_ticket_inner<D: escpos::driver::Driver>(
    driver: D,
    payload: &TicketPayload,
) -> Result<(), PrintError> {
    let mut printer = build_printer(driver);
    build_ticket(&mut printer, payload)?;
    Ok(())
}

pub fn print_ticket_with_driver(
    driver: PrinterDriver,
    payload: &TicketPayload,
) -> Result<(), PrintError> {
    match driver {
        PrinterDriver::Usb(usb_driver) => print_ticket_inner(usb_driver, payload),
        #[cfg(not(target_os = "windows"))]
        PrinterDriver::LabelUsb(label_driver) => print_ticket_inner(label_driver, payload),
        PrinterDriver::Network(net_driver) => print_ticket_inner(net_driver, payload),
        PrinterDriver::None => Ok(()),
    }
}

fn test_printer_inner<D: escpos::driver::Driver>(driver: D) -> Result<(), PrintError> {
    let mut printer = build_printer(driver);
    printer
        .init()
        .map_err(map_err)?
        .size(2, 2)
        .map_err(map_err)?
        .bold(true)
        .map_err(map_err)?
        .justify(JustifyMode::CENTER)
        .map_err(map_err)?
        .writeln("BAKO - Test")
        .map_err(map_err)?
        .size(1, 1)
        .map_err(map_err)?
        .bold(false)
        .map_err(map_err)?
        .writeln("Printer connection OK")
        .map_err(map_err)?
        .print_cut()
        .map_err(map_err)?;
    Ok(())
}

fn print_tspl_test_page(
    driver: &dyn escpos::driver::Driver,
    label_config: Option<&LabelConfig>,
) -> Result<(), PrintError> {
    let lang = resolve_label_language(label_config.and_then(|c| c.label_language.as_deref()));
    log::info!("[print_tspl_test_page] label_language={:?}", lang);
    let bytes = build_test_label(lang);
    driver
        .write(&bytes)
        .map_err(|e| PrintError::UsbError(e.to_string()))?;
    driver
        .flush()
        .map_err(|e| PrintError::UsbError(e.to_string()))?;
    Ok(())
}

pub fn test_printer_with_driver(
    driver: PrinterDriver,
    printer_type: &str,
    label_config: Option<LabelConfig>,
) -> Result<(), PrintError> {
    match printer_type {
        "label" => {
            let driver_ref: &dyn escpos::driver::Driver = match &driver {
                PrinterDriver::Usb(usb_driver) => usb_driver,
                #[cfg(not(target_os = "windows"))]
                PrinterDriver::LabelUsb(label_driver) => label_driver,
                PrinterDriver::Network(net_driver) => net_driver,
                PrinterDriver::None => return Ok(()),
            };
            print_tspl_test_page(driver_ref, label_config.as_ref())
        }
        _ => match driver {
            PrinterDriver::Usb(usb_driver) => test_printer_inner(usb_driver),
            #[cfg(not(target_os = "windows"))]
            PrinterDriver::LabelUsb(label_driver) => test_printer_inner(label_driver),
            PrinterDriver::Network(net_driver) => test_printer_inner(net_driver),
            PrinterDriver::None => Ok(()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::print::{CommandItem, CommandPayload, TicketItem, TicketPayload, TicketPayment};
    use escpos::driver::Driver;
    use std::sync::{Arc, Mutex};

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
        assert_eq!(
            parse_network_address("192.168.1.100:9100").unwrap(),
            ("192.168.1.100".to_owned(), 9100)
        );
    }

    #[test]
    fn parse_network_address_rejects_invalid_port() {
        let err = parse_network_address("192.168.1.100:abc").unwrap_err();
        assert!(matches!(err, PrintError::InvalidAddress(_)));
    }

    #[derive(Clone)]
    struct FlushTrackingDriver {
        buffer: Arc<Mutex<Vec<u8>>>,
        flush_count: Arc<Mutex<u32>>,
    }

    impl FlushTrackingDriver {
        fn new() -> Self {
            Self {
                buffer: Arc::new(Mutex::new(Vec::new())),
                flush_count: Arc::new(Mutex::new(0)),
            }
        }

        fn flush_count(&self) -> u32 {
            *self.flush_count.lock().unwrap()
        }

        fn has_data(&self) -> bool {
            !self.buffer.lock().unwrap().is_empty()
        }
    }

    impl Driver for FlushTrackingDriver {
        fn name(&self) -> String {
            "flush-tracking".to_owned()
        }

        fn write(&self, data: &[u8]) -> escpos::errors::Result<()> {
            self.buffer.lock().unwrap().extend_from_slice(data);
            Ok(())
        }

        fn read(&self, _buf: &mut [u8]) -> escpos::errors::Result<usize> {
            Ok(0)
        }

        fn flush(&self) -> escpos::errors::Result<()> {
            *self.flush_count.lock().unwrap() += 1;
            Ok(())
        }
    }

    #[test]
    fn print_ticket_flushes_driver_after_building_ticket() {
        let driver = FlushTrackingDriver::new();
        let payload = TicketPayload {
            order_name: None,
            ticket_number: 1,
            created_at: "2026-07-26".to_owned(),
            total: 100,
            items: vec![TicketItem {
                name: "Test".to_owned(),
                quantity: 1,
                unit_price: 100,
                modifiers: vec![],
            }],
            payments: vec![TicketPayment {
                method: "cash".to_owned(),
                amount: 100,
                cash_received: Some(100),
            }],
        };

        print_ticket_inner(driver.clone(), &payload).unwrap();

        assert!(
            driver.has_data(),
            "expected ticket bytes to be written to driver"
        );
        assert!(
            driver.flush_count() >= 1,
            "expected at least one flush after printing ticket"
        );
    }

    #[test]
    fn print_command_flushes_driver_after_building_command() {
        let driver = FlushTrackingDriver::new();
        let payload = CommandPayload {
            order_name: None,
            header_text: "COCINA".to_owned(),
            items: vec![CommandItem {
                name: "Taco".to_owned(),
                quantity: 1,
                modifiers: vec![],
            }],
        };

        print_escpos_command(driver.clone(), &payload).unwrap();

        assert!(
            driver.has_data(),
            "expected command bytes to be written to driver"
        );
        assert!(
            driver.flush_count() >= 1,
            "expected at least one flush after printing command"
        );
    }

    fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
        haystack.windows(needle.len()).position(|w| w == needle)
    }

    #[test]
    fn print_tspl_command_routes_label_printer_to_tspl() {
        let driver = FlushTrackingDriver::new();
        let payload = CommandPayload {
            order_name: None,
            header_text: "COCINA".to_owned(),
            items: vec![CommandItem {
                name: "Taco".to_owned(),
                quantity: 1,
                modifiers: vec![],
            }],
        };

        print_tspl_command(&driver, &payload, LabelConfig::default()).unwrap();

        let buffer = driver.buffer.lock().unwrap();
        assert!(
            find_subslice(&buffer, b"SIZE 40 mm,30 mm\r\n").is_some(),
            "expected TSPL SIZE command"
        );
        assert!(
            find_subslice(&buffer, b"GAP 16 dot,0 dot\r\n").is_some(),
            "expected TSPL GAP in dots"
        );
        assert!(
            find_subslice(&buffer, b"DENSITY 8\r\n").is_some(),
            "expected DENSITY command"
        );
        assert!(
            find_subslice(&buffer, b"BITMAP 0,0,40,240,0,").is_some(),
            "expected BITMAP command"
        );
        assert!(
            find_subslice(&buffer, b"PRINT 1,1\r\n").is_some(),
            "expected PRINT command"
        );
        assert!(
            !find_subslice(&buffer, b"TEXT ").is_some(),
            "TEXT command must not appear in TSPL output"
        );
        assert!(
            driver.flush_count() >= 1,
            "expected at least one flush after TSPL command"
        );
    }

    #[test]
    fn test_printer_flushes_driver_after_test_page() {
        let driver = FlushTrackingDriver::new();

        test_printer_inner(driver.clone()).unwrap();

        assert!(
            driver.has_data(),
            "expected test page bytes to be written to driver"
        );
        assert!(
            driver.flush_count() >= 1,
            "expected at least one flush after test page"
        );
    }
}
