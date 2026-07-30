use crate::print::error::PrintError;
use crate::print::ticket::CommandItem;

pub const DEFAULT_LABEL_WIDTH_MM: u32 = 40;
pub const DEFAULT_LABEL_HEIGHT_MM: u32 = 30;
pub const DEFAULT_LABEL_GAP_MM: u32 = 2;

#[derive(Debug, Clone)]
pub struct LabelPayload {
    pub header_text: String,
    pub items: Vec<CommandItem>,
    pub width_mm: Option<u32>,
    pub height_mm: Option<u32>,
    pub gap_mm: Option<u32>,
}

#[derive(Debug, Clone, Copy)]
pub enum LabelLanguage {
    Tspl,
    Zpl,
    Epl,
    Cpcl,
}

impl LabelLanguage {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "tspl" => Some(LabelLanguage::Tspl),
            "zpl" => Some(LabelLanguage::Zpl),
            "epl" => Some(LabelLanguage::Epl),
            "cpcl" => Some(LabelLanguage::Cpcl),
            _ => None,
        }
    }
}

pub fn build_label_bytes(payload: &LabelPayload, language: LabelLanguage) -> Result<Vec<u8>, PrintError> {
    match language {
        LabelLanguage::Tspl => tspl::build_label_bytes(payload),
        LabelLanguage::Zpl => zpl::build_label_bytes(payload),
        LabelLanguage::Epl => epl::build_label_bytes(payload),
        LabelLanguage::Cpcl => cpcl::build_label_bytes(payload),
    }
}

pub fn build_test_label(language: LabelLanguage) -> Vec<u8> {
    match language {
        LabelLanguage::Tspl => tspl::build_test_label(),
        LabelLanguage::Zpl => zpl::build_test_label(),
        LabelLanguage::Epl => epl::build_test_label(),
        LabelLanguage::Cpcl => cpcl::build_test_label(),
    }
}

pub mod tspl;
pub mod zpl;
pub mod epl;
pub mod cpcl;
pub mod raster;
