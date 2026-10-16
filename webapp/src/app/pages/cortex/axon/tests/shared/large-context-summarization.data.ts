/**
 * Synthetic benchmark dataset for testing large-context summarization performance
 * across the Prompt API (LanguageModel) and Summarizer API.
 *
 * Designed to evaluate:
 * 1. System prompt prefill overhead (~3,600 characters in initialPrompts)
 * 2. Long document prefill latency (~10,000 characters up to full context quota)
 * 3. Time-To-First-Token (TTFT / first_chunk_ms) vs steady-state streaming decode speed
 */

export const LARGE_SUMMARIZATION_SYSTEM_PROMPT = `You are a Principal Systems Architecture Analyst and Technical Editor responsible for producing high-precision executive syntheses of complex engineering reports, distributed systems postmortems, and longitudinal infrastructure studies.

Your objective is to read a long-form technical document and produce a structured, factually grounded summary that captures the core architectural thesis, quantitative performance metrics, operational trade-offs, and concrete remediation or deployment recommendations without introducing unsupported claims.

### 1. Analytical Principles & Epistemic Rigor
- Ground every statement strictly in the provided source text. Do not extrapolate beyond the telemetry, experimental measurements, or architectural specifications explicitly stated in the document.
- Preserve exact numerical figures, latency percentiles (e.g., p50, p95, p99), throughput metrics, capacity figures, error rates, and hardware or protocol identifiers whenever they are central to a finding.
- Distinguish clearly between empirically validated results from production deployments, controlled laboratory simulations, and projected future targets.
- When the source document describes competing engineering designs or trade-offs (for example, consistency versus tail latency, edge autonomy versus centralized coordination, or memory footprint versus quantization accuracy), explicitly state both sides of the trade-off and the rationale for the selected approach.
- Maintain a neutral, analytical, and concise engineering tone throughout the summary. Avoid marketing language, rhetorical filler, or vague generalizations.

### 2. Required Output Structure
Organize your summary into the following four clearly labeled sections using Markdown headings:

#### Executive Overview
Provide a concise three-to-four sentence synthesis stating the primary domain of the report, the core engineering problem addressed, the methodology or architecture evaluated, and the headline conclusion.

#### Key Architectural & Empirical Findings
Present four to six bullet points detailing the most consequential technical findings. Each bullet point must pair a specific mechanism, subsystem, or architectural decision with its measured quantitative impact or operational outcome from the text.

#### Bottlenecks, Failure Modes & Trade-Offs
Summarize the primary operational constraints, resource bottlenecks, tail-latency regressions, or failure modes identified during testing. Explain what triggers each bottleneck and how system behavior degrades under peak load or adverse network partitions.

#### Actionable Engineering Recommendations
List three to four concrete next steps, configuration changes, or architectural mitigations proposed in the document, ordered by operational priority and expected reliability impact.

### 3. Formatting, Length & Style Constraints
- Keep the total summary between 220 and 350 words so that an engineering lead can review it in under ninety seconds.
- Use clear, direct technical prose. Prefer active voice and precise domain terminology (e.g., state-estimation convergence, token prefill throughput, consensus quorum, thermal headroom, backpressure shedding).
- Do not include a preamble, conversational opening, meta-commentary about your instructions, or a concluding sign-off outside the four required sections.
- Verify before finishing that all quantitative metrics cited in your bullet points match the source document's units and context.`;

