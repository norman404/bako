// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod commands;
mod database_migrations;
mod print;

use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

pub const DATABASE_FILENAME: &str = "bako.db";
pub const DATABASE_URL: &str = "sqlite:bako.db";
pub const CURRENT_MIGRATION_VERSION: i64 = database_migrations::LABEL_ORIENTATION_MIGRATION_VERSION;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("../migrations/0000_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_menu",
            sql: include_str!("../migrations/0001_seed_menu.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "orders_customers",
            sql: include_str!("../migrations/0002_orders_customers.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "payments",
            sql: include_str!("../migrations/0003_payments.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "system_settings",
            sql: include_str!("../migrations/0005_system_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "category_colors",
            sql: include_str!("../migrations/0006_category_colors.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "feature_flags",
            sql: include_str!("../migrations/0007_feature_flags.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "menus",
            sql: include_str!("../migrations/0008_menus.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "product_menus",
            sql: include_str!("../migrations/0009_product_menus.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "delivery_persons",
            sql: include_str!("../migrations/0010_delivery_persons.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "printer_settings",
            sql: include_str!("../migrations/0011_printer_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "shifts",
            sql: include_str!("../migrations/0012_shifts.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "updater_flag",
            sql: include_str!("../migrations/0013_updater_flag.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "product_modifiers",
            sql: include_str!("../migrations/0014_product_modifiers.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "modifiers_flag_seed",
            sql: include_str!("../migrations/0015_modifiers_flag_seed.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "comandas_flag_seed",
            sql: include_str!("../migrations/0016_comandas_flag_seed.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "printers_and_category_printer",
            sql: include_str!("../migrations/0017_printers_and_category_printer.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "receipt_printing_flag_seed",
            sql: include_str!("../migrations/0018_receipt_printing_flag_seed.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "comanda_header_text",
            sql: include_str!("../migrations/0019_comanda_header_text.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "first_option_free",
            sql: include_str!("../migrations/0020_first_option_free.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "label_printer_columns",
            sql: include_str!("../migrations/0021_label_printer_columns.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "label_printer_language",
            sql: include_str!("../migrations/0022_label_printer_language.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "printer_is_default",
            sql: include_str!("../migrations/0023_printer_is_default.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 24,
            description: "printer_role_comanda",
            sql: include_str!("../migrations/0024_printer_role_comanda.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 25,
            description: "voided_at_orders",
            sql: include_str!("../migrations/0025_voided_at_orders.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 26,
            description: "cash_management",
            sql: include_str!("../migrations/0026_cash_management.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: CURRENT_MIGRATION_VERSION,
            description: "printer_label_orientation",
            sql: include_str!("../migrations/0027_printer_label_orientation.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(database_migrations::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations(DATABASE_URL, migrations)
                .build(),
        )
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::print_ticket,
            commands::print_command,
            commands::test_printer,
            commands::list_usb_printers,
            commands::validate_database,
            commands::get_database_info,
            commands::export_database,
            commands::prepare_database_restore,
            commands::restore_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
