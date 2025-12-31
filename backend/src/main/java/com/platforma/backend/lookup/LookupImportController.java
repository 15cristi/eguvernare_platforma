package com.platforma.backend.lookup;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/lookups/import")
@RequiredArgsConstructor
public class LookupImportController {

    private final LookupService lookupService;

    @PostMapping("/csv")
    public void importCsv(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String header = reader.readLine();
            if (header == null || !header.trim().equalsIgnoreCase("category,value")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV header must be: category,value");
            }

            reader.lines()
                    .map(String::trim)
                    .filter(line -> !line.isBlank())
                    .forEach(line -> {
                        String[] parts = line.split(",", 2);
                        if (parts.length != 2) return;

                        String catRaw = parts[0].trim();
                        String value = parts[1].trim();
                        if (catRaw.isEmpty() || value.isEmpty()) return;

                        LookupCategory category = LookupCategory.valueOf(catRaw);
                        lookupService.upsert(category, value);
                    });

        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category in CSV");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "CSV import failed");
        }
    }
}