export const LARGE_TECHNICAL_DOCUMENT_10K = `Distributed Edge Coordination and Autonomous Grid Balancing in Multi-Region Renewable Microgrids: A Longitudinal Systems Analysis

1. Executive Context and Architectural Motivation
Modern regional electrical grids are undergoing a structural transition from centralized, synchronous thermal generation toward highly distributed, inverter-based renewable energy resources. While utility-scale solar photovoltaics, wind turbines, and behind-the-meter battery energy storage systems (BESS) substantially reduce carbon intensity, they also eliminate the mechanical rotational inertia that historically stabilized grid frequency during sudden load or generation transients. In conventional power systems, synchronous generators provide immediate kinetic energy buffering over the first 500 to 2,000 milliseconds of a contingency event, allowing primary and secondary frequency control loops sufficient time to respond. In contrast, power-electronic inverters respond within milliseconds based on local firmware control loops, which can interactadversely across weak transmission corridors if coordination latencies exceed 50 milliseconds.

This study evaluates the operational performance of Project Helios, a three-year longitudinal deployment of an autonomous, hierarchical edge-computing architecture across 148 interconnected community microgrids spanning three distinct climatic and topological regions: the Pacific Northwest coastal corridor, the Southwest high-desert solar basin, and the Upper Midwest wind plains. Across all 148 sites, the deployment aggregates 1.42 gigawatts (GW) of peak solar and wind capacity paired with 3.10 gigawatt-hours (GWh) of lithium-iron-phosphate (LFP) and vanadium redox flow battery storage. Prior to Project Helios, telemetry from all field inverters and phasor measurement units (PMUs) was backhauled over regional cellular and fiber links to a centralized cloud control plane for state estimation and dispatch optimization. Under normal operating conditions, round-trip cloud control latency averaged 185 milliseconds at the median (p50) and 640 milliseconds at the 99th percentile (p99). During severe weather events or fiber backhaul congestion, p99 control loop latencies frequently exceeded 2,800 milliseconds, forcing local inverters to trip offline into conservative islanded protection modes and causing cascading feeder disconnects.

2. Hierarchical Edge Compute Topology and Telemetry Pipeline
To eliminate reliance on wide-area backhaul during sub-second grid transients, Project Helios introduced a three-tier execution hierarchy:
- Tier 1 (Field Inverter Controllers): Deterministic microcontroller units sampling three-phase voltage and current waveforms at 10 kilohertz (kHz) and executing virtual synchronous machine (VSM) droop control every 2 milliseconds.
- Tier 2 (Substation Edge Nodes): Ruggedized, passively cooled industrial compute nodes installed at each of the 148 distribution substations. Each node is equipped with an 8-core low-power ARM64 processor, 32 gigabytes (GB) of ECC LPDDR5 memory, and an integrated neural processing accelerator rated at 38 TOPS (INT8). Tier 2 nodes ingest high-rate synchrophasor streams (120 frames per second) from up to 64 local inverters over deterministic IEEE 802.1Qbv Time-Sensitive Networking (TSN) Ethernet rings.
- Tier 3 (Regional Coordination Clusters): Three fault-tolerant regional clusters that aggregate compressed state summaries every 5 seconds to compute multi-hour economic dispatch schedules, weather-driven irradiance forecasts, and cross-substation power transfer targets.

Each Tier 2 substation node executes a compact, quantized state-estimation and anomaly-classification model alongside a real-time quadratic programming (QP) solver. Rather than transmitting raw 10 kHz waveform captures to the cloud, Tier 2 nodes compute sliding-window spectral harmonic signatures and local Jacobian state estimates every 20 milliseconds. This architectural shift reduced wide-area network egress bandwidth consumption from 44.6 megabits per second (Mbps) per substation to 1.18 Mbps—a 97.3% reduction in continuous telemetry backhaul volume—while retaining full-resolution forensic ring buffers on local NVMe storage for 14 days.

3. Empirical Latency, Prefill, and Inference Performance on Substation Hardware
A critical engineering challenge during Phase II of the deployment involved the execution of local forecasting and diagnostic models on the resource-constrained Tier 2 substation nodes. While the 20-millisecond deterministic control loop relies on classical state-space estimation, each substation node also runs an on-device sequence model every 60 seconds to synthesize textual and structured incident diagnostics from multi-sensor alarm logs, transformer dissolved-gas analysis (DGA) readings, and protection relay event sequences.

During initial field trials, engineers observed a pronounced asymmetry between model initialization, prompt prefill latency, and steady-state token generation on substation edge hardware:
- Cold Model Initialization: Loading the 4-bit quantized 3.2-billion-parameter diagnostic model from encrypted industrial flash into unified memory required 11.4 seconds at p50 and 13.8 seconds at p95 when the model weights had been evicted by the operating system's page cache after periods of inactivity exceeding 10 minutes.
- Context Prefill Bottleneck: When a feeder disturbance triggered a burst of 400 to 600 protection relay events, the serialized diagnostic context reached approximately 2,800 to 3,400 tokens (roughly 10,500 to 13,000 characters of structured log text plus a 900-token system instruction rubric). Processing this input context during the prefill phase dominated end-to-end latency. On nodes utilizing GPU/NPU acceleration via shared unified memory, prefill throughput averaged 142 tokens per second, resulting in a Time-To-First-Token (TTFT) of 21.8 seconds for a 3,100-token prompt. However, on legacy x86 substation gateways lacking dedicated matrix-multiplication acceleration or falling back to CPU execution due to driver incompatibility, prefill throughput dropped to 54 tokens per second, pushing TTFT to 57.4 seconds—nearly 2.6 times slower than the accelerated ARM64 nodes.
- Steady-State Decode Phase: Once the attention key-value (KV) cache was populated by the prefill pass, autoregressive output generation proceeded steadily across both hardware classes. Output decode throughput averaged 28.4 tokens per second on accelerated nodes (inter-token gap under 45 milliseconds, with maximum observed jitter of 310 milliseconds during concurrent TSN packet interrupts) and 11.2 tokens per second on CPU-fallback gateways. Because diagnostic summaries averaged only 140 output tokens, the decode phase accounted for less than 18% of total wall-clock execution time, whereas input prefill accounted for 82% of warm-session latency.

4. Mitigating Prefill Stalls and Memory Pressure
To resolve the 22-to-58-second diagnostic lag during active grid disturbances, the systems team implemented four targeted optimizations in firmware release v4.3:
First, the invariant 900-token system instruction rubric and substation topological schema were pre-evaluated into a pinned parent session at daemon startup. When an incident occurred, the worker process cloned the pre-warmed session state rather than re-tokenizing and re-prefilling the system instructions, immediately eliminating 6.3 seconds of redundant prefill computation per invocation.
Second, raw relay event logs were passed through a deterministic deduplication and run-length encoding filter prior to prompt construction. Oscillatory contact-bounce events that previously generated 350 repetitive log lines during a single recloser operation were collapsed into a single canonical event summary with occurrence counts and timestamp bounds, shrinking median document input size from 11,200 characters to 3,400 characters without loss of diagnostic fidelity.
Third, process memory locking (mlock) and a lightweight heartbeat keep-alive query every 180 seconds were introduced on substations with 32 GB of RAM, preventing the kernel from evicting model pages during quiet intervals and reducing cold-create occurrences by 99.1%.
Fourth, CPU-fallback gateways were upgraded with explicit Vulkan compute backend bindings and 16-bit KV-cache block quantization, improving their prefill throughput from 54 tokens per second to 118 tokens per second.

5. Grid Stability Outcomes and Longitudinal Reliability Metrics
Across 26,400 substation-months of cumulative operation following the v4.3 rollout, the autonomous Tier 2 architecture demonstrated substantial improvements in both electrical stability and operational resilience:
- Frequency Nadir Improvement: During N-1 transmission line trip tests, coordinated virtual inertia response across neighboring substations arrested frequency excursions at 59.84 Hz compared to 59.42 Hz under the legacy cloud-dispatched baseline, reducing rate-of-change-of-frequency (RoCoF) violations by 84%.
- Islanding Transition Continuity: Unplanned microgrid islanding transitions during wildfire-related transmission shutoffs achieved a 99.4% seamless transfer rate with voltage phase-angle deviations kept below 4.2 electrical degrees.
- Renewable Curtailment Reduction: Dynamic local reactive power compensation and sub-minute storage dispatch reduced solar and wind curtailment across constrained rural feeders by 31.8%, recovering an estimated 142,000 megawatt-hours (MWh) of clean energy annually.
- Diagnostic Turnaround Time: End-to-end automated incident summary latency dropped from 38.6 seconds (p75) to 7.4 seconds on ARM64 nodes and from 64.2 seconds to 14.9 seconds on upgraded x86 gateways, enabling control room operators to verify fault locations before automated recloser lockout timers expired.`;

