"""
spark-submit \
  --packages org.apache.spark:spark-sql-kafka-0-10_2.13:4.1.0,\
org.apache.hadoop:hadoop-aws:3.4.1,\
com.amazonaws:aws-java-sdk-bundle:1.12.262 \
  spark/stream_orders.py
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, current_timestamp, when
from pyspark.sql.types import *

spark = SparkSession.builder \
    .appName("KafkaOrdersStream") \
    .config("spark.hadoop.fs.s3a.endpoint","http://localhost:9000") \
    .config("spark.hadoop.fs.s3a.access.key","minioadmin") \
    .config("spark.hadoop.fs.s3a.secret.key","minioadmin") \
    .config("spark.hadoop.fs.s3a.path.style.access","true") \
    .config("spark.hadoop.fs.s3a.connection.ssl.enabled","false") \
    .config("spark.hadoop.fs.s3a.impl","org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.hadoop.fs.s3a.connection.timeout","60000") \
    .config("spark.hadoop.fs.s3a.socket.timeout","60000") \
    .config("spark.hadoop.fs.s3a.connection.establish.timeout","60000") \
    .getOrCreate()

# Read Kafka stream
df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("startingOffsets", "earliest") \
    .option("failOnDataLoss", "false") \
    .option("subscribe", "clickStream") \
    .load()

# Convert binary → string
orders = df.selectExpr("CAST(value AS STRING)")


schema = StructType([
    StructField("userId", StringType()),
    StructField("productId", StringType()),
    StructField("eventType", StringType()),
    StructField("timestamp", StringType()),
    StructField("reviewId", StringType()),
    StructField("rating", DoubleType()),
    StructField("reviewText", StringType())
])

orders_json = orders.select(
    from_json(col("value"), schema).alias("data")
).select("data.*")

# Keep existing clickstream archival in MinIO parquet.
events_query = orders_json.writeStream \
    .format("parquet") \
    .option("path", "s3a://datalake/orders/") \
    .option("checkpointLocation", "s3a://datalake/checkpoints/orders") \
    .outputMode("append") \
    .start()

review_events = (
    orders_json
    .filter(col("eventType") == "review")
    .filter(col("reviewText").isNotNull())
)

scored_reviews = (
    review_events
    .withColumnRenamed("reviewText", "review_text")
    .withColumn(
        "sentiment",
        when(col("rating") > 3, "positive")
        .when(col("rating") < 3, "negative")
        .otherwise("neutral")
    )
    .withColumn("processed_at", current_timestamp())
    .select(
        col("reviewId").alias("review_id"),
        col("userId").alias("user_id"),
        col("productId").alias("product_id"),
        col("rating"),
        col("review_text"),
        col("timestamp"),
        col("sentiment"),
        col("processed_at")
    )
)

# Use JSON so backend can read and aggregate sentiment quickly for dashboard cards.
sentiment_query = scored_reviews.writeStream \
    .format("json") \
    .option("path", "s3a://datalake/review-sentiment/") \
    .option("checkpointLocation", "s3a://datalake/checkpoints/review-sentiment") \
    .outputMode("append") \
    .start()

# # Print events to console (testing)
# debug_query = orders.writeStream \
#     .format("console") \
#     .outputMode("append") \
#     .start()

spark.streams.awaitAnyTermination()