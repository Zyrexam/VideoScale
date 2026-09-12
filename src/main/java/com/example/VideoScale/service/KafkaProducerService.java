package com.example.VideoScale.service;

import com.example.VideoScale.dto.VideoJobMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutionException;

@Service
public class KafkaProducerService {

    private final KafkaTemplate<String, VideoJobMessage> kafkaTemplate;
    private final String topic;

    public KafkaProducerService(KafkaTemplate<String, VideoJobMessage> kafkaTemplate,
                                @Value("${spring.kafka.topic.video-processing}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    // Blocks until the broker confirms (or fails fast via max.block.ms).
    // Fire-and-forget would report PENDING for jobs that were never queued.
    public void sendJob(VideoJobMessage jobMessage) {
        try {
            kafkaTemplate.send(topic, jobMessage.getJobId(), jobMessage).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Kafka publish interrupted", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Kafka publish failed", e);
        }
    }
}