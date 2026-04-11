use crate::db::pool;
use crate::state::AppState;
use sqlx::{MySqlPool, Row};

/// 从本地数据库读取连接信息并构建 URL
async fn build_connect_url(state: &AppState, data_source_id: i64) -> Result<String, String> {
    let row = sqlx::query("SELECT * FROM data_source WHERE id = ?")
        .bind(data_source_id)
        .fetch_optional(&state.local_db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("数据源 {} 不存在", data_source_id))?;

    let url: String = row.try_get("url").unwrap_or_default();
    let host: String = row.try_get("host").unwrap_or("localhost".into());
    let port: i64 = row.try_get("port").unwrap_or(3306);
    let user: String = row.try_get("user").unwrap_or("root".into());
    let password: String = row.try_get("password").unwrap_or_default();

    if !url.is_empty() && url.starts_with("mysql://") {
        Ok(url)
    } else {
        Ok(pool::build_mysql_url(&host, port, &user, &password, None))
    }
}

/// 获取指定数据源的 MySQL 连接池（不带数据库）
pub async fn get_mysql_pool(state: &AppState, data_source_id: i64) -> Result<MySqlPool, String> {
    get_mysql_pool_with_db(state, data_source_id, None).await
}

/// 获取指定数据源的 MySQL 连接池（可指定数据库，确保连接池已设置目标数据库）
pub async fn get_mysql_pool_with_db(
    state: &AppState,
    data_source_id: i64,
    database_name: Option<&str>,
) -> Result<MySqlPool, String> {
    let pool_key = match database_name {
        Some(db) if !db.is_empty() => format!("{}:{}", data_source_id, db),
        _ => data_source_id.to_string(),
    };

    // 先看连接池里有没有
    {
        let pools = state.mysql_pools.read().await;
        if let Some(p) = pools.get(&pool_key) {
            if !p.is_closed() {
                return Ok(p.clone());
            }
        }
    }

    // 池不存在或已关闭，先清理再重建
    pool::close_pool(&state.mysql_pools, &pool_key).await;

    let base_url = build_connect_url(state, data_source_id).await?;
    let connect_url = match database_name {
        Some(db) if !db.is_empty() => {
            // 替换 URL 中的数据库部分（处理 base_url 可能已包含数据库路径的情况）
            if let Some(at_pos) = base_url.rfind('@') {
                // 找到 host:port 后的第一个 /
                if let Some(slash_pos) = base_url[at_pos..].find('/') {
                    // 截取到 host:port 部分，替换数据库
                    let base = &base_url[..at_pos + slash_pos];
                    format!("{}/{}", base, urlencoding::encode(db))
                } else {
                    format!("{}/{}", base_url, urlencoding::encode(db))
                }
            } else {
                format!("{}/{}", base_url.trim_end_matches('/'), urlencoding::encode(db))
            }
        }
        _ => base_url.clone(),
    };

    pool::get_or_create_pool(&state.mysql_pools, &pool_key, &connect_url).await
}
