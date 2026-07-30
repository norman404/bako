use std::fmt::Write as FmtWrite;

use crate::print::error::PrintError;
use super::{LabelPayload, DEFAULT_LABEL_GAP_MM, DEFAULT_LABEL_HEIGHT_MM, DEFAULT_LABEL_WIDTH_MM};

fn map_err(e: std::fmt::Error) -> PrintError {
    PrintError::LabelGeneration(e.to_string())
}

fn write_setup_commands(
    output: &mut Vec<u8>,
    width: u32,
    height: u32,
    gap: u32,
) -> Result<(), PrintError> {
    let mut s = String::new();
    s.write_fmt(format_args!("SIZE {} mm,{} mm\r\n", width, height)).map_err(map_err)?;
    s.push_str("SET RIBBON OFF\r\n");
    s.push_str("REFERENCE 0,0\r\n");
    s.write_fmt(format_args!("GAP {} dot,0 dot\r\n", gap * 8)).map_err(map_err)?;
    s.push_str("OFFSET 0 dot\r\n");
    s.push_str("DENSITY 8\r\n");
    s.push_str("SETC AUTODOTTED OFF\r\n");
    s.push_str("SETC PAUSEKEY ON\r\n");
    s.push_str("SETC WATERMARK ON\r\n");
    s.push_str("CLS\r\n");
    output.extend_from_slice(s.as_bytes());
    Ok(())
}

pub fn build_label_bytes(payload: &LabelPayload) -> Result<Vec<u8>, PrintError> {
    let width = payload.width_mm.unwrap_or(DEFAULT_LABEL_WIDTH_MM);
    let height = payload.height_mm.unwrap_or(DEFAULT_LABEL_HEIGHT_MM);
    let gap = payload.gap_mm.unwrap_or(DEFAULT_LABEL_GAP_MM);

    let label = super::raster::render_label(width, height, &payload.header_text, &payload.items)?;

    let mut output = Vec::new();
    write_setup_commands(&mut output, width, height, gap)?;

    let mut cmd = String::new();
    write!(cmd, "BITMAP 0,0,{},{},0,", label.width_bytes, label.height_dots).map_err(map_err)?;
    output.extend_from_slice(cmd.as_bytes());
    output.extend_from_slice(&label.data);
    output.extend_from_slice(b"\r\n");

    output.extend_from_slice(b"PRINT 1,1\r\n");

    Ok(output)
}

pub fn build_test_label() -> Vec<u8> {
    build_minimal_test_label()
}

pub fn build_minimal_test_label() -> Vec<u8> {
    let payload = LabelPayload {
        header_text: "BAKO TEST".to_owned(),
        items: vec![],
        width_mm: Some(DEFAULT_LABEL_WIDTH_MM),
        height_mm: Some(DEFAULT_LABEL_HEIGHT_MM),
        gap_mm: Some(DEFAULT_LABEL_GAP_MM),
    };
    build_label_bytes(&payload).unwrap_or_else(|_| {
        let mut output = Vec::new();
        let _ = write_setup_commands(&mut output, DEFAULT_LABEL_WIDTH_MM, DEFAULT_LABEL_HEIGHT_MM, DEFAULT_LABEL_GAP_MM);
        output.extend_from_slice(b"PRINT 1,1\r\n");
        output
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::print::ticket::CommandItem;

    fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
        haystack.windows(needle.len()).position(|w| w == needle)
    }

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

        assert!(find_subslice(&bytes, b"SIZE 40 mm,30 mm\r\n").is_some(), "expected SIZE command");
        assert!(find_subslice(&bytes, b"GAP 16 dot,0 dot\r\n").is_some(), "expected GAP in dots");
        assert!(find_subslice(&bytes, b"DENSITY 8\r\n").is_some(), "expected DENSITY command");
        assert!(find_subslice(&bytes, b"CLS\r\n").is_some(), "expected CLS command");
        assert!(find_subslice(&bytes, b"BITMAP 0,0,40,240,0,").is_some(), "expected BITMAP command");
        assert!(find_subslice(&bytes, b"PRINT 1,1\r\n").is_some(), "expected PRINT command");
        assert!(!find_subslice(&bytes, b"END\r\n").is_some(), "END must not appear");
    }

    #[test]
    fn build_label_bytes_bitmap_data_length_matches_dimensions() {
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

        let bitmap_cmd = b"BITMAP 0,0,40,240,0,";
        let pos = find_subslice(&bytes, bitmap_cmd).expect("BITMAP command not found");
        let data_start = pos + bitmap_cmd.len();
        let expected_len = 40usize * 240usize;
        assert_eq!(
            &bytes[data_start..data_start + expected_len].len(),
            &expected_len,
            "bitmap data length should be width_bytes * height_dots"
        );
    }

    #[test]
    fn build_label_bytes_includes_xprinter_config_commands() {
        let payload = LabelPayload {
            header_text: "COMANDA".to_owned(),
            items: vec![],
            width_mm: Some(40),
            height_mm: Some(30),
            gap_mm: Some(2),
        };

        let bytes = build_label_bytes(&payload).unwrap();

        assert!(find_subslice(&bytes, b"SET RIBBON OFF\r\n").is_some());
        assert!(find_subslice(&bytes, b"REFERENCE 0,0\r\n").is_some());
        assert!(find_subslice(&bytes, b"OFFSET 0 dot\r\n").is_some());
        assert!(find_subslice(&bytes, b"SETC AUTODOTTED OFF\r\n").is_some());
        assert!(find_subslice(&bytes, b"SETC PAUSEKEY ON\r\n").is_some());
        assert!(find_subslice(&bytes, b"SETC WATERMARK ON\r\n").is_some());
    }

    #[test]
    fn build_test_label_does_not_contain_end() {
        let bytes = build_minimal_test_label();

        assert!(find_subslice(&bytes, b"PRINT 1,1\r\n").is_some(), "expected PRINT command");
        assert!(!find_subslice(&bytes, b"END\r\n").is_some(), "END must not appear");
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

        assert!(find_subslice(&bytes, b"SIZE 40 mm,30 mm\r\n").is_some(), "expected default SIZE");
        assert!(find_subslice(&bytes, b"GAP 16 dot,0 dot\r\n").is_some(), "expected default GAP");
    }

    #[test]
    fn build_label_bytes_renders_custom_dimensions() {
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

        assert!(find_subslice(&bytes, b"SIZE 50 mm,25 mm\r\n").is_some(), "expected custom SIZE");
        assert!(find_subslice(&bytes, b"GAP 24 dot,0 dot\r\n").is_some(), "expected custom GAP (3mm=24dots)");
        assert!(find_subslice(&bytes, b"BITMAP 0,0,50,200,0,").is_some(), "expected BITMAP for 50mm width (400 dots = 50 bytes)");
    }

    #[test]
    fn build_label_bytes_contains_no_text_command() {
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

        assert!(!find_subslice(&bytes, b"TEXT ").is_some(), "TEXT command must not appear");
    }
}