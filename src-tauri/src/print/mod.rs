pub mod adapter;
pub mod error;
pub mod ticket;
pub mod usb_detection;

pub use adapter::{create_printer_driver, print_ticket_with_driver, test_printer_with_driver};
pub use ticket::{TicketPayload, TicketItem, TicketCustomer};
