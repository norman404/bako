// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod commands;
mod print;

use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

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
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:bako.db", migrations)
                .build(),
        )
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::print_ticket, commands::test_printer, commands::list_usb_printers])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
