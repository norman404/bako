use serde::Serialize;
use nusb::list_devices;
use nusb::MaybeFuture;

#[derive(Debug, Clone, Serialize)]
pub struct UsbPrinterInfo {
    pub vid: u16,
    pub pid: u16,
    pub name: String,
    pub address: String,
}

/// Detects connected USB printers, filtering by printer class (0x07) or
/// printer-class interfaces. Also includes known POS thermal-printer VIDs.
pub fn detect_usb_printers() -> Vec<UsbPrinterInfo> {
    let devices_result = list_devices().wait();

    let devices: Box<dyn Iterator<Item = nusb::DeviceInfo>> = match devices_result {
        Ok(d) => Box::new(d),
        Err(_) => return vec![],
    };

    devices
        .filter(|dev| is_likely_printer(dev))
        .map(|dev| {
            let vid = dev.vendor_id();
            let pid = dev.product_id();
            let product = dev.product_string().unwrap_or("Unknown printer");
            let manufacturer = dev.manufacturer_string().unwrap_or("");

            let name = if manufacturer.is_empty() {
                product.to_string()
            } else {
                format!("{} — {}", manufacturer, product)
            };

            UsbPrinterInfo {
                vid,
                pid,
                name,
                address: format!("{:04X}:{:04X}", vid, pid),
            }
        })
        .collect()
}

fn is_likely_printer(dev: &nusb::DeviceInfo) -> bool {
    // Device class: Printer (0x07)
    if dev.class() == 0x07 {
        return true;
    }

    // Any printer-class interface
    if dev.interfaces().any(|iface| iface.class() == 0x07) {
        return true;
    }

    // Known POS thermal-printer vendor IDs
    const KNOWN_POS_VIDS: &[u16] = &[
        0x04B8, // Epson
        0x1504, // Bixolon
        0x0DD4, // Star Micronics
        0x0A5F, // Zebra
        0x1FC9, // NXP / generic
        0x0416, // Winchiphead
        0x0483, // STMicroelectronics
        0x1A86, // QinHeng (CH340/CH341)
    ];

    KNOWN_POS_VIDS.contains(&dev.vendor_id())
}
