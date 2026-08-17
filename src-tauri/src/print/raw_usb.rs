use super::error::PrintError;
use nusb::transfer::{Bulk, ControlIn, ControlType, In, Out, Recipient};
use nusb::{list_devices, MaybeFuture};
use std::sync::Arc;
use std::time::Duration;

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
        let devices = list_devices().wait().map_err(|e| {
            log::error!("[raw_usb] list_devices failed: {}", e);
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
                log::error!(
                    "[raw_usb] device {:04X}:{:04X} not found among {} listed",
                    vid,
                    pid,
                    found_count
                );
                PrintError::UsbError(format!("USB device {:04X}:{:04X} not found", vid, pid))
            })?;

        let device = Arc::new(device_info.open().wait().map_err(|e| {
            log::error!("[raw_usb] open failed: {}", e);
            PrintError::UsbError(format!("failed to open USB device: {}", e))
        })?);

        let config = device.active_configuration().map_err(|e| {
            log::error!("[raw_usb] active_configuration failed: {}", e);
            PrintError::UsbError(format!("failed to read active configuration: {}", e))
        })?;
        for interface in config.interfaces() {
            let interface_number = interface.interface_number();
            let claimed = device.claim_interface(interface_number).wait();
            let claimed_interface = match claimed {
                Ok(iface) => iface,
                Err(e) => {
                    log::debug!(
                        "[raw_usb] claim_interface {} failed: {}",
                        interface_number,
                        e
                    );
                    continue;
                }
            };

            let interface_number = interface.interface_number();
            let mut out_address: Option<(u8, usize)> = None;
            let mut in_address: Option<u8> = None;
            for alt in interface.alt_settings() {
                for endpoint in alt.endpoints() {
                    match endpoint.direction() {
                        nusb::transfer::Direction::Out if out_address.is_none() => {
                            out_address =
                                Some((endpoint.address(), endpoint.max_packet_size() as usize));
                        }
                        nusb::transfer::Direction::In if in_address.is_none() => {
                            in_address = Some(endpoint.address());
                        }
                        _ => {}
                    }
                }
            }

            if let Some((address, max_packet_size)) = out_address {
                log::info!(
                    "[raw_usb] opened {:04X}:{:04X} — OUT endpoint {:02X}, IN endpoint {:?}",
                    vid,
                    pid,
                    address,
                    in_address
                );
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

        log::error!(
            "[raw_usb] no usable OUT endpoint on {:04X}:{:04X}",
            vid,
            pid
        );
        Err(PrintError::UsbError(
            "no suitable OUT endpoint found on label printer".to_string(),
        ))
    }

    pub fn write_all(&self, data: &[u8]) -> Result<(), PrintError> {
        log::info!(
            "[raw_usb] writing {} bytes to endpoint {:02X}",
            data.len(),
            self.endpoint_address
        );

        self.usb_printer_handshake()?;

        let endpoint = self
            .claimed_interface
            .endpoint::<Bulk, Out>(self.endpoint_address)
            .map_err(|e| {
                log::error!("[raw_usb] endpoint open failed: {}", e);
                PrintError::UsbError(format!("failed to open endpoint: {}", e))
            })?;

        let mut writer = endpoint.writer(self.max_packet_size);

        let nul_preamble = [0u8; 64];
        std::io::Write::write_all(&mut writer, &nul_preamble).map_err(|e| {
            log::error!("[raw_usb] nul preamble write failed: {}", e);
            PrintError::UsbError(format!("failed to write NUL preamble: {}", e))
        })?;

        std::io::Write::write_all(&mut writer, data).map_err(|e| {
            log::error!("[raw_usb] write failed: {}", e);
            PrintError::UsbError(format!("failed to write to USB endpoint: {}", e))
        })?;
        writer.flush_end().map_err(|e| {
            log::error!("[raw_usb] flush_end failed: {}", e);
            PrintError::UsbError(format!("failed to flush_end USB endpoint: {}", e))
        })?;
        log::info!(
            "[raw_usb] write complete ({} bytes + 64-byte preamble)",
            data.len()
        );

        self.drain_in_endpoint();

        Ok(())
    }

    fn usb_printer_handshake(&self) -> Result<(), PrintError> {
        let index = self.interface_number as u16;

        match self
            .claimed_interface
            .control_in(
                ControlIn {
                    control_type: ControlType::Class,
                    recipient: Recipient::Interface,
                    request: 0,
                    value: 0,
                    index,
                    length: 256,
                },
                Duration::from_millis(500),
            )
            .wait()
        {
            Ok(buf) => {
                let text = String::from_utf8_lossy(&buf);
                log::debug!("[raw_usb] GET_DEVICE_ID: {}", text.trim());
            }
            Err(e) => log::debug!("[raw_usb] GET_DEVICE_ID failed: {}", e),
        }

        self.clear_out_halt();

        Ok(())
    }

    fn clear_out_halt(&self) {
        let mut endpoint = match self
            .claimed_interface
            .endpoint::<Bulk, Out>(self.endpoint_address)
        {
            Ok(ep) => ep,
            Err(e) => {
                log::debug!(
                    "[raw_usb] could not open OUT endpoint for clear_halt: {}",
                    e
                );
                return;
            }
        };
        match endpoint.clear_halt().wait() {
            Ok(_) => {}
            Err(e) => log::debug!("[raw_usb] clear_halt failed: {}", e),
        }
    }

    fn drain_in_endpoint(&self) {
        let Some(in_addr) = self.in_endpoint_address else {
            return;
        };
        let mut reader = match self.claimed_interface.endpoint::<Bulk, In>(in_addr) {
            Ok(ep) => ep
                .reader(self.max_packet_size)
                .with_read_timeout(Duration::from_millis(200)),
            Err(_) => return,
        };
        let mut buf = [0u8; 64];
        let _ = std::io::Read::read(&mut reader, &mut buf);
    }
}

impl escpos::driver::Driver for RawLabelUsbDriver {
    fn name(&self) -> String {
        format!("raw label usb (endpoint={:02X})", self.endpoint_address)
    }

    fn write(&self, data: &[u8]) -> escpos::errors::Result<()> {
        self.write_all(data)
            .map_err(|e| escpos::errors::PrinterError::Io(e.to_string()))
    }

    fn read(&self, _buf: &mut [u8]) -> escpos::errors::Result<usize> {
        Ok(0)
    }

    fn flush(&self) -> escpos::errors::Result<()> {
        Ok(())
    }
}
