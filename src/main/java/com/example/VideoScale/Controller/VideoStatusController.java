package com.example.VideoScale.Controller;


import com.example.VideoScale.entity.VideoJob;
import com.example.VideoScale.repository.VideoJobRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/videos")
public class VideoStatusController {

    private final VideoJobRepository jobRepository;

    public VideoStatusController(VideoJobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String jobId) {
        VideoJob job = jobRepository.findByJobId(jobId).orElse(null);

        if (job == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("jobId", job.getJobId());
        response.put("status", job.getStatus());
        response.put("createdAt", job.getCreatedAt());
        response.put("updatedAt", job.getUpdatedAt());

        if (job.getErrorMessage() != null) {
            response.put("errorMessage", job.getErrorMessage());
        }

        return ResponseEntity.ok(response);
    }
}