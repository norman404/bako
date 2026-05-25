// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

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
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:bako.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
