use std::sync::Arc;
use std::time::Duration;
use nusb::{list_devices, MaybeFuture};
use nusb::transfer::{Bulk, ControlIn, ControlType, In, Out, Recipient};
use super::error::PrintError;

/// Raw USB transport for label printers that do not expose an ESC/POS USB profile.
/// Uses `nusb` directly to claim an interface, open the first bulk OUT endpoint,
/// and write TSPL bytes.
#[derive(Clone)]
pub struct RawLabelUsbDriver {
    #[allow(dead_code)]
    device: Arc<nusb::Device>,
    claimed_interface: Arc<nusb::Interface>,
    interface_number: u8,
    endpoint_address: u8,
    in_endpoint_address: Option<u8>,
    max_packet_size: usize,
}

impl RawLabelUsbDriver {
    pub fn open_by_vid_pid(vid: u16, pid: u16) -> Result<Self, PrintError> {
        eprintln!("[raw_usb] listing devices for {:04X}:{:04X}", vid, pid);
        let devices = list_devices().wait().map_err(|e| {
            eprintln!("[raw_usb] list_devices failed: {}", e);
            PrintError::UsbError(format!("failed to list USB devices: {}", e))
        })?;

        let mut found_count = 0;
        let device_info = devices
            .filter(|d| {
                found_count += 1;
                d.vendor_id() == vid && d.product_id() == pid
            })
            .next()
            .ok_or_else(|| {
                eprintln!("[raw_usb] device not found among {} listed", found_count);
                PrintError::UsbError(format!("USB device {:04X}:{:04X} not found", vid, pid))
            })?;
        eprintln!("[raw_usb] found device: {:?}", device_info);

        let device = Arc::new(device_info.open().wait().map_err(|e| {
            eprintln!("[raw_usb] open failed: {}", e);
            PrintError::UsbError(format!("failed to open USB device: {}", e))
        })?);
        eprintln!("[raw_usb] device opened");

        let config = device.active_configuration().map_err(|e| {
            eprintln!("[raw_usb] active_configuration failed: {}", e);
            PrintError::UsbError(format!("failed to read active configuration: {}", e))
        })?;
        eprintln!("[raw_usb] active config interfaces: {}", config.interfaces().count());

        for interface in config.interfaces() {
            let interface_number = interface.interface_number();
            eprintln!("[raw_usb] trying interface {}", interface_number);
            let claimed = device.claim_interface(interface_number).wait();
            let claimed_interface = match claimed {
                Ok(iface) => {
                    eprintln!("[raw_usb] claimed interface {}", interface_number);
                    iface
                }
                Err(e) => {
                    eprintln!("[raw_usb] claim_interface {} failed: {}", interface_number, e);
                    continue;
                }
            };

            let interface_number = interface.interface_number();
            let mut out_address: Option<(u8, usize)> = None;
            let mut in_address: Option<u8> = None;
            for alt in interface.alt_settings() {
                eprintln!("[raw_usb] alt setting class={} subclass={} protocol={}", alt.class(), alt.subclass(), alt.protocol());
                for endpoint in alt.endpoints() {
                    eprintln!("[raw_usb] endpoint addr={:02X} dir={:?} transfer_type={:?} max_packet={}",
                        endpoint.address(), endpoint.direction(), endpoint.transfer_type(), endpoint.max_packet_size());
                    match endpoint.direction() {
                        nusb::transfer::Direction::Out if out_address.is_none() => {
                            out_address = Some((endpoint.address(), endpoint.max_packet_size() as usize));
                        }
                        nusb::transfer::Direction::In if in_address.is_none() => {
                            in_address = Some(endpoint.address());
                        }
                        _ => {}
                    }
                }
            }

            if let Some((address, max_packet_size)) = out_address {
                eprintln!("[raw_usb] selected OUT endpoint {:02X}, IN endpoint {:?}", address, in_address);
                return Ok(Self {
                    device: device.clone(),
                    claimed_interface: Arc::new(claimed_interface),
                    interface_number,
                    endpoint_address: address,
                    in_endpoint_address: in_address,
                    max_packet_size,
                });
            }
        }

        eprintln!("[raw_usb] no usable OUT endpoint");
        Err(PrintError::UsbError(
            "no suitable OUT endpoint found on label printer".to_string(),
        ))
    }

