package com.example.VideoCluster.service;

import com.example.VideoCluster.dto.VideoJobMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaProducerService {

    @Autowired
    private KafkaTemplate<String, VideoJobMessage> kafkaTemplate;

    @Value("${spring.kafka.topic.video-processing}")
    private String topic;

    public void sendJob(VideoJobMessage jobMessage) {
        kafkaTemplate.send(topic, jobMessage.getJobId(), jobMessage);
    }
}