package com.ebooking.backend.service;

import com.ebooking.backend.dto.admin.*;

import java.time.LocalDate;
import java.util.List;

public interface AdminStatsService {
    StatsSummaryResponse summary(LocalDate from, LocalDate to);
    List<SeriesPointResponse> series(String metric, LocalDate from, LocalDate to, String period);
}
