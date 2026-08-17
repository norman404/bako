use ab_glyph::{point, Font, FontRef, PxScale, ScaleFont};

use crate::print::error::PrintError;
use crate::print::ticket::CommandItem;

const FONT_BYTES: &[u8] = include_bytes!("DejaVuSansMono.ttf");

const DOTS_PER_MM: u32 = 8;

/// Reference height in dots (30mm @ 8 dots/mm) used as baseline for font scaling.
const REF_HEIGHT_DOTS: f32 = 240.0;

/// Base font sizes for a 30mm (240 dots) label.
/// Scaled proportionally for other label heights.
const BASE_HEADER_SIZE: f32 = 36.0;
const BASE_ITEM_SIZE: f32 = 28.0;
const BASE_MOD_SIZE: f32 = 22.0;

/// Minimum font sizes to keep text readable on very small labels.
const MIN_HEADER_SIZE: f32 = 28.0;
const MIN_ITEM_SIZE: f32 = 20.0;
const MIN_MOD_SIZE: f32 = 16.0;

/// Maximum font sizes to prevent absurdly large text on huge labels.
const MAX_HEADER_SIZE: f32 = 72.0;
const MAX_ITEM_SIZE: f32 = 56.0;
const MAX_MOD_SIZE: f32 = 44.0;

const LEFT_MARGIN: f32 = 10.0;
const TOP_MARGIN: u32 = 4;
const HEADER_GAP: u32 = 6;
const ITEM_GAP: u32 = 10;
const LINE_PADDING: u32 = 2;

const BLACK_THRESHOLD: f32 = 0.5;

#[derive(Debug, Clone)]
pub struct RasterLabel {
    pub width_bytes: usize,
    pub height_dots: usize,
    pub data: Vec<u8>,
}

impl RasterLabel {
    fn new(width_mm: u32, height_mm: u32) -> Self {
        let width_dots = (width_mm * DOTS_PER_MM) as usize;
        let height_dots = (height_mm * DOTS_PER_MM) as usize;
        let width_bytes = width_dots.div_ceil(8);
        let data = vec![0xFFu8; width_bytes * height_dots];
        Self {
            width_bytes,
            height_dots,
            data,
        }
    }

    fn width_dots(&self) -> usize {
        self.width_bytes * 8
    }

    fn set_black(&mut self, px: i32, py: i32) {
        if px < 0 || py < 0 {
            return;
        }
        let px = px as usize;
        let py = py as usize;
        if px >= self.width_dots() || py >= self.height_dots {
            return;
        }
        let byte_idx = py * self.width_bytes + (px / 8);
        let bit = 7 - (px % 8) as u8;
        self.data[byte_idx] &= !(1u8 << bit);
    }

    fn render_text_line(
        &mut self,
        font: &FontRef,
        size: f32,
        text: &str,
        x_start: f32,
        baseline: f32,
    ) {
        let scaled = font.as_scaled(size);
        let mut x = x_start;
        let mut last_id: Option<ab_glyph::GlyphId> = None;

        for ch in text.chars() {
            let glyph_id = font.glyph_id(ch);
            if let Some(prev) = last_id {
                x += scaled.kern(prev, glyph_id);
            }

            let glyph = glyph_id.with_scale_and_position(PxScale::from(size), point(x, baseline));
            if let Some(outlined) = font.outline_glyph(glyph) {
                let bounds = outlined.px_bounds();
                let min_x = bounds.min.x;
                let min_y = bounds.min.y;
                outlined.draw(|gx, gy, coverage| {
                    if coverage > BLACK_THRESHOLD {
                        let px = min_x as i32 + gx as i32;
                        let py = min_y as i32 + gy as i32;
                        self.set_black(px, py);
                    }
                });
            }

            x += scaled.h_advance(glyph_id);
            last_id = Some(glyph_id);
        }
    }
}

fn load_font() -> Result<FontRef<'static>, PrintError> {
    FontRef::try_from_slice(FONT_BYTES)
        .map_err(|e| PrintError::LabelGeneration(format!("font load error: {}", e)))
}

fn line_height(font: &FontRef, size: f32) -> u32 {
    let scaled = font.as_scaled(size);
    let h = scaled.ascent() - scaled.descent() + scaled.line_gap();
    h.ceil() as u32 + LINE_PADDING
}

/// Calculate font sizes proportional to label height.
/// Uses 30mm (240 dots) as the reference height.
fn calculate_font_sizes(height_dots: u32) -> (f32, f32, f32) {
    let scale = (height_dots as f32 / REF_HEIGHT_DOTS).max(0.5).min(2.0);
    let header = (BASE_HEADER_SIZE * scale).clamp(MIN_HEADER_SIZE, MAX_HEADER_SIZE);
    let item = (BASE_ITEM_SIZE * scale).clamp(MIN_ITEM_SIZE, MAX_ITEM_SIZE);
    let modifier = (BASE_MOD_SIZE * scale).clamp(MIN_MOD_SIZE, MAX_MOD_SIZE);
    (header, item, modifier)
}