export const LARGE_TECHNICAL_DOCUMENT_EXTENSION_SECTIONS = `

6. Thermal Storage Coupling and Seasonal Load Shifting Analysis
Beyond electrochemical battery storage, 42 of the 148 microgrid sites located in the Upper Midwest and Pacific Northwest regions integrate district-scale thermal energy storage (TES) units coupled with industrial heat pumps and chilled-water loops. Electrochemical LFP batteries exhibit round-trip AC-to-AC efficiencies of 86.5% to 89.2% over 4-hour discharge cycles, but their capital cost per kilowatt-hour of capacity makes them uneconomical for multi-day weather resilience during winter atmospheric rivers or prolonged polar vortex events. By contrast, insulated pressurized hot-water reservoirs and phase-change material (PCM) thermal banks achieve an effective storage cost less than one-sixth that of LFP cells when serving building heating and industrial process steam loads.

In Project Helios, the Tier 2 substation solver treats thermal storage tanks as virtual deferrable electrical loads with asymmetric ramp-rate constraints and ambient heat-loss decay coefficients. During midday wind or solar oversupply, the local QP optimizer pre-charges PCM thermal banks to 118 degrees Celsius while holding LFP state-of-charge (SoC) at 75% to preserve bidirectional headroom for fast frequency regulation. Telemetry collected across two winter heating seasons demonstrated that co-optimizing electrical and thermal storage reduced peak evening feeder transformer loading by 24.6% and extended autonomous microgrid islanding endurance during sub-zero grid outages from 11.5 hours to 46.2 hours.

7. Byzantine Fault Tolerance and Cross-Substation Consensus Under Partition
When a regional fiber cut isolates a cluster of four to twelve neighboring distribution substations from the Tier 3 regional cloud, those substations must negotiate real-time real and reactive power exchanges across their interconnecting 34.5 kV tie-lines without a central coordinator. Standard Paxos or Raft consensus algorithms assume benign crash-stop failures, which is insufficient in field environments where a miscalibrated voltage transformer or a compromised remote terminal unit (RTU) could broadcast physically implausible state estimates.

To guard against corrupted sensor telemetry, Tier 2 nodes execute a Physics-Informed Byzantine Fault Tolerant (PI-BFT) state agreement protocol over the surviving sub-6 GHz licensed wireless mesh network. Before voting on a proposed tie-line power transfer schedule, each peer validates incoming state vectors against Kirchhoff's current and voltage laws and localized AC power-flow admittance matrices. Any state proposal that violates nodal power balance beyond a 3-sigma instrumentation tolerance is automatically quarantined and excluded from the consensus quorum. In 1,200 injected fault-simulation campaigns—including simulated GPS spoofing of PMU time-synchronization clocks by up to 45 microseconds and false-data injection attacks on feeder current sensors—the PI-BFT layer identified and isolated the faulty node within 3 consensus rounds (60 milliseconds total) with zero false-positive disconnections of healthy feeders.

8. Hardware Lifecycle, Thermal Throttling, and Field Maintenance Telemetry
Operating neural accelerators and continuous state-estimation workloads inside sealed, unventilated NEMA 4X substation cabinets exposed significant thermal engineering constraints during summer heatwaves in the Southwest desert basin. When external ambient temperatures reached 49 degrees Celsius, internal cabinet air temperatures climbed to 74 degrees Celsius. During sustained 3,000-token diagnostic prefill passes that drove the NPU and memory controller to 32 watts of combined package power for more than 25 seconds, junction temperatures on early revision-A heat-sink assemblies crossed the 95-degree-Celsius thermal throttling threshold. Once thermal throttling engaged, memory bus clock frequencies stepped down by 40%, causing prefill latency to degrade non-linearly from 22 seconds to over 51 seconds on consecutive diagnostic runs.

To prevent thermal runaway and latency variance on long-context workloads, revision-B hardware introduced vapor-chamber heat pipes bonded directly to the cabinet's shaded north-facing aluminum exterior wall, alongside an adaptive token-chunking scheduler in the inference runtime. Instead of executing a monolithic 3,200-token prefill pass at maximum clock boost, the runtime processes context in 512-token micro-batches interleaved with 15-millisecond thermal relaxation pauses whenever die temperature exceeds 82 degrees Celsius. Field measurements confirmed that micro-batched prefill kept peak junction temperatures 11.4 degrees Celsius lower while adding less than 1.2 seconds to total TTFT, completely eliminating thermal throttling across the desert fleet during peak July irradiance.

9. Summary of Recommendations for Utility and Edge AI Architects
1. Separate invariant system instructions from dynamic per-request document payloads using session cloning or prefix caching; re-prefilling multi-thousand-character system prompts on every transaction wastes both latency budget and thermal headroom.
2. Monitor prefill and decode phases independently in production telemetry (specifically tracking create_ms, first_chunk_ms / TTFT, inter-token max_gap_ms, and total streaming_ms), as high end-to-end latency in document summarization workloads is almost always dominated by linear O(N) prefill compute or CPU fallback rather than output token generation.
3. Enforce domain-specific input compaction (such as log deduplication and structural pruning) before passing text to on-device language models so that context windows are reserved for high-entropy information.
4. Validate GPU/NPU backend binding at runtime startup and surface hardware execution tier metrics to operators, as silent fallback to CPU execution can increase large-context prefill latency by 2.5x to 3.5x on consumer and industrial hardware alike.`;