    pub fn write_all(&self, data: &[u8]) -> Result<(), PrintError> {
        eprintln!("[raw_usb] writing {} bytes to endpoint {:02X}", data.len(), self.endpoint_address);

        // Perform the USB printer-class handshake before each job, similar to usbprint.sys.
        self.usb_printer_handshake()?;

        let endpoint = self.claimed_interface
            .endpoint::<Bulk, Out>(self.endpoint_address)
            .map_err(|e| {
                eprintln!("[raw_usb] endpoint open failed: {}", e);
                PrintError::UsbError(format!("failed to open endpoint: {}", e))
            })?;

        let mut writer = endpoint.writer(self.max_packet_size);
        std::io::Write::write_all(&mut writer, data).map_err(|e| {
            eprintln!("[raw_usb] write failed: {}", e);
            PrintError::UsbError(format!("failed to write to USB endpoint: {}", e))
        })?;
        std::io::Write::flush(&mut writer).map_err(|e| {
            eprintln!("[raw_usb] flush failed: {}", e);
            PrintError::UsbError(format!("failed to flush USB endpoint: {}", e))
        })?;
        eprintln!("[raw_usb] write complete");

        // Some label-printer firmwares expect the host to drain the IN endpoint after a write;
        // otherwise the device stays in a busy/error state. Read and discard any status bytes.
        self.drain_in_endpoint();

        Ok(())
    }

    /// Minimal USB printer-class handshake. The BEEPRT BY-480BT firmware
    /// advertises class 0x07 but stalls on GET_PORT_STATUS/SOFT_RESET, so we
    /// only issue GET_DEVICE_ID and clear any halt condition before writing.
    fn usb_printer_handshake(&self) -> Result<(), PrintError> {
        let index = self.interface_number as u16;

        // GET_DEVICE_ID (request 0) — this one works on BY-480BT.
        eprintln!("[raw_usb] GET_DEVICE_ID");
        match self.claimed_interface.control_in(ControlIn {
            control_type: ControlType::Class,
            recipient: Recipient::Interface,
            request: 0,
            value: 0,
            index,
            length: 256,
        }, Duration::from_millis(500)).wait() {
            Ok(buf) => {
                let text = String::from_utf8_lossy(&buf);
                eprintln!("[raw_usb] GET_DEVICE_ID ok ({} bytes): {}", buf.len(), text.trim())
            }
            Err(e) => eprintln!("[raw_usb] GET_DEVICE_ID failed: {}", e),
        }

        // Clear any stall left by previous attempts on the OUT endpoint.
        self.clear_out_halt();

        Ok(())
    }

    fn clear_out_halt(&self) {
        let mut endpoint = match self.claimed_interface.endpoint::<Bulk, Out>(self.endpoint_address) {
            Ok(ep) => ep,
            Err(e) => {
                eprintln!("[raw_usb] could not open OUT endpoint for clear_halt: {}", e);
                return;
            }
        };
        match endpoint.clear_halt().wait() {
            Ok(_) => eprintln!("[raw_usb] OUT endpoint halt cleared"),
            Err(e) => eprintln!("[raw_usb] clear_halt failed: {}", e),
        }
    }

    fn drain_in_endpoint(&self) {
        let Some(in_addr) = self.in_endpoint_address else {
            return;
        };
        let mut reader = match self.claimed_interface.endpoint::<Bulk, In>(in_addr) {
            Ok(ep) => ep.reader(self.max_packet_size).with_read_timeout(Duration::from_millis(200)),
            Err(e) => {
                eprintln!("[raw_usb] could not open IN endpoint {:02X}: {}", in_addr, e);
                return;
            }
        };
        let mut buf = [0u8; 64];
        match std::io::Read::read(&mut reader, &mut buf) {
            Ok(n) => eprintln!("[raw_usb] drained {} bytes from IN endpoint {:02X}", n, in_addr),
            Err(e) => eprintln!("[raw_usb] IN endpoint drain finished (timeout/error): {}", e),
        }
    }
}

impl escpos::driver::Driver for RawLabelUsbDriver {
    fn name(&self) -> String {
        format!(
            "raw label usb (endpoint={:02X})",
            self.endpoint_address
        )
    }

    fn write(&self, data: &[u8]) -> escpos::errors::Result<()> {
        self.write_all(data).map_err(|e| escpos::errors::PrinterError::Io(e.to_string()))
    }

    fn read(&self, _buf: &mut [u8]) -> escpos::errors::Result<usize> {
        Ok(0)
    }

    fn flush(&self) -> escpos::errors::Result<()> {
        Ok(())
    }
}
