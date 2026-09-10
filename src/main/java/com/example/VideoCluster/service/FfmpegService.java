package com.example.VideoCluster.service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class FfmpegService {

    private static final Logger logger = LoggerFactory.getLogger(FfmpegService.class);

    public void transcodeVideo(Path inputPath, Path outputPath, String resolution)
            throws IOException, InterruptedException {

        // FFmpeg command
        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-i", inputPath.toString(),
                "-vf", "scale=" + resolution,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                outputPath.toString()
        );

        pb.redirectErrorStream(true);

        logger.info("Starting FFmpeg: {}", String.join(" ", pb.command()));

        Process process = pb.start();

        // Wait for FFmpeg to finish
        boolean finished = process.waitFor(10, TimeUnit.MINUTES);

        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("FFmpeg timed out");
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            throw new RuntimeException("FFmpeg failed with exit code: " + exitCode);
        }

        logger.info("FFmpeg completed successfully: {}", outputPath);
    }
}