package com.example.VideoCluster.service;

import com.example.VideoCluster.constants.JobStatus;
import com.example.VideoCluster.dto.VideoJobMessage;
import com.example.VideoCluster.entity.VideoJob;
import com.example.VideoCluster.repository.VideoJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class VideoConsumerService {

    private static final Logger logger = LoggerFactory.getLogger(VideoConsumerService.class);

    @Autowired
    private VideoStorageService storageService;

    @Autowired
    private FfmpegService ffmpegService;

    @Autowired
    private VideoJobRepository jobRepository;

    @KafkaListener(
            topics = "${spring.kafka.topic.video-processing}",
            groupId = "${spring.kafka.consumer.group-id}",
            ackMode = "MANUAL"
    )
    @Transactional
    public void consume(VideoJobMessage message, Acknowledgment acknowledgment) {
        String jobId = message.getJobId();

        try {
            logger.info("Starting job: {}", jobId);

            // 1. Update status to PROCESSING
            updateJobStatus(jobId, JobStatus.PROCESSING, null);

            // 2. Download from MinIO
            String objectName = message.getObjectName();
            Path tempDir = Paths.get("/tmp/videoscale/" + jobId);
            Files.createDirectories(tempDir);
            Path inputPath = tempDir.resolve(objectName);

            logger.info("Downloading: {}", objectName);
            storageService.downloadVideo(objectName, inputPath);

            // 3. Transcode
            Path output720p = tempDir.resolve("output_720p.mp4");
            Path output360p = tempDir.resolve("output_360p.mp4");

            logger.info("Transcoding to 720p");
            ffmpegService.transcodeVideo(inputPath, output720p, "1280:720");

            logger.info("Transcoding to 360p");
            ffmpegService.transcodeVideo(inputPath, output360p, "640:360");

            // 4. Upload to MinIO
            String upload720p = "processed/" + jobId + "/720p.mp4";
            String upload360p = "processed/" + jobId + "/360p.mp4";

            storageService.uploadFile(output720p, upload720p);
            storageService.uploadFile(output360p, upload360p);

            // 5. Update status to COMPLETED
            updateJobStatus(jobId, JobStatus.COMPLETED, null);

            // 6. Cleanup
            Files.deleteIfExists(inputPath);
            Files.deleteIfExists(output720p);
            Files.deleteIfExists(output360p);
            Files.deleteIfExists(tempDir);

            // 7. Acknowledge Kafka
            acknowledgment.acknowledge();
            logger.info("Job completed: {}", jobId);

        } catch (Exception e) {
            logger.error("Job failed: {}", jobId, e);

            // Update status to FAILED with error message
            updateJobStatus(jobId, JobStatus.FAILED, e.getMessage());

            // Don't acknowledge → Kafka will retry
            // We should add retry limits later
        }
    }

    private void updateJobStatus(String jobId, String status, String errorMessage) {
        VideoJob job = jobRepository.findByJobId(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        job.setStatus(status);
        job.setUpdatedAt(java.time.LocalDateTime.now());

        if (errorMessage != null) {
            job.setErrorMessage(errorMessage);
        }

        jobRepository.save(job);
    }
}