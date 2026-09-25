/**
 * Temperature calibration as shipped in `rl_agent_config.json` (English)
 * or `calibration.json` (multilingual).
 */
export interface LayaCalibration {
  /** Fallback temperature per question type, indexed choice/score/noul. */
  temperature: number[];
  /** Temperature per `<type>:<bucket>` key, e.g. `choice:3-5`. Looked up first. */
  temperature_by_options?: Record<string, number>;
}
