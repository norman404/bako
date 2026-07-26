use std::fmt::Write;

use crate::print::error::PrintError;
use super::{LabelPayload, DEFAULT_LABEL_GAP_MM, DEFAULT_LABEL_HEIGHT_MM, DEFAULT_LABEL_WIDTH_MM};

fn map_err(e: std::fmt::Error) -> PrintError {
    PrintError::LabelGeneration(e.to_string())
}

fn write_text_line<T: Write>(f: &mut T, y: &mut u32, content: &str) -> Result<(), PrintError> {
    f.write_fmt(format_args!("TEXT 10,{},\"0\",0,1,1,\"{}\"\r\n", y, escape_tspl(content)))
        .map_err(map_err)?;
    *y += 18;
    Ok(())
}

pub fn build_label_bytes(payload: &LabelPayload) -> Result<Vec<u8>, PrintError> {
    let mut output = String::new();
    let width = payload.width_mm.unwrap_or(DEFAULT_LABEL_WIDTH_MM);
    let height = payload.height_mm.unwrap_or(DEFAULT_LABEL_HEIGHT_MM);
    let gap = payload.gap_mm.unwrap_or(DEFAULT_LABEL_GAP_MM);

    output.write_fmt(format_args!("SIZE {} mm,{} mm\r\n", width, height))
        .map_err(map_err)?;
    output.write_fmt(format_args!("GAP {} mm,0 mm\r\n", gap))
        .map_err(map_err)?;
    output.write_str("DIRECTION 1,0\r\n").map_err(map_err)?;
    output.write_str("REFERENCE 0,0\r\n").map_err(map_err)?;
    output.write_str("SET RIBBON OFF\r\n").map_err(map_err)?;
    output.write_str("DENSITY 8\r\n").map_err(map_err)?;
    output.write_str("SPEED 4\r\n").map_err(map_err)?;
    output.write_str("SET PEEL OFF\r\n").map_err(map_err)?;
    output.write_str("SET TEAR OFF\r\n").map_err(map_err)?;
    output.write_str("SET CUTTER OFF\r\n").map_err(map_err)?;
    output.write_str("CLS\r\n").map_err(map_err)?;

    let mut y: u32 = 16;
    output.write_fmt(format_args!("TEXT 10,{},\"0\",0,1,1,\"{}\"\r\n", y, escape_tspl(&payload.header_text)))
        .map_err(map_err)?;
    y += 20;

    for item in &payload.items {
        write_text_line(&mut output, &mut y, &item.name)?;

        for modifier in &item.modifiers {
            let label = match (&modifier.option_name, &modifier.text_value) {
                (Some(option), Some(text)) => format!("{}: {} - {}", modifier.group_name, option, text),
                (Some(option), None) => format!("{}: {}", modifier.group_name, option),
                (None, Some(text)) => format!("{}: {}", modifier.group_name, text),
                (None, None) => modifier.group_name.clone(),
            };
            write_text_line(&mut output, &mut y, &label)?;
        }

        y += 10;
    }

    output.write_str("PRINT 1,1\r\n").map_err(map_err)?;
    output.write_str("END\r\n").map_err(map_err)?;

    Ok(output.into_bytes())
}

pub fn build_test_label() -> Vec<u8> {
    build_minimal_test_label()
}

pub fn build_minimal_test_label() -> Vec<u8> {
    let mut output = String::new();
    output.push_str("SIZE 40 mm,30 mm\r\n");
    output.push_str("GAP 2 mm,0 mm\r\n");
    output.push_str("DIRECTION 1,0\r\n");
    output.push_str("REFERENCE 0,0\r\n");
    output.push_str("SET RIBBON OFF\r\n");
    output.push_str("DENSITY 8\r\n");
    output.push_str("SPEED 4\r\n");
    output.push_str("SET PEEL OFF\r\n");
    output.push_str("SET TEAR OFF\r\n");
    output.push_str("SET CUTTER OFF\r\n");
    output.push_str("HOME\r\n");
    output.push_str("CLS\r\n");
    output.push_str("TEXT 10,20,\"0\",0,1,1,\"BAKO TEST\"\r\n");
    output.push_str("PRINT 1,1\r\n");
    output.push_str("END\r\n");
    output.into_bytes()
}

fn escape_tspl(text: &str) -> String {
    text.replace('\\', "\\\\").replace('"', "\\\"")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::print::ticket::CommandItem;

    #[test]
    fn build_label_bytes_generates_tspl_command_structure() {
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

        assert!(output.contains("SIZE 40 mm,30 mm"), "expected SIZE command, got: {}", output);
        assert!(output.contains("GAP 2 mm,0 mm"), "expected GAP command, got: {}", output);
        assert!(output.contains("DIRECTION 1,0"), "expected DIRECTION command, got: {}", output);
        assert!(output.contains("REFERENCE 0,0"), "expected REFERENCE command, got: {}", output);
        assert!(output.contains("SET PEEL OFF"), "expected SET PEEL OFF command, got: {}", output);
        assert!(output.contains("CLS"), "expected CLS command, got: {}", output);
        assert!(output.contains("COMANDA"), "expected header text, got: {}", output);
        assert!(output.contains("Taco"), "expected item text, got: {}", output);
        assert!(output.contains("PRINT 1,1"), "expected PRINT command, got: {}", output);
        assert!(output.contains("END"), "expected END command, got: {}", output);
    }

    #[test]
    fn build_label_bytes_uses_defaults_when_dimensions_missing() {
        let payload = LabelPayload {
            header_text: "COCINA".to_owned(),
            items: vec![CommandItem {
                name: "Burrito".to_owned(),
                quantity: 1,
                modifiers: vec![],
            }],
            width_mm: None,
            height_mm: None,
            gap_mm: None,
        };

        let bytes = build_label_bytes(&payload).unwrap();
        let output = String::from_utf8(bytes).unwrap();

        assert!(output.contains("SIZE 40 mm,30 mm"), "expected default SIZE, got: {}", output);
        assert!(output.contains("GAP 2 mm,0 mm"), "expected default GAP, got: {}", output);
    }

    #[test]
    fn build_label_bytes_renders_modifiers() {
        let payload = LabelPayload {
            header_text: "BAR".to_owned(),
            items: vec![CommandItem {
                name: "Margarita".to_owned(),
                quantity: 1,
                modifiers: vec![crate::print::ticket::CommandItemModifier {
                    group_name: "Hielo".to_owned(),
                    option_name: Some("Poco".to_owned()),
                    text_value: None,
                }],
            }],
            width_mm: Some(50),
            height_mm: Some(25),
            gap_mm: Some(3),
        };

        let bytes = build_label_bytes(&payload).unwrap();
        let output = String::from_utf8(bytes).unwrap();

        assert!(output.contains("SIZE 50 mm,25 mm"), "expected custom SIZE, got: {}", output);
        assert!(output.contains("GAP 3 mm,0 mm"), "expected custom GAP, got: {}", output);
        assert!(output.contains("Margarita"), "expected item name, got: {}", output);
        assert!(output.contains("Hielo: Poco"), "expected modifier text, got: {}", output);
    }

    #[test]
    fn build_label_bytes_escapes_quotes() {
        let payload = LabelPayload {
            header_text: "COCINA \"PRINCIPAL\"".to_owned(),
            items: vec![],
            width_mm: Some(40),
            height_mm: Some(30),
            gap_mm: Some(2),
        };

        let bytes = build_label_bytes(&payload).unwrap();
        let output = String::from_utf8(bytes).unwrap();

        assert!(output.contains("COCINA \\\"PRINCIPAL\\\""), "expected escaped quotes, got: {}", output);
    }
}