fn modifier_label(m: &crate::print::ticket::CommandItemModifier) -> String {
    match (&m.option_name, &m.text_value) {
        (Some(option), Some(text)) => format!("{}: {} - {}", m.group_name, option, text),
        (Some(option), None) => format!("{}: {}", m.group_name, option),
        (None, Some(text)) => format!("{}: {}", m.group_name, text),
        (None, None) => m.group_name.clone(),
    }
}

pub fn render_label(
    width_mm: u32,
    height_mm: u32,
    header_text: &str,
    items: &[CommandItem],
) -> Result<RasterLabel, PrintError> {
    let font = load_font()?;
    let mut label = RasterLabel::new(width_mm, height_mm);

    let height_dots = height_mm * DOTS_PER_MM;
    let (header_size, item_size, mod_size) = calculate_font_sizes(height_dots);

    let scaled_header = font.as_scaled(header_size);
    let mut cursor_y = TOP_MARGIN;
    let header_baseline = cursor_y as f32 + scaled_header.ascent();
    label.render_text_line(
        &font,
        header_size,
        header_text,
        LEFT_MARGIN,
        header_baseline,
    );
    cursor_y += line_height(&font, header_size) + HEADER_GAP;

    for item in items {
        let display_name = if item.quantity > 1 {
            format!("{}x {}", item.quantity, item.name)
        } else {
            item.name.clone()
        };

        let scaled_item = font.as_scaled(item_size);
        let item_baseline = cursor_y as f32 + scaled_item.ascent();
        label.render_text_line(&font, item_size, &display_name, LEFT_MARGIN, item_baseline);
        cursor_y += line_height(&font, item_size);

        for modifier in &item.modifiers {
            let label_text = modifier_label(modifier);
            let scaled_mod = font.as_scaled(mod_size);
            let mod_baseline = cursor_y as f32 + scaled_mod.ascent();
            label.render_text_line(
                &font,
                mod_size,
                &label_text,
                LEFT_MARGIN + 6.0,
                mod_baseline,
            );
            cursor_y += line_height(&font, mod_size);
        }

        cursor_y += ITEM_GAP;
    }

    Ok(label)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::print::ticket::CommandItem;

    fn render_default(header: &str, items: &[CommandItem]) -> RasterLabel {
        render_label(40, 30, header, items).unwrap()
    }

    #[test]
    fn render_label_dimensions_match_40x30mm() {
        let label = render_default("X", &[]);
        assert_eq!(
            label.width_bytes, 40,
            "40mm @ 8 dots/mm = 320 dots = 40 bytes/row"
        );
        assert_eq!(label.height_dots, 240, "30mm @ 8 dots/mm = 240 dots");
    }

    #[test]
    fn render_label_data_length_matches_dimensions() {
        let label = render_default("X", &[]);
        assert_eq!(label.data.len(), label.width_bytes * label.height_dots);
    }

    #[test]
    fn render_label_blank_is_all_white() {
        let label = render_default("", &[]);
        assert!(
            label.data.iter().all(|&b| b == 0xFF),
            "blank label should be all 1s (white)"
        );
    }

    #[test]
    fn render_label_text_produces_black_pixels() {
        let label = render_default("BAKO", &[]);
        let black_count = label
            .data
            .iter()
            .map(|&b| b.count_zeros() as usize)
            .sum::<usize>();
        assert!(
            black_count > 0,
            "expected some black (0) bits for rendered text"
        );
    }

    #[test]
    fn render_label_text_stays_within_width() {
        let label = render_default("COMANDA 123", &[]);
        let width_dots = 320usize;
        for row in 0..label.height_dots {
            let row_start = row * label.width_bytes;
            let last_byte = label.data[row_start + label.width_bytes - 1];
            let extra_bits = label.width_bytes * 8 - width_dots;
            if extra_bits > 0 {
                let mask = !((1u8 << extra_bits) - 1);
                assert_eq!(
                    last_byte & mask,
                    mask,
                    "padding bits in last byte of row {} must stay white",
                    row
                );
            }
        }
    }

    #[test]
    fn render_label_renders_items_and_modifiers() {
        let items = vec![CommandItem {
            name: "Taco".to_owned(),
            quantity: 1,
            modifiers: vec![crate::print::ticket::CommandItemModifier {
                group_name: "Salsa".to_owned(),
                option_name: Some("Roja".to_owned()),
                text_value: None,
            }],
        }];
        let blank = render_default("", &[]);
        let with_text = render_default("COMANDA", &items);
        let blank_black = blank
            .data
            .iter()
            .map(|&b| b.count_zeros() as usize)
            .sum::<usize>();
        let text_black = with_text
            .data
            .iter()
            .map(|&b| b.count_zeros() as usize)
            .sum::<usize>();
        assert!(
            text_black > blank_black,
            "items+modifiers should add black pixels beyond header"
        );
    }
}
