package com.example.VideoScale.service;

import com.example.VideoScale.dto.VideoJobMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaProducerService {

    private final KafkaTemplate<String, VideoJobMessage> kafkaTemplate;
    private final String topic;

    public KafkaProducerService(KafkaTemplate<String, VideoJobMessage> kafkaTemplate,
                                @Value("${spring.kafka.topic.video-processing}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void sendJob(VideoJobMessage jobMessage) {
        kafkaTemplate.send(topic, jobMessage.getJobId(), jobMessage);
    }
}