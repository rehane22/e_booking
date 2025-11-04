package com.ebooking.backend.dto.admin;

public record StatsSummaryResponse(
        String from, String to,
        long totalUsers,
        long activeUsers,
        long blockedUsers,
        long totalRdv,
        long todayRdv,
        double occupancyRate,      // 0..100
        Double avgLeadTimeDays     // nullable si non calculable
) {}
