package com.example.VideoScale.repository;

import com.example.VideoScale.entity.VideoJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VideoJobRepository extends JpaRepository<VideoJob, String> {

    Optional<VideoJob> findByJobId(String jobId);

    long countByStatus(String status);
}