export const LARGE_TECHNICAL_DOCUMENT_MAX_CONTEXT =
  LARGE_TECHNICAL_DOCUMENT_10K + LARGE_TECHNICAL_DOCUMENT_EXTENSION_SECTIONS;

/**
 * Dynamically builds a plain-English technical document that fills approximately
 * `targetRatio` (default 85%) of the given session or summarizer's `inputQuota`
 * without overflowing or throwing a QuotaExceededError.
 *
 * Falls back cleanly to a ~14,500-character document if `inputQuota` or
 * `measureInputUsage` / `measureContextUsage` is unavailable.
 */
export async function fitDocumentToInputQuota(
  instance: any,
  targetRatio = 0.85
): Promise<{ text: string; measuredTokens: number; inputQuota?: number }> {
  const basePool =
    LARGE_TECHNICAL_DOCUMENT_MAX_CONTEXT +
    '\n\n' +
    LARGE_TECHNICAL_DOCUMENT_MAX_CONTEXT;

  const quota: number | undefined =
    typeof instance?.inputQuota === 'number' &&
    Number.isFinite(instance.inputQuota) &&
    instance.inputQuota > 0
      ? instance.inputQuota
      : undefined;

  const measureFn =
    typeof instance?.measureInputUsage === 'function'
      ? (txt: string) => instance.measureInputUsage(txt)
      : typeof instance?.measureContextUsage === 'function'
      ? (txt: string) => instance.measureContextUsage(txt)
      : null;

  if (!quota || !measureFn) {
    const fallbackText = LARGE_TECHNICAL_DOCUMENT_MAX_CONTEXT.slice(0, 14500);
    return {
      text: fallbackText,
      measuredTokens: Math.round(fallbackText.length / 4),
      inputQuota: quota,
    };
  }

  try {
    // 1. Measure the 10k base document once to get the exact chars-per-token ratio
    const sampleText = LARGE_TECHNICAL_DOCUMENT_10K;
    const sampleTokens = Number(await measureFn(sampleText));
    if (!Number.isFinite(sampleTokens) || sampleTokens <= 0) {
      const fallbackText = LARGE_TECHNICAL_DOCUMENT_MAX_CONTEXT.slice(0, 14500);
      return {
        text: fallbackText,
        measuredTokens: Math.round(fallbackText.length / 4),
        inputQuota: quota,
      };
    }

    const charsPerToken = sampleText.length / sampleTokens;
    // Cap target tokens at 6,500 tokens (~26k chars) so tests fill large context windows
    // without taking several minutes per iteration on CPU/slower devices, while still
    // respecting smaller quotas (e.g. 4,096 or 6,144 tokens).
    const maxPracticalTokens = Math.min(Math.floor(quota * targetRatio), 6500);
    let targetChars = Math.min(
      Math.max(Math.floor(maxPracticalTokens * charsPerToken), sampleText.length),
      basePool.length
    );

    // Snap to a clean sentence or paragraph boundary
    let candidate = snapToCleanBoundary(basePool, targetChars);
    let measured = Number(await measureFn(candidate));

    // If we exceeded 92% of quota, trim proportionally once
    const safeCeiling = Math.floor(quota * 0.92);
    if (Number.isFinite(measured) && measured > safeCeiling) {
      const scale = (quota * targetRatio) / measured;
      targetChars = Math.max(2000, Math.floor(candidate.length * scale));
      candidate = snapToCleanBoundary(basePool, targetChars);
      measured = Number(await measureFn(candidate));
    }

    return {
      text: candidate,
      measuredTokens: Number.isFinite(measured) ? measured : sampleTokens,
      inputQuota: quota,
    };
  } catch {
    const fallbackText = LARGE_TECHNICAL_DOCUMENT_10K;
    return {
      text: fallbackText,
      measuredTokens: Math.round(fallbackText.length / 4),
      inputQuota: quota,
    };
  }
}

function snapToCleanBoundary(source: string, maxChars: number): string {
  if (maxChars >= source.length) {
    return source;
  }
  const slice = source.slice(0, maxChars);
  const lastParagraph = slice.lastIndexOf('\n\n');
  if (lastParagraph > maxChars * 0.85) {
    return slice.slice(0, lastParagraph).trim();
  }
  const lastPeriod = slice.lastIndexOf('. ');
  if (lastPeriod > maxChars * 0.85) {
    return slice.slice(0, lastPeriod + 1).trim();
  }
  return slice.trim();
}
