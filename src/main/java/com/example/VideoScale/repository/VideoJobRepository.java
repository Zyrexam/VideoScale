package com.example.VideoScale.repository;

import com.example.VideoScale.entity.VideoJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VideoJobRepository extends JpaRepository<VideoJob, String> {

    Optional<VideoJob> findByJobId(String jobId);

    long countByStatus(String status);
}