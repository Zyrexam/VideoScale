package com.example.VideoCluster.dto;

public class VideoJobMessage {
    private String jobId;
    private String objectName;
    private String userId;
    private String status;

    public VideoJobMessage() {}

    public VideoJobMessage(String jobId, String objectName, String userId) {
        this.jobId = jobId;
        this.objectName = objectName;
        this.userId = userId;
        this.status = "PENDING";
    }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getObjectName() { return objectName; }
    public void setObjectName(String objectName) { this.objectName = objectName; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}