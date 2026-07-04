-- Spain Summer Health & Climate Intelligence Platform
-- BigQuery schema. Create tables one at a time (multi-statement CREATE
-- blocks fail due to dataset location enforcement).

-- === raw_data dataset ===

CREATE TABLE IF NOT EXISTS
  `tfm-dataflow.raw_data.weather_daily` (
    fetch_date STRING, temp_max FLOAT64, temp_min FLOAT64,
    precipitation FLOAT64, windspeed_max FLOAT64,
    humidity_max FLOAT64, uv_index_max FLOAT64,
    weather_code INT64, heat_risk STRING, ingestion_ts STRING
  );

CREATE TABLE IF NOT EXISTS
  `tfm-dataflow.raw_data.marine_daily` (
    fetch_date STRING, sea_temp_max FLOAT64,
    wave_height_max FLOAT64, ingestion_ts STRING
  );

CREATE TABLE IF NOT EXISTS
  `tfm-dataflow.raw_data.air_quality_daily` (
    fetch_date STRING, pm25_avg FLOAT64, pm10_avg FLOAT64,
    no2_avg FLOAT64, o3_avg FLOAT64,
    pm25_exceeds_who BOOL, no2_exceeds_who BOOL,
    o3_exceeds_who BOOL, aqi_status STRING,
    ingestion_ts STRING
  );

-- === analytics dataset ===

CREATE TABLE IF NOT EXISTS
  `tfm-dataflow.analytics.health_score` (
    score_date STRING, total_score INT64, label STRING,
    temp_score INT64, aqi_score INT64, uv_score INT64,
    humidity_score INT64, temp_max FLOAT64, uv_index FLOAT64,
    humidity FLOAT64, aqi_breaches INT64, pm25_avg FLOAT64,
    no2_avg FLOAT64, sea_temp FLOAT64,
    temp_change_vs_yesterday FLOAT64, trend_vs_yesterday STRING,
    created_at STRING
  );

CREATE TABLE IF NOT EXISTS
  `tfm-dataflow.analytics.anomaly_log` (
    detected_at STRING, source STRING, column_name STRING,
    value FLOAT64, mean FLOAT64, z_score FLOAT64,
    severity STRING, description STRING
  );

CREATE TABLE IF NOT EXISTS
  `tfm-dataflow.analytics.predictions` (
    prediction_date STRING, for_date STRING,
    predicted_temp_max FLOAT64, temp_trend STRING,
    temp_confidence STRING, temp_r2 FLOAT64,
    predicted_uv_index FLOAT64, uv_trend STRING,
    predicted_pm25 FLOAT64, pm25_trend STRING,
    predicted_health_score INT64, predicted_label STRING,
    tomorrow_weekday STRING, method STRING, created_at STRING
  );

CREATE TABLE IF NOT EXISTS
  `tfm-dataflow.analytics.daily_briefing` (
    briefing_date STRING, briefing_text STRING,
    health_score INT64, score_label STRING,
    temp_max FLOAT64, uv_index FLOAT64, humidity FLOAT64,
    predicted_score INT64, predicted_label STRING,
    created_at STRING
  );
