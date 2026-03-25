use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;
use std::path::PathBuf;

/// 初始化本地 SQLite 数据库
pub async fn init_local_db(app_data_dir: PathBuf) -> Result<SqlitePool, sqlx::Error> {
    std::fs::create_dir_all(&app_data_dir).ok();
    let db_path = app_data_dir.join("duandb.sqlite");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // 创建表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS data_source (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alias TEXT NOT NULL,
            url TEXT NOT NULL DEFAULT '',
            host TEXT,
            port INTEGER DEFAULT 3306,
            user TEXT,
            password TEXT,
            db_type TEXT DEFAULT 'MYSQL',
            database_name TEXT,
            extend_info TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS console (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ddl TEXT,
            data_source_id INTEGER,
            database_name TEXT,
            schema_name TEXT,
            db_type TEXT DEFAULT 'MYSQL',
            status TEXT DEFAULT 'DRAFT',
            operation_type TEXT DEFAULT 'CONSOLE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS operation_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            ddl TEXT,
            data_source_id INTEGER,
            database_name TEXT,
            db_type TEXT,
            status TEXT,
            operation_rows INTEGER,
            use_time INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}
