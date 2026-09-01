/**
 * How a machine gets its memory bandwidth. Devices can be grouped by segment in the
 * matrix because the bandwidth budget of a graphics card and of a laptop chip are two
 * different conversations.
 */
export enum HardwareSegmentEnum {
  DiscreteGpu = 'discrete-gpu',
  AppleSoc = 'apple-soc',
  CpuIntegrated = 'cpu-integrated',
  Edge = 'edge',
}
