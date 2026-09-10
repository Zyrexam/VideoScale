A distributed video processing pipeline designed to process and transcode videos asynchronously at scale.

## Architecture

```text
User
  │
  ▼
Upload API (Spring Boot)
  │
  ▼
MinIO / S3
  │
  ▼
Kafka
  │
  ├──► Video Worker 1 ──► FFmpeg
  ├──► Video Worker 2 ──► FFmpeg
  └──► Video Worker N ──► FFmpeg
                 │
                 ▼
            MinIO / S3
                 │
                 ▼
          Processing Complete
```

## Tech Stack

* **Java + Spring Boot** — APIs and services
* **Kafka** — asynchronous job queue
* **FFmpeg** — video processing/transcoding
* **PostgreSQL** — video and job metadata
* **Redis** — caching / job state
* **MinIO / S3** — video storage
* **Docker** — containerization
* **Kubernetes** — deployment and orchestration
* **KEDA** — event-driven autoscaling
* **Prometheus + Grafana** — monitoring

## Workflow

1. User uploads a video.
2. API stores the original video in object storage.
3. A processing job is published to Kafka.
4. A worker consumes the job.
5. FFmpeg processes the video into different resolutions.
6. Processed videos are uploaded back to object storage.
7. Job status is updated in PostgreSQL.
8. Workers automatically scale based on Kafka queue/lag.

## Autoscaling

When the Kafka queue grows:

```text
Low traffic
Kafka: ███
Workers: 2

        ↓

High traffic
Kafka: ███████████████████
Workers: 10+
```

KEDA monitors the queue and increases or decreases the number of video-processing workers automatically.

## Main Goals

* Asynchronous video processing
* Horizontal worker scaling
* Reliable job processing
* Retry and failure handling
* Idempotent processing
* Backpressure handling
* Monitoring and observability
* Load testing under high traffic

## Future Improvements

* Multiple transcoding profiles
* Priority processing
* Dead-letter queue
* Job cancellation
* Resumable uploads
* Distributed rate limiting
* GPU-based transcoding
