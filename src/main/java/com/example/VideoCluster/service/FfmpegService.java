package com.example.VideoCluster.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FfmpegService {

    private static final Logger logger = LoggerFactory.getLogger(FfmpegService.class);

    public void transcodeVideo(Path inputPath, Path outputPath, String resolution)
            throws IOException, InterruptedException {

        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-y",
                "-loglevel", "error", // ONLY show errors
                "-i", inputPath.toString(),
                "-vf", "scale=" + resolution,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                outputPath.toString()
        );

        pb.redirectErrorStream(true);
        pb.redirectInput(ProcessBuilder.Redirect.from(new java.io.File("NUL")));

        logger.info("Starting FFmpeg: {}", resolution);

        Process process = pb.start();

        // Collect error output into buffer (only logged if FFmpeg fails)
        StringBuilder errorOutput = new StringBuilder();
        Thread outputReader = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    errorOutput.append(line).append("\n");
                }
            } catch (IOException e) {
                logger.debug("Error reading FFmpeg output", e);
            }
        });
        outputReader.setDaemon(true);
        outputReader.start();

        boolean finished = process.waitFor(10, TimeUnit.MINUTES);

        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("FFmpeg timed out");
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            logger.error("FFmpeg failed (exit {}):\n{}", exitCode, errorOutput.toString());
            throw new RuntimeException("FFmpeg failed with exit code: " + exitCode);
        }

        logger.info("FFmpeg completed: {}", resolution);
    }
}
