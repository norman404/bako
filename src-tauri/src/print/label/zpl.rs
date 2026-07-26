use std::fmt::Write;

use crate::print::error::PrintError;
use super::{LabelPayload, DEFAULT_LABEL_GAP_MM, DEFAULT_LABEL_HEIGHT_MM, DEFAULT_LABEL_WIDTH_MM};

fn map_err(e: std::fmt::Error) -> PrintError {
    PrintError::LabelGeneration(e.to_string())
}

fn mm_to_dots(mm: u32) -> u32 {
    // ZPL default density is 203 dpi ≈ 8 dots/mm.
    mm * 8
}

fn escape_zpl(text: &str) -> String {
    // ZPL uses ^ and ~ as control characters. The FD command accepts any bytes except the
    // field-separator ^FS. Escaping is not standardized for non-ASCII; we keep it simple.
    text.replace('^', " ").replace('~', " ")
}

pub fn build_label_bytes(payload: &LabelPayload) -> Result<Vec<u8>, PrintError> {
    let mut output = String::new();
    let width = payload.width_mm.unwrap_or(DEFAULT_LABEL_WIDTH_MM);
    let height = payload.height_mm.unwrap_or(DEFAULT_LABEL_HEIGHT_MM);
    let _gap = payload.gap_mm.unwrap_or(DEFAULT_LABEL_GAP_MM);

    let w = mm_to_dots(width);
    let h = mm_to_dots(height);

    output.write_fmt(format_args!("^XA\r\n^PW{}\r\n^LL{}\r\n", w, h)).map_err(map_err)?;

    let mut y: u32 = 20;
    output.write_fmt(format_args!("^FO10,{}\r\n^ADN,18,10\r\n^FD{}^FS\r\n", y, escape_zpl(&payload.header_text))).map_err(map_err)?;
    y += 28;

    for item in &payload.items {
        output.write_fmt(format_args!("^FO10,{}\r\n^ADN,18,10\r\n^FD{}^FS\r\n", y, escape_zpl(&item.name))).map_err(map_err)?;
        y += 22;

        for modifier in &item.modifiers {
            let label = match (&modifier.option_name, &modifier.text_value) {
                (Some(option), Some(text)) => format!("{}: {} - {}", modifier.group_name, option, text),
                (Some(option), None) => format!("{}: {}", modifier.group_name, option),
                (None, Some(text)) => format!("{}: {}", modifier.group_name, text),
                (None, None) => modifier.group_name.clone(),
            };
            output.write_fmt(format_args!("^FO10,{}\r\n^ADN,16,8\r\n^FD{}^FS\r\n", y, escape_zpl(&label))).map_err(map_err)?;
            y += 20;
        }

        y += 10;
    }

    output.write_str("^XZ\r\n").map_err(map_err)?;
    Ok(output.into_bytes())
}

pub fn build_test_label() -> Vec<u8> {
    let mut output = String::new();
    output.push_str("^XA\r\n");
    output.push_str("^PW320\r\n");
    output.push_str("^LL240\r\n");
    output.push_str("^FO10,30\r\n");
    output.push_str("^ADN,24,12\r\n");
    output.push_str("^FDBAKO TEST^FS\r\n");
    output.push_str("^XZ\r\n");
    output.into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::print::ticket::CommandItem;

    #[test]
    fn build_label_bytes_generates_zpl_command_structure() {
        let payload = LabelPayload {
            header_text: "COMANDA".to_owned(),
            items: vec![CommandItem {
                name: "Taco".to_owned(),
                quantity: 1,
                modifiers: vec![],
            }],
            width_mm: Some(40),
            height_mm: Some(30),
            gap_mm: Some(2),
        };

        let bytes = build_label_bytes(&payload).unwrap();
        let output = String::from_utf8(bytes).unwrap();

        assert!(output.starts_with("^XA"), "expected ^XA start, got: {}", output);
        assert!(output.contains("^XZ"), "expected ^XZ end, got: {}", output);
        assert!(output.contains("^PW320"), "expected width, got: {}", output);
        assert!(output.contains("^LL240"), "expected height, got: {}", output);
        assert!(output.contains("COMANDA"), "expected header text, got: {}", output);
        assert!(output.contains("Taco"), "expected item text, got: {}", output);
    }
}
