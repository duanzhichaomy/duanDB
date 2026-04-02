use crate::state::MysqlPools;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;

/// 构建 MySQL 连接 URL
pub fn build_mysql_url(
    host: &str,
    port: i64,
    user: &str,
    password: &str,
    database: Option<&str>,
) -> String {
    let encoded_password = urlencoding::encode(password);
    match database {
        Some(db) if !db.is_empty() => {
            format!(
                "mysql://{}:{}@{}:{}/{}",
                user, encoded_password, host, port, db
            )
        }
        _ => {
            format!("mysql://{}:{}@{}:{}", user, encoded_password, host, port)
        }
    }
}

/// 获取或创建 MySQL 连接池
pub async fn get_or_create_pool(
    pools: &MysqlPools,
    pool_key: &str,
    url: &str,
) -> Result<MySqlPool, String> {
    // 先读取，看是否已存在
    {
        let read = pools.read().await;
        if let Some(pool) = read.get(pool_key) {
            return Ok(pool.clone());
        }
    }

    // 创建新连接池
    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .idle_timeout(std::time::Duration::from_secs(300))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .test_before_acquire(true)
        .connect(url)
        .await
        .map_err(|e| format!("连接 MySQL 失败: {}", e))?;

    let mut write = pools.write().await;
    // Double-check：可能其他线程已经创建了
    if let Some(existing) = write.get(pool_key) {
        pool.close().await;
        return Ok(existing.clone());
    }
    write.insert(pool_key.to_string(), pool.clone());
    Ok(pool)
}

/// 关闭指定连接池
pub async fn close_pool(pools: &MysqlPools, pool_key: &str) {
    let mut write = pools.write().await;
    if let Some(pool) = write.remove(pool_key) {
        pool.close().await;
    }
}

/// 关闭某个数据源的所有连接池（包括带数据库名的）
pub async fn close_pools_by_prefix(pools: &MysqlPools, data_source_id: i64) {
    let prefix = data_source_id.to_string();
    let mut write = pools.write().await;
    let keys_to_remove: Vec<String> = write
        .keys()
        .filter(|k| *k == &prefix || k.starts_with(&format!("{}:", prefix)))
        .cloned()
        .collect();
    for key in keys_to_remove {
        if let Some(pool) = write.remove(&key) {
            pool.close().await;
        }
    }
}

/// 测试 MySQL 连接
pub async fn test_connection(url: &str) -> Result<(), String> {
    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect(url)
        .await
        .map_err(|e| format!("连接失败: {}", e))?;

    sqlx::query("SELECT 1")
        .execute(&pool)
        .await
        .map_err(|e| format!("执行测试查询失败: {}", e))?;

    pool.close().await;
    Ok(())
}
