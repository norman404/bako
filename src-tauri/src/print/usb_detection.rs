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

/// Detects connected USB printers.
///
/// On Windows it lists only devices exposed by the `usbprint.sys` driver, which
/// is the subset that `WindowsUsbPrintDriver` can actually open. On other
/// platforms it falls back to `nusb` and filters by printer class or known POS
/// vendor IDs.
pub fn detect_usb_printers() -> Vec<UsbPrinterInfo> {
    #[cfg(target_os = "windows")]
    {
        detect_windows_usb_printers()
    }
    #[cfg(not(target_os = "windows"))]
    {
        detect_with_nusb()
    }
}

#[cfg(target_os = "windows")]
fn detect_windows_usb_printers() -> Vec<UsbPrinterInfo> {
    let devices = match escpos::driver::WindowsUsbPrintDriver::list() {
        Ok(d) => d,
        Err(_) => return vec![],
    };

    devices
        .into_iter()
        .map(|info| {
            let vid = info.vendor_id.unwrap_or(0);
            let pid = info.product_id.unwrap_or(0);
            UsbPrinterInfo {
                vid,
                pid,
                name: format!("USB printer (VID={:04X}, PID={:04X})", vid, pid),
                address: format!("{:04X}:{:04X}", vid, pid),
            }
        })
        .collect()
}

#[cfg(not(target_os = "windows"))]
fn detect_with_nusb() -> Vec<UsbPrinterInfo> {
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

#[cfg(not(target_os = "windows"))]
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
