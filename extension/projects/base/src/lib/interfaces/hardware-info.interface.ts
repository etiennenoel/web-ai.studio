export interface HardwareInformation {
  webgl_renderer: string;
  webgpu: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  } | null;
  navigator: {
    hardwareConcurrency: number;
    deviceMemory: number | string;
    userAgent: string;
  };
  cpu: {
    archName: string;
    features: string[];
    modelName: string;
    numOfProcessors: number;
    processors: {
      usage: {
        idle: number;
        kernel: number;
        total: number;
        user: number;
      };
    }[];
    temperatures?: number[];
  } | null;
  memory: {
    availableCapacity: number;
    capacity: number;
  } | null;
}
