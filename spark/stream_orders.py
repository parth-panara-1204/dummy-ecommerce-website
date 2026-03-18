"""
spark-submit \
  --packages org.apache.spark:spark-sql-kafka-0-10_2.13:4.1.0,\
org.apache.hadoop:hadoop-aws:3.4.1,\
com.amazonaws:aws-java-sdk-bundle:1.12.262 \
  spark/stream_orders.py
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json
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
    StructField("timestamp", StringType())
])

orders_json = orders.select(
    from_json(col("value"), schema).alias("data")
).select("data.*")

query = orders_json.writeStream \
    .format("parquet") \
    .option("path", "s3a://datalake/orders/") \
    .option("checkpointLocation", "s3a://datalake/checkpoints/orders") \
    .outputMode("append") \
    .start()

# # Print events to console (testing)
# query = orders.writeStream \
#     .format("console") \
#     .outputMode("append") \
#     .start()

query.awaitTermination()