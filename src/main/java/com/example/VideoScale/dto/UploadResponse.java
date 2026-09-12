package com.example.VideoScale.dto;

public class UploadResponse {

    private String jobId;
    private String message;
    private String status;

    public UploadResponse(String jobId, String message, String status) {
        this.jobId = jobId;
        this.message = message;
        this.status = status;
    }

    public String getJobId() {
        return jobId;
    }

    public String getMessage() {
        return message;
    }

    public String getStatus() {
        return status;
    }
}
