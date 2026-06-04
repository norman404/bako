use std::fmt;
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub enum PrintError {
    #[allow(dead_code)]
    NotConfigured,
    InvalidAddress(String),
    UsbError(String),
    NetworkError(String),
    TicketGeneration(String),
}

impl fmt::Display for PrintError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PrintError::NotConfigured => write!(f, "Printer not configured"),
            PrintError::InvalidAddress(msg) => write!(f, "Invalid printer address: {}", msg),
            PrintError::UsbError(msg) => write!(f, "USB printer error: {}", msg),
            PrintError::NetworkError(msg) => write!(f, "Network printer error: {}", msg),
            PrintError::TicketGeneration(msg) => write!(f, "Ticket generation error: {}", msg),
        }
    }
}

impl std::error::Error for PrintError {}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct PrintErrorPayload {
    pub message: String,
}

impl From<PrintError> for PrintErrorPayload {
    fn from(err: PrintError) -> Self {
        PrintErrorPayload {
            message: err.to_string(),
        }
    }
}
