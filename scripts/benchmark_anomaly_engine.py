#!/usr/bin/env python3
"""
Performance benchmark script for Dhruv Drishti dual-layer anomaly detection engine.
Simulates high-frequency IoT sensor frames and measures throughput and inference latency.
"""
import time
import random
import math

def calculate_zscore(value, mean, std):
    if std == 0:
        return 0.0
    return abs(value - mean) / std

def run_benchmark(num_records=10000):
    print(f"[*] Starting Dhruv Drishti Anomaly Engine Benchmark ({num_records:,} frames)...")
    
    # Baseline normal distributions for Bharati station
    baseline_temp_mean = -28.5
    baseline_temp_std = 6.2
    baseline_wind_mean = 35.0
    baseline_wind_std = 12.4
    
    anomalies_detected = 0
    start_time = time.perf_counter()
    
    for _ in range(num_records):
        # Generate simulated frame
        temp = random.gauss(baseline_temp_mean, baseline_temp_std)
        wind = max(0.0, random.gauss(baseline_wind_mean, baseline_wind_std))
        pressure = random.gauss(985.0, 15.0)
        
        # Inject occasional anomaly
        if random.random() < 0.02:
            wind += random.uniform(50.0, 90.0) # Blizzard surge
            temp -= random.uniform(15.0, 25.0) # Extreme freeze
            
        # Fast Z-Score anomaly inference
        temp_z = calculate_zscore(temp, baseline_temp_mean, baseline_temp_std)
        wind_z = calculate_zscore(wind, baseline_wind_mean, baseline_wind_std)
        
        if temp_z > 3.0 or wind_z > 3.0:
            anomalies_detected += 1
            
    elapsed = time.perf_counter() - start_time
    throughput = num_records / elapsed
    avg_latency_us = (elapsed / num_records) * 1_000_000
    
    print(f"[✓] Benchmark completed in {elapsed:.4f} seconds.")
    print(f"    - Throughput: {throughput:,.1f} frames/sec")
    print(f"    - Avg Latency: {avg_latency_us:.2f} µs/frame")
    print(f"    - Anomalies Flagged: {anomalies_detected} ({(anomalies_detected/num_records)*100:.2f}%)")
    return True

if __name__ == "__main__":
    run_benchmark()
