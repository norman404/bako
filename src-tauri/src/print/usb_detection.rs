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

/// Detecta impresoras USB conectadas filtrando por clase de impresora (0x07)
/// o interfaces con clase de impresora. También incluye VIDs conocidos.
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
            let product = dev.product_string().unwrap_or("Impresora desconocida");
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
    // Clase de dispositivo: Printer (0x07)
    if dev.class() == 0x07 {
        return true;
    }

    // Alguna interface con clase printer
    if dev.interfaces().any(|iface| iface.class() == 0x07) {
        return true;
    }

    // VIDs conocidos de fabricantes de impresoras térmicas POS
    const KNOWN_POS_VIDS: &[u16] = &[
        0x04B8, // Epson
        0x1504, // Bixolon
        0x0DD4, // Star Micronics
        0x0A5F, // Zebra
        0x1FC9, // NXP / genéricas
        0x0416, // Winchiphead
        0x0483, // STMicroelectronics
        0x1A86, // QinHeng (CH340/CH341)
    ];

    KNOWN_POS_VIDS.contains(&dev.vendor_id())
}
