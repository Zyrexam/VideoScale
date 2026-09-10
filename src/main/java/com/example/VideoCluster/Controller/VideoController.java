package com.example.VideoCluster.Controller;

import java.util.UUID;

import com.example.VideoCluster.constants.JobStatus;
import com.example.VideoCluster.dto.VideoJobMessage;
import com.example.VideoCluster.entity.VideoJob;
import com.example.VideoCluster.repository.VideoJobRepository;
import com.example.VideoCluster.service.KafkaProducerService;
import com.example.VideoCluster.service.VideoStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.VideoCluster.dto.UploadResponse;

@RestController
@RequestMapping("/api/videos")
public class VideoController {
    @Autowired
    private VideoStorageService storageService;

    @Autowired
    private KafkaProducerService kafkaservice;

    @Autowired
    private VideoJobRepository videoJobRepository;

    @PostMapping("/upload")
    public ResponseEntity<UploadResponse> uploadVideo(@RequestParam("video") MultipartFile file) throws Exception {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse(null, "File is empty", "FAILED"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("video/")) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse(null, "Only video files are allowed", "FAILED"));
        }

        try{
            String objectName =  storageService.storeVideo(file);

            String jobId = UUID.randomUUID().toString();

            VideoJob job = new VideoJob(jobId, objectName, "user-123", JobStatus.PENDING);
            videoJobRepository.save(job);

            VideoJobMessage message = new VideoJobMessage(jobId, objectName, "user-123");
            kafkaservice.sendJob(message);

            return ResponseEntity.ok(new UploadResponse(
                    jobId,
                    "Video Uploaded. Processing Job Queued",
                    "PENDING"
            ));
        } catch (Exception e){
            return ResponseEntity.internalServerError().body(new UploadResponse(null, "Failed: " + e.getMessage(), "FAILED"));
        }
    }
}



