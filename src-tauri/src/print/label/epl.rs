use std::fmt::Write;

use super::{LabelPayload, DEFAULT_LABEL_GAP_MM, DEFAULT_LABEL_HEIGHT_MM, DEFAULT_LABEL_WIDTH_MM};
use crate::print::error::PrintError;

fn map_err(e: std::fmt::Error) -> PrintError {
    PrintError::LabelGeneration(e.to_string())
}

fn mm_to_epl_dots(mm: u32) -> u32 {
    // EPL default density is 203 dpi ≈ 8 dots/mm.
    mm * 8
}

fn escape_epl(text: &str) -> String {
    // EPL line format uses quotes around text; escape internal quotes.
    text.replace('"', "\"\"")
}

pub fn build_label_bytes(payload: &LabelPayload) -> Result<Vec<u8>, PrintError> {
    let mut output = String::new();
    let width = payload.width_mm.unwrap_or(DEFAULT_LABEL_WIDTH_MM);
    let height = payload.height_mm.unwrap_or(DEFAULT_LABEL_HEIGHT_MM);
    let _gap = payload.gap_mm.unwrap_or(DEFAULT_LABEL_GAP_MM);

    let w = mm_to_epl_dots(width);
    let h = mm_to_epl_dots(height);

    // N: clear image buffer
    output.write_str("N\r\n").map_err(map_err)?;
    // q: label width in dots
    output
        .write_fmt(format_args!("q{}\r\n", w))
        .map_err(map_err)?;
    // Q: label height, gap (using 0 for continuous/gap labels; printer usually auto-detects gap)
    output
        .write_fmt(format_args!(
            "Q{},{}\r\n",
            h,
            mm_to_epl_dots(DEFAULT_LABEL_GAP_MM)
        ))
        .map_err(map_err)?;

    let mut y: u32 = 20;
    output
        .write_fmt(format_args!(
            "A10,{},0,1,1,1,N,\"{}\"\r\n",
            y,
            escape_epl(&payload.header_text)
        ))
        .map_err(map_err)?;
    y += 26;

    if let Some(order_name) = payload
        .order_name
        .as_deref()
        .filter(|order_name| !order_name.is_empty())
    {
        output
            .write_fmt(format_args!(
                "A10,{},0,1,1,1,N,\"Name: {}\"\r\n",
                y,
                escape_epl(order_name)
            ))
            .map_err(map_err)?;
        y += 20;
    }

    for item in &payload.items {
        output
            .write_fmt(format_args!(
                "A10,{},0,1,1,1,N,\"{}\"\r\n",
                y,
                escape_epl(&item.name)
            ))
            .map_err(map_err)?;
        y += 22;

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
                .write_fmt(format_args!(
                    "A10,{},0,1,1,1,N,\"{}\"\r\n",
                    y,
                    escape_epl(&label)
                ))
                .map_err(map_err)?;
            y += 20;
        }

        y += 10;
    }

    output.write_str("P1\r\n").map_err(map_err)?;
    Ok(output.into_bytes())
}

pub fn build_test_label() -> Vec<u8> {
    let mut output = String::new();
    output.push_str("N\r\n");
    output.push_str("q320\r\n");
    output.push_str("Q240,16\r\n");
    output.push_str("A10,30,0,1,1,1,N,\"BAKO TEST\"\r\n");
    output.push_str("P1\r\n");
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
    fn build_label_bytes_generates_epl_command_structure() {
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
            output.starts_with("N\r\n"),
            "expected N start, got: {}",
            output
        );
        assert!(output.contains("q320"), "expected width, got: {}", output);
        assert!(output.contains("Q240"), "expected height, got: {}", output);
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
            output.contains("P1"),
            "expected P1 print command, got: {}",
            output
        );
    }
}
