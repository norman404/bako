use std::fmt::Write;

use super::{LabelPayload, DEFAULT_LABEL_GAP_MM, DEFAULT_LABEL_HEIGHT_MM, DEFAULT_LABEL_WIDTH_MM};
use crate::print::error::PrintError;

fn map_err(e: std::fmt::Error) -> PrintError {
    PrintError::LabelGeneration(e.to_string())
}

fn mm_to_cpcl_dots(mm: u32) -> u32 {
    // CPCL default density is 203 dpi ≈ 8 dots/mm.
    mm * 8
}

fn escape_cpcl(text: &str) -> String {
    // CPCL TEXT command is terminated by end-of-line; avoid literal newlines in the text.
    text.replace('\r', " ").replace('\n', " ")
}

pub fn build_label_bytes(payload: &LabelPayload) -> Result<Vec<u8>, PrintError> {
    let mut output = String::new();
    let width = payload.width_mm.unwrap_or(DEFAULT_LABEL_WIDTH_MM);
    let height = payload.height_mm.unwrap_or(DEFAULT_LABEL_HEIGHT_MM);
    let _gap = payload.gap_mm.unwrap_or(DEFAULT_LABEL_GAP_MM);

    let w = mm_to_cpcl_dots(width);
    let h = mm_to_cpcl_dots(height);

    // ! command: start label, horizontal offset, max label width, max label height, copies
    output
        .write_fmt(format_args!("! 0 200 200 {} 1\r\n", h))
        .map_err(map_err)?;
    output
        .write_fmt(format_args!("PAGE-WIDTH {}\r\n", w))
        .map_err(map_err)?;

    let mut y: u32 = 30;
    output
        .write_fmt(format_args!(
            "T 4 0 10 {} {}\r\n",
            y,
            escape_cpcl(&payload.header_text)
        ))
        .map_err(map_err)?;
    y += 36;

    if let Some(order_name) = payload
        .order_name
        .as_deref()
        .filter(|order_name| !order_name.is_empty())
    {
        output
            .write_fmt(format_args!(
                "T 2 0 10 {} Name: {}\r\n",
                y,
                escape_cpcl(order_name)
            ))
            .map_err(map_err)?;
        y += 24;
    }

    for item in &payload.items {
        output
            .write_fmt(format_args!(
                "T 3 0 10 {} {}\r\n",
                y,
                escape_cpcl(&item.name)
            ))
            .map_err(map_err)?;
        y += 28;

        for modifier in &item.modifiers {
            let label = match (&modifier.option_name, &modifier.text_value) {
                (Some(option), Some(text)) => {
                    format!("{}: {} - {}", modifier.group_name, option, text)
                }
                (Some(option), None) => format!("{}: {}", modifier.group_name, option),
                (None, Some(text)) => format!("{}: {}", modifier.group_name, text),
                (None, None) => modifier.group_name.clone(),
            };
            output
                .write_fmt(format_args!("T 2 0 10 {} {}\r\n", y, escape_cpcl(&label)))
                .map_err(map_err)?;
            y += 24;
        }

        y += 12;
    }

    output.write_str("FORM\r\n").map_err(map_err)?;
    output.write_str("PRINT\r\n").map_err(map_err)?;
    Ok(output.into_bytes())
}

pub fn build_test_label() -> Vec<u8> {
    let mut output = String::new();
    output.push_str("! 0 200 200 240 1\r\n");
    output.push_str("PAGE-WIDTH 320\r\n");
    output.push_str("T 4 0 10 40 BAKO TEST\r\n");
    output.push_str("FORM\r\n");
    output.push_str("PRINT\r\n");
    output.into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::print::ticket::CommandItem;

    #[test]
    fn build_label_bytes_renders_order_name() {
        let payload = LabelPayload {
            order_name: Some("Mesa 4".to_owned()),
            header_text: "COMANDA".to_owned(),
            items: vec![],
            width_mm: Some(40),
            height_mm: Some(30),
            gap_mm: Some(2),
        };

        let output = String::from_utf8(build_label_bytes(&payload).unwrap()).unwrap();

        assert!(output.contains("Name: Mesa 4"));
    }

    #[test]
    fn build_label_bytes_generates_cpcl_command_structure() {
        let payload = LabelPayload {
            order_name: None,
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

        assert!(
            output.starts_with("! 0 200 200"),
            "expected CPCL start, got: {}",
            output
        );
        assert!(
            output.contains("PAGE-WIDTH 320"),
            "expected width, got: {}",
            output
        );
        assert!(
            output.contains("COMANDA"),
            "expected header text, got: {}",
            output
        );
        assert!(
            output.contains("Taco"),
            "expected item text, got: {}",
            output
        );
        assert!(
            output.contains("PRINT"),
            "expected PRINT command, got: {}",
            output
        );
    }
}
