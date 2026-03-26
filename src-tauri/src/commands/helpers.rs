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

/// 获取指定数据源的 MySQL 连接池
pub async fn get_mysql_pool(state: &AppState, data_source_id: i64) -> Result<MySqlPool, String> {
    // 先看连接池里有没有
    {
        let pools = state.mysql_pools.read().await;
        if let Some(p) = pools.get(&data_source_id) {
            // 检查池是否已关闭
            if !p.is_closed() {
                return Ok(p.clone());
            }
        }
    }

    // 池不存在或已关闭，先清理再重建
    pool::close_pool(&state.mysql_pools, data_source_id).await;

    let connect_url = build_connect_url(state, data_source_id).await?;
    let p = pool::get_or_create_pool(&state.mysql_pools, data_source_id, &connect_url).await?;

    // 验证连接可用，如果不可用则清理并重试一次
    match sqlx::query("SELECT 1").execute(&p).await {
        Ok(_) => Ok(p),
        Err(_) => {
            pool::close_pool(&state.mysql_pools, data_source_id).await;
            let connect_url = build_connect_url(state, data_source_id).await?;
            pool::get_or_create_pool(&state.mysql_pools, data_source_id, &connect_url).await
        }
    }
}